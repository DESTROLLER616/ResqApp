use std::path::PathBuf;

use tauri::AppHandle;

use crate::domain::request::RequestDraft;
use crate::domain::workspace::{OpenedProject, RecentProject};
use crate::error::AppError;
use crate::services::{request_fs, workspace_store};

fn map_err(err: AppError) -> String {
    err.to_string()
}

#[tauri::command]
pub fn list_recent_projects(app: AppHandle) -> Result<Vec<RecentProject>, String> {
    workspace_store::load(&app)
        .map(|config| config.recent_projects)
        .map_err(map_err)
}

#[tauri::command]
pub fn remove_recent_project(app: AppHandle, path: String) -> Result<Vec<RecentProject>, String> {
    workspace_store::remove_recent(&app, &path).map_err(map_err)
}

#[tauri::command]
pub fn open_project(app: AppHandle, path: String) -> Result<OpenedProject, String> {
    let project = request_fs::open_project(PathBuf::from(&path).as_path()).map_err(map_err)?;
    workspace_store::touch_recent(
        &app,
        PathBuf::from(&project.root_path).as_path(),
        &project.name,
    )
    .map_err(map_err)?;
    Ok(project)
}

#[tauri::command]
pub fn create_project(
    app: AppHandle,
    parent_dir: String,
    name: String,
) -> Result<OpenedProject, String> {
    let project =
        request_fs::create_project(PathBuf::from(parent_dir).as_path(), &name).map_err(map_err)?;
    workspace_store::touch_recent(
        &app,
        PathBuf::from(&project.root_path).as_path(),
        &project.name,
    )
    .map_err(map_err)?;
    Ok(project)
}

#[tauri::command]
pub fn init_project(
    app: AppHandle,
    path: String,
    name: Option<String>,
) -> Result<OpenedProject, String> {
    let project =
        request_fs::init_project(PathBuf::from(path).as_path(), name).map_err(map_err)?;
    workspace_store::touch_recent(
        &app,
        PathBuf::from(&project.root_path).as_path(),
        &project.name,
    )
    .map_err(map_err)?;
    Ok(project)
}

#[tauri::command]
pub fn refresh_project(path: String) -> Result<OpenedProject, String> {
    request_fs::refresh_project(PathBuf::from(path).as_path()).map_err(map_err)
}

#[tauri::command]
pub fn write_project_documentation(
    project_root: String,
    documentation: String,
) -> Result<(), String> {
    request_fs::write_project_documentation(
        PathBuf::from(project_root).as_path(),
        &documentation,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn create_folder(
    project_root: String,
    parent_relative: String,
    name: String,
) -> Result<OpenedProject, String> {
    request_fs::create_folder(
        PathBuf::from(project_root).as_path(),
        &parent_relative,
        &name,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn create_request(
    project_root: String,
    parent_relative: String,
    name: String,
    draft: Option<RequestDraft>,
) -> Result<OpenedProject, String> {
    request_fs::create_request(
        PathBuf::from(project_root).as_path(),
        &parent_relative,
        &name,
        draft,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn read_request(
    project_root: String,
    relative_path: String,
) -> Result<RequestDraft, String> {
    request_fs::read_request(
        PathBuf::from(project_root).as_path(),
        &relative_path,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn write_request(
    project_root: String,
    relative_path: String,
    draft: RequestDraft,
) -> Result<(), String> {
    request_fs::write_request(
        PathBuf::from(project_root).as_path(),
        &relative_path,
        &draft,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn rename_entry(
    project_root: String,
    relative_path: String,
    new_name: String,
) -> Result<OpenedProject, String> {
    request_fs::rename_entry(
        PathBuf::from(project_root).as_path(),
        &relative_path,
        &new_name,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn delete_entry(
    project_root: String,
    relative_path: String,
) -> Result<OpenedProject, String> {
    request_fs::delete_entry(
        PathBuf::from(project_root).as_path(),
        &relative_path,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn move_entry(
    project_root: String,
    from_relative: String,
    to_parent_relative: String,
) -> Result<OpenedProject, String> {
    request_fs::move_entry(
        PathBuf::from(project_root).as_path(),
        &from_relative,
        &to_parent_relative,
    )
    .map_err(map_err)
}
