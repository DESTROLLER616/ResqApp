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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestBody {
    pub data: String,
    pub language: HttpLanguageBody,
}

impl Default for RequestBody {
    fn default() -> Self {
        Self { 
            data: (String::new()), 
            language: (HttpLanguageBody::Json)
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
            body: RequestBody { 
                data: (String::new()),
                language: (HttpLanguageBody::Json)
            },
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
