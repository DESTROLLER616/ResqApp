use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::environment::{EnvironmentsFile, ENVIRONMENTS_FILE};
use crate::error::Result;
use crate::services::path_util::canonicalize_existing;
use crate::services::request_fs::read_project_meta;

pub fn environments_path(root: &Path) -> PathBuf {
    root.join(ENVIRONMENTS_FILE)
}

pub fn read_environments(project_root: &Path) -> Result<EnvironmentsFile> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;
    let path = environments_path(&root);
    if !path.exists() {
        return Ok(EnvironmentsFile::default());
    }
    let raw = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn write_environments(project_root: &Path, file: &EnvironmentsFile) -> Result<()> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;
    let stored = file.without_secret_values();
    let raw = serde_json::to_string_pretty(&stored)?;
    fs::write(environments_path(&root), raw)?;
    Ok(())
}
