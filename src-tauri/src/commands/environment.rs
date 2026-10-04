use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::domain::environment::EnvironmentsFile;
use crate::error::AppError;
use crate::services::environment_fs;

const VAULT_FILE: &str = "secrets.hold";

fn map_err(err: AppError) -> String {
    err.to_string()
}

fn vault_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| AppError::message(format!("app data dir unavailable: {err}")))?;
    Ok(dir.join(VAULT_FILE))
}

#[tauri::command]
pub fn read_environments(project_root: String) -> Result<EnvironmentsFile, String> {
    environment_fs::read_environments(PathBuf::from(project_root).as_path()).map_err(map_err)
}

#[tauri::command]
pub fn write_environments(project_root: String, file: EnvironmentsFile) -> Result<(), String> {
    environment_fs::write_environments(PathBuf::from(project_root).as_path(), &file)
        .map_err(map_err)
}

#[tauri::command]
pub fn secret_vault_path(app: AppHandle) -> Result<String, String> {
    vault_path(&app)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(map_err)
}

#[tauri::command]
pub fn secret_vault_exists(app: AppHandle) -> Result<bool, String> {
    vault_path(&app).map(|path| path.exists()).map_err(map_err)
}
