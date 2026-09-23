use std::fs;
use std::path::Path;

use crate::domain::request::{HttpMethod, ProjectNode, RequestDraft};
use crate::domain::workspace::PROJECT_MARKER_FILE;
use crate::error::{AppError, Result};
use crate::services::attachments::ATTACHMENTS_DIR;

fn read_request_method(path: &Path) -> HttpMethod {
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str::<RequestDraft>(&raw)
            .map(|draft| draft.method)
            .unwrap_or_default(),
        Err(_) => HttpMethod::default(),
    }
}

fn scan_dir(dir: &Path, relative: &str) -> Result<Vec<ProjectNode>> {
    let mut entries = fs::read_dir(dir)?
        .filter_map(|entry| entry.ok())
        .collect::<Vec<_>>();

    entries.sort_by_key(|entry| {
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let name = entry.file_name().to_string_lossy().to_lowercase();
        (!is_dir, name)
    });

    let mut nodes = Vec::new();

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        if relative.is_empty() && name == ATTACHMENTS_DIR {
            continue;
        }

        let path = entry.path();
        let child_relative = if relative.is_empty() {
            name.clone()
        } else {
            format!("{relative}/{name}")
        };

        if path.is_dir() {
            let children = scan_dir(&path, &child_relative)?;
            nodes.push(ProjectNode::Folder {
                name,
                relative_path: child_relative,
                children,
            });
            continue;
        }

        if name == PROJECT_MARKER_FILE {
            continue;
        }

        if path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("json"))
        {
            let display_name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or(name);
            let method = read_request_method(&path);
            nodes.push(ProjectNode::Request {
                name: display_name,
                relative_path: child_relative,
                method,
            });
        }
    }

    Ok(nodes)
}

pub fn scan_project_tree(root: &Path) -> Result<Vec<ProjectNode>> {
    if !root.is_dir() {
        return Err(AppError::message(format!(
            "project root is not a directory: {}",
            root.display()
        )));
    }
    scan_dir(root, "")
}
