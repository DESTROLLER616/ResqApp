use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpLanguageBody {
    Html,
    Json,
    Xml,
    Text,
}

impl Default for HttpMethod {
    fn default() -> Self {
        Self::Get
    }
}

impl HttpLanguageBody {
    pub fn content_type(&self) -> &'static str {
        match self {
            Self::Html => "text/html",
            Self::Json => "application/json",
            Self::Xml => "application/xml",
            Self::Text => "text/plain",
        }
    }
}

impl Default for HttpLanguageBody {
    fn default() -> Self {
        Self::Json
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum BodyMode {
    Raw,
    FormData,
}

impl Default for BodyMode {
    fn default() -> Self {
        Self::Raw
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FormFieldKind {
    Text,
    File,
}

impl Default for FormFieldKind {
    fn default() -> Self {
        Self::Text
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FormFileSource {
    Project,
    Disk,
}

impl Default for FormFileSource {
    fn default() -> Self {
        Self::Disk
    }
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormField {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub value: String,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default)]
    pub kind: FormFieldKind,
    #[serde(default)]
    pub source: FormFileSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestBody {
    #[serde(default)]
    pub mode: BodyMode,
    #[serde(default)]
    pub data: String,
    #[serde(default)]
    pub language: HttpLanguageBody,
    #[serde(default)]
    pub fields: Vec<FormField>,
}

impl Default for RequestBody {
    fn default() -> Self {
        Self {
            mode: BodyMode::Raw,
            data: String::new(),
            language: HttpLanguageBody::Json,
            fields: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpHeader {
    pub id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpParam {
    pub id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestDraft {
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    #[serde(default)]
    pub params: Vec<HttpParam>,
    #[serde(default)]
    pub headers: Vec<HttpHeader>,
    #[serde(default)]
    pub body: RequestBody,
    #[serde(default)]
    pub documentation: String,
}

impl RequestDraft {
    pub fn new_empty(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            method: HttpMethod::Get,
            url: String::new(),
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBody::default(),
            documentation: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ProjectNode {
    #[serde(rename_all = "camelCase")]
    Folder {
        name: String,
        relative_path: String,
        children: Vec<ProjectNode>,
    },
    #[serde(rename_all = "camelCase")]
    Request {
        name: String,
        relative_path: String,
        method: HttpMethod,
    },
}

#[cfg(test)]
mod tests {
    use super::{BodyMode, HttpLanguageBody, RequestBody};

    #[test]
    fn legacy_body_defaults_to_raw_text() {
        let body: RequestBody =
            serde_json::from_str(r#"{"data":"{\"ok\":true}","language":"JSON"}"#).unwrap();

        assert_eq!(body.mode, BodyMode::Raw);
        assert_eq!(body.language, HttpLanguageBody::Json);
        assert_eq!(body.data, "{\"ok\":true}");
        assert!(body.fields.is_empty());
    }
}
