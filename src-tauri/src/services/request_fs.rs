use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::request::RequestDraft;
use crate::domain::workspace::OpenedProject;
use crate::domain::workspace::{ProjectMeta, PROJECT_MARKER_FILE};
use crate::error::{AppError, Result};
use crate::services::fs_scan::scan_project_tree;
use crate::services::path_util::{
    canonicalize_existing, ensure_within_root, join_relative, resolve_relative, sanitize_entry_name,
};

pub fn marker_path(root: &Path) -> PathBuf {
    root.join(PROJECT_MARKER_FILE)
}

pub fn read_project_meta(root: &Path) -> Result<ProjectMeta> {
    let path = marker_path(root);
    if !path.exists() {
        return Err(AppError::message(format!(
            "not a project (missing {PROJECT_MARKER_FILE}): {}",
            root.display()
        )));
    }
    let raw = fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn write_project_meta(root: &Path, meta: &ProjectMeta) -> Result<()> {
    let path = marker_path(root);
    let raw = serde_json::to_string_pretty(meta)?;
    fs::write(path, raw)?;
    Ok(())
}

pub fn create_project(parent_dir: &Path, name: &str) -> Result<OpenedProject> {
    let name = sanitize_entry_name(name)?;
    let parent = canonicalize_existing(parent_dir)?;
    if !parent.is_dir() {
        return Err(AppError::message("parent path must be a directory"));
    }

    let root = parent.join(&name);
    if root.exists() {
        return Err(AppError::message(format!(
            "directory already exists: {}",
            root.display()
        )));
    }

    fs::create_dir_all(&root)?;
    let meta = ProjectMeta::new(&name);
    write_project_meta(&root, &meta)?;

    let root = canonicalize_existing(&root)?;
    Ok(OpenedProject {
        root_path: root.to_string_lossy().to_string(),
        name: meta.name,
        documentation: meta.documentation,
        tree: scan_project_tree(&root)?,
    })
}

pub fn open_project(path: &Path) -> Result<OpenedProject> {
    let root = canonicalize_existing(path)?;
    if !root.is_dir() {
        return Err(AppError::message("project path must be a directory"));
    }
    let meta = read_project_meta(&root)?;
    Ok(OpenedProject {
        root_path: root.to_string_lossy().to_string(),
        name: meta.name,
        documentation: meta.documentation,
        tree: scan_project_tree(&root)?,
    })
}

pub fn write_project_documentation(project_root: &Path, documentation: &str) -> Result<()> {
    let root = canonicalize_existing(project_root)?;
    let mut meta = read_project_meta(&root)?;
    meta.documentation = documentation.to_string();
    write_project_meta(&root, &meta)
}

pub fn init_project(path: &Path, name: Option<String>) -> Result<OpenedProject> {
    let root = canonicalize_existing(path)?;
    if !root.is_dir() {
        return Err(AppError::message("project path must be a directory"));
    }

    let marker = marker_path(&root);
    if marker.exists() {
        return open_project(&root);
    }

    let project_name = match name {
        Some(value) => sanitize_entry_name(&value)?,
        None => root
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Project".to_string()),
    };

    let meta = ProjectMeta::new(project_name);
    write_project_meta(&root, &meta)?;
    open_project(&root)
}

pub fn create_folder(
    project_root: &Path,
    parent_relative: &str,
    name: &str,
) -> Result<OpenedProject> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;
    let name = sanitize_entry_name(name)?;
    let relative = join_relative(parent_relative, &name);
    let path = resolve_relative(&root, &relative)?;

    if path.exists() {
        return Err(AppError::message(format!(
            "folder already exists: {relative}"
        )));
    }

    fs::create_dir_all(&path)?;
    ensure_within_root(&root, &path)?;
    open_project(&root)
}

fn ensure_json_relative(relative: &str) -> Result<String> {
    let trimmed = relative.trim_matches(['/', '\\']);
    if trimmed.is_empty() {
        return Err(AppError::message("request path cannot be empty"));
    }
    if trimmed
        .split(['/', '\\'])
        .any(|part| part.is_empty() || part == "." || part == "..")
    {
        return Err(AppError::InvalidPath(format!(
            "invalid relative path: {relative}"
        )));
    }

    if trimmed.to_lowercase().ends_with(".json") {
        Ok(trimmed.to_string())
    } else {
        Ok(format!("{trimmed}.json"))
    }
}

pub fn create_request(
    project_root: &Path,
    parent_relative: &str,
    name: &str,
    draft: Option<RequestDraft>,
) -> Result<OpenedProject> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;
    let name = sanitize_entry_name(name)?;
    let stem = name
        .strip_suffix(".json")
        .or_else(|| name.strip_suffix(".JSON"))
        .unwrap_or(&name);
    let file_name = format!("{stem}.json");
    let relative = join_relative(parent_relative, &file_name);
    let path = resolve_relative(&root, &relative)?;

    if path.exists() {
        return Err(AppError::message(format!(
            "request already exists: {relative}"
        )));
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let draft = draft.unwrap_or_else(|| RequestDraft::new_empty(stem));
    let raw = serde_json::to_string_pretty(&draft)?;
    fs::write(&path, raw)?;
    ensure_within_root(&root, &path)?;
    open_project(&root)
}

pub fn read_request(project_root: &Path, relative_path: &str) -> Result<RequestDraft> {
    let root = canonicalize_existing(project_root)?;
    let relative = ensure_json_relative(relative_path)?;
    let path = resolve_relative(&root, &relative)?;
    if !path.is_file() {
        return Err(AppError::message(format!(
            "request file not found: {relative}"
        )));
    }
    let raw = fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn write_request(project_root: &Path, relative_path: &str, draft: &RequestDraft) -> Result<()> {
    let root = canonicalize_existing(project_root)?;
    let relative = ensure_json_relative(relative_path)?;
    let path = resolve_relative(&root, &relative)?;
    if !path.is_file() {
        return Err(AppError::message(format!(
            "request file not found: {relative}"
        )));
    }
    let raw = serde_json::to_string_pretty(draft)?;
    fs::write(path, raw)?;
    Ok(())
}

pub fn rename_entry(
    project_root: &Path,
    relative_path: &str,
    new_name: &str,
) -> Result<OpenedProject> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;

    let from = relative_path.trim_matches(['/', '\\']);
    if from.is_empty() {
        return Err(AppError::message("cannot rename project root"));
    }
    if from == PROJECT_MARKER_FILE {
        return Err(AppError::message("cannot rename project marker file"));
    }

    let from_path = resolve_relative(&root, from)?;
    if !from_path.exists() {
        return Err(AppError::message(format!("entry not found: {from}")));
    }

    let new_name = sanitize_entry_name(new_name)?;
    let file_name = if from_path.is_file() {
        let stem = new_name
            .strip_suffix(".json")
            .or_else(|| new_name.strip_suffix(".JSON"))
            .unwrap_or(&new_name);
        format!("{stem}.json")
    } else {
        new_name
    };

    let parent_relative = match from.rfind(['/', '\\']) {
        Some(index) => from[..index].to_string(),
        None => String::new(),
    };
    let dest_relative = join_relative(&parent_relative, &file_name);
    if dest_relative == from {
        return open_project(&root);
    }

    let dest_path = resolve_relative(&root, &dest_relative)?;
    if dest_path.exists() {
        return Err(AppError::message(format!(
            "destination already exists: {dest_relative}"
        )));
    }

    fs::rename(&from_path, &dest_path)?;

    // Keep RequestDraft.name in sync for request files.
    if dest_path.is_file()
        && dest_path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("json"))
    {
        let stem = dest_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        if let Ok(raw) = fs::read_to_string(&dest_path) {
            if let Ok(mut draft) = serde_json::from_str::<RequestDraft>(&raw) {
                draft.name = stem;
                let raw = serde_json::to_string_pretty(&draft)?;
                fs::write(&dest_path, raw)?;
            }
        }
    }

    open_project(&root)
}

pub fn delete_entry(project_root: &Path, relative_path: &str) -> Result<OpenedProject> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;
    let relative = relative_path.trim_matches(['/', '\\']);
    if relative.is_empty() {
        return Err(AppError::message("cannot delete project root"));
    }
    if relative == PROJECT_MARKER_FILE {
        return Err(AppError::message("cannot delete project marker file"));
    }

    let path = resolve_relative(&root, relative)?;
    if !path.exists() {
        return Err(AppError::message(format!("entry not found: {relative}")));
    }

    if path.is_dir() {
        fs::remove_dir_all(&path)?;
    } else {
        fs::remove_file(&path)?;
    }

    open_project(&root)
}

pub fn move_entry(
    project_root: &Path,
    from_relative: &str,
    to_parent_relative: &str,
) -> Result<OpenedProject> {
    let root = canonicalize_existing(project_root)?;
    let _ = read_project_meta(&root)?;

    let from = from_relative.trim_matches(['/', '\\']);
    if from.is_empty() {
        return Err(AppError::message("cannot move project root"));
    }
    if from == PROJECT_MARKER_FILE {
        return Err(AppError::message("cannot move project marker file"));
    }

    let from_path = resolve_relative(&root, from)?;
    if !from_path.exists() {
        return Err(AppError::message(format!("entry not found: {from}")));
    }

    let file_name = from_path
        .file_name()
        .ok_or_else(|| AppError::message("invalid source path"))?
        .to_string_lossy()
        .to_string();

    let to_parent = to_parent_relative.trim_matches(['/', '\\']);
    let dest_parent_path = if to_parent.is_empty() {
        root.clone()
    } else {
        let parent_path = resolve_relative(&root, to_parent)?;
        if !parent_path.is_dir() {
            return Err(AppError::message(format!(
                "destination folder not found: {to_parent}"
            )));
        }
        parent_path
    };

    if from_path.is_dir() {
        let from_canon = canonicalize_existing(&from_path)?;
        let dest_parent_canon = canonicalize_existing(&dest_parent_path)?;
        if &dest_parent_canon == &from_canon || dest_parent_canon.strip_prefix(&from_canon).is_ok()
        {
            return Err(AppError::message(
                "cannot move a folder into itself or a descendant",
            ));
        }
    }

    let dest_relative = join_relative(to_parent, &file_name);
    if dest_relative == from {
        return open_project(&root);
    }

    let dest_path = dest_parent_path.join(&file_name);
    ensure_within_root(&root, &dest_path)?;
    if dest_path.exists() {
        return Err(AppError::message(format!(
            "destination already exists: {dest_relative}"
        )));
    }

    fs::rename(&from_path, &dest_path)?;
    open_project(&root)
}

pub fn refresh_project(project_root: &Path) -> Result<OpenedProject> {
    open_project(project_root)
}
