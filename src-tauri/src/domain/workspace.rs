use serde::{Deserialize, Serialize};

pub const PROJECT_MARKER_FILE: &str = "http-client.project.json";
pub const WORKSPACE_FILE: &str = "workspace.json";
pub const MAX_RECENT_PROJECTS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub name: String,
    pub version: u32,
    #[serde(default)]
    pub documentation: String,
}

impl ProjectMeta {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            version: 1,
            documentation: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceConfig {
    pub recent_projects: Vec<RecentProject>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedProject {
    pub root_path: String,
    pub name: String,
    #[serde(default)]
    pub documentation: String,
    pub tree: Vec<crate::domain::request::ProjectNode>,
}
