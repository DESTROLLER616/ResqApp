use std::str::FromStr;
use std::time::Instant;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Method, Url};

use crate::domain::http::HttpResponse;
use crate::domain::request::{HttpMethod, RequestDraft};
use crate::error::{AppError, Result};

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

        let name = HeaderName::from_bytes(header.key.as_bytes())
            .map_err(|err| AppError::message(format!("invalid header name '{}': {err}", header.key)))?;
        let value = HeaderValue::from_str(&header.value).map_err(|err| {
            AppError::message(format!("invalid header value for '{}': {err}", header.key))
        })?;
        headers.append(name, value);
    }

    if !headers.contains_key("Content-Type") {
        let value = HeaderValue::from_str(&draft.body.language.to_string()).map_err(|e| {
            AppError::message(format!("invalid header value for '{}': {e}", "Content-Type"))
        })?;

        headers.append("Content-Type", value);
    }

    Ok(headers)
}

pub async fn send_request(draft: &RequestDraft) -> Result<HttpResponse> {
    let client = reqwest::Client::new();
    let url = build_url(draft)?;
    let headers = build_headers(draft)?;
    let method = to_method(&draft.method);

    let mut request = client.request(method.clone(), url).headers(headers);
    if method != Method::GET && method != Method::HEAD {
        request = request.body(draft.body.data.clone());
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
