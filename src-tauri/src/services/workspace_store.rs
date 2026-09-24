use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::domain::workspace::{
    RecentProject, WorkspaceConfig, MAX_RECENT_PROJECTS, WORKSPACE_FILE,
};
use crate::error::{AppError, Result};

fn workspace_path(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::message(format!("app data dir unavailable: {e}")))?;
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir.join(WORKSPACE_FILE))
}

pub fn load(app: &AppHandle) -> Result<WorkspaceConfig> {
    let path = workspace_path(app)?;
    if !path.exists() {
        return Ok(WorkspaceConfig::default());
    }
    let raw = fs::read_to_string(&path)?;
    let config = serde_json::from_str(&raw)?;
    Ok(config)
}

pub fn save(app: &AppHandle, config: &WorkspaceConfig) -> Result<()> {
    let path = workspace_path(app)?;
    let raw = serde_json::to_string_pretty(config)?;
    fs::write(path, raw)?;
    Ok(())
}

pub fn touch_recent(app: &AppHandle, path: &Path, name: &str) -> Result<Vec<RecentProject>> {
    let mut config = load(app)?;
    let opened_at = chrono::Utc::now().to_rfc3339();
    let path_str = path.to_string_lossy().to_string();

    config.recent_projects.retain(|item| item.path != path_str);

    config.recent_projects.insert(
        0,
        RecentProject {
            path: path_str,
            name: name.to_string(),
            opened_at,
        },
    );

    if config.recent_projects.len() > MAX_RECENT_PROJECTS {
        config.recent_projects.truncate(MAX_RECENT_PROJECTS);
    }

    save(app, &config)?;
    Ok(config.recent_projects)
}

pub fn remove_recent(app: &AppHandle, path: &str) -> Result<Vec<RecentProject>> {
    let mut config = load(app)?;
    config.recent_projects.retain(|item| item.path != path);
    save(app, &config)?;
    Ok(config.recent_projects)
}
