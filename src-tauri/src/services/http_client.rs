use std::path::{Path, PathBuf};
use std::time::Instant;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE};
use reqwest::multipart::{Form, Part};
use reqwest::{Method, Url};

use crate::domain::http::HttpResponse;
use crate::domain::request::{
    BodyMode, FormField, FormFieldKind, FormFileSource, HttpMethod, RequestDraft,
};
use crate::error::{AppError, Result};
use crate::services::attachments;

fn to_method(method: &HttpMethod) -> Method {
    match method {
        HttpMethod::Get => Method::GET,
        HttpMethod::Post => Method::POST,
        HttpMethod::Put => Method::PUT,
        HttpMethod::Patch => Method::PATCH,
        HttpMethod::Delete => Method::DELETE,
        HttpMethod::Head => Method::HEAD,
        HttpMethod::Options => Method::OPTIONS,
    }
}

fn method_sends_body(method: &HttpMethod) -> bool {
    !matches!(method, HttpMethod::Get | HttpMethod::Head)
}

fn build_url(draft: &RequestDraft) -> Result<Url> {
    let mut url = Url::parse(&draft.url)
        .map_err(|err| AppError::message(format!("invalid request url: {err}")))?;
    {
        let mut query = url.query_pairs_mut();
        query.clear();
        for param in &draft.params {
            if param.enabled && !param.key.is_empty() {
                query.append_pair(&param.key, &param.value);
            }
        }
    }
    Ok(url)
}

fn build_headers(draft: &RequestDraft) -> Result<HeaderMap> {
    let mut headers = HeaderMap::new();

    for header in &draft.headers {
        if !header.enabled || header.key.is_empty() {
            continue;
        }

        let name = HeaderName::from_bytes(header.key.as_bytes()).map_err(|err| {
            AppError::message(format!("invalid header name '{}': {err}", header.key))
        })?;
        let value = HeaderValue::from_str(&header.value).map_err(|err| {
            AppError::message(format!("invalid header value for '{}': {err}", header.key))
        })?;
        headers.append(name, value);
    }

    let sends_form = method_sends_body(&draft.method) && draft.body.mode == BodyMode::FormData;
    if sends_form {
        headers.remove(CONTENT_TYPE);
        return Ok(headers);
    }

    if method_sends_body(&draft.method) && !headers.contains_key(CONTENT_TYPE) {
        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_static(draft.body.language.content_type()),
        );
    }

    Ok(headers)
}

fn resolve_file_field(project_root: &Path, field: &FormField) -> Result<PathBuf> {
    if field.value.trim().is_empty() {
        return Err(AppError::message(format!(
            "file field '{}' has no path",
            field.key
        )));
    }

    match field.source {
        FormFileSource::Project => {
            attachments::resolve_project_attachment(project_root, &field.value)
        }
        FormFileSource::Disk => {
            let path = PathBuf::from(&field.value);
            if !path.is_file() {
                return Err(AppError::message(format!(
                    "file not found: {}",
                    field.value
                )));
            }
            Ok(path)
        }
    }
}

fn part_file_name(field: &FormField, path: &Path) -> String {
    let stored = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("file");
    if field.source == FormFileSource::Project {
        let prefix = format!("{}-", field.id);
        if let Some(original) = stored.strip_prefix(&prefix) {
            if !original.is_empty() {
                return original.to_string();
            }
        }
    }
    stored.to_string()
}

async fn build_form(fields: &[FormField], project_root: &Path) -> Result<Form> {
    let mut form = Form::new();
    for field in fields {
        if !field.enabled || field.key.is_empty() {
            continue;
        }

        match field.kind {
            FormFieldKind::Text => {
                form = form.text(field.key.clone(), field.value.clone());
            }
            FormFieldKind::File => {
                let path = resolve_file_field(project_root, field)?;
                let bytes = tokio::fs::read(&path).await?;
                let filename = part_file_name(field, &path);
                let mime = mime_guess::from_path(&path).first_or_octet_stream();
                let part = Part::bytes(bytes)
                    .file_name(filename)
                    .mime_str(mime.as_ref())?;
                form = form.part(field.key.clone(), part);
            }
        }
    }
    Ok(form)
}

pub async fn send_request(draft: &RequestDraft, project_root: &Path) -> Result<HttpResponse> {
    let client = reqwest::Client::new();
    let url = build_url(draft)?;
    let headers = build_headers(draft)?;
    let method = to_method(&draft.method);

    let mut request = client.request(method.clone(), url).headers(headers);
    if method_sends_body(&draft.method) {
        match draft.body.mode {
            BodyMode::Raw => {
                request = request.body(draft.body.data.clone());
            }
            BodyMode::FormData => {
                let form = build_form(&draft.body.fields, project_root).await?;
                request = request.multipart(form);
            }
        }
    }

    let start = Instant::now();
    let response = request.send().await?;
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_owned();

    let mut headers = std::collections::HashMap::new();
    for (name, value) in response.headers() {
        let value_text = value.to_str().unwrap_or_default().to_owned();
        headers
            .entry(name.to_string())
            .and_modify(|current: &mut String| {
                if !current.is_empty() {
                    current.push_str(", ");
                }
                current.push_str(&value_text);
            })
            .or_insert(value_text);
    }

    let body = response.text().await?;

    Ok(HttpResponse {
        status: status.as_u16(),
        status_text,
        headers,
        body,
        elapsed_ms: start.elapsed().as_millis() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::build_headers;
    use crate::domain::request::{BodyMode, HttpHeader, HttpMethod, RequestDraft};
    use reqwest::header::CONTENT_TYPE;

    fn draft(mode: BodyMode) -> RequestDraft {
        let mut draft = RequestDraft::new_empty("sample");
        draft.method = HttpMethod::Post;
        draft.body.mode = mode;
        draft.headers.push(HttpHeader {
            id: "1".to_string(),
            key: "Content-Type".to_string(),
            value: "application/custom".to_string(),
            enabled: true,
        });
        draft
    }

    #[test]
    fn raw_body_keeps_a_user_content_type() {
        let headers = build_headers(&draft(BodyMode::Raw)).unwrap();
        let value = headers.get(CONTENT_TYPE).unwrap();
        assert_eq!(value, "application/custom");
    }

    #[test]
    fn form_data_drops_content_type_so_the_boundary_can_be_set() {
        let headers = build_headers(&draft(BodyMode::FormData)).unwrap();
        assert!(headers.get(CONTENT_TYPE).is_none());
    }

    #[test]
    fn raw_body_sets_language_content_type_when_missing() {
        let mut draft = RequestDraft::new_empty("sample");
        draft.method = HttpMethod::Post;
        let headers = build_headers(&draft).unwrap();
        let value = headers.get(CONTENT_TYPE).unwrap();
        assert_eq!(value, "application/json");
    }
}
