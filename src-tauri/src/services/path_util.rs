use std::path::{Component, Path, PathBuf};

use crate::error::{AppError, Result};

pub fn canonicalize_existing(path: &Path) -> Result<PathBuf> {
    path.canonicalize()
        .map_err(|e| AppError::InvalidPath(format!("{}: {e}", path.display())))
}

pub fn ensure_within_root(root: &Path, candidate: &Path) -> Result<PathBuf> {
    let root_canon = canonicalize_existing(root)?;
    let candidate_canon = if candidate.exists() {
        canonicalize_existing(candidate)?
    } else {
        let parent = candidate.parent().ok_or_else(|| {
            AppError::InvalidPath(format!("missing parent for {}", candidate.display()))
        })?;
        let parent_canon = canonicalize_existing(parent)?;
        let file_name = candidate.file_name().ok_or_else(|| {
            AppError::InvalidPath(format!("missing file name for {}", candidate.display()))
        })?;
        parent_canon.join(file_name)
    };

    if !candidate_canon.starts_with(&root_canon) {
        return Err(AppError::InvalidPath(format!(
            "{} is outside project root {}",
            candidate_canon.display(),
            root_canon.display()
        )));
    }

    Ok(candidate_canon)
}

pub fn resolve_relative(root: &Path, relative: &str) -> Result<PathBuf> {
    let relative = relative.trim_start_matches(['/', '\\']);
    if relative.is_empty() {
        return Ok(canonicalize_existing(root)?);
    }

    if Path::new(relative)
        .components()
        .any(|c| matches!(c, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
    {
        return Err(AppError::InvalidPath(format!(
            "relative path must not contain '..' or absolute segments: {relative}"
        )));
    }

    let joined = root.join(relative);
    ensure_within_root(root, &joined)
}

pub fn sanitize_entry_name(name: &str) -> Result<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::message("name cannot be empty"));
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err(AppError::message(
            "name cannot contain path separators or '..'",
        ));
    }
    if trimmed == "." || trimmed == ".." {
        return Err(AppError::message("invalid name"));
    }
    Ok(trimmed.to_string())
}

pub fn join_relative(parent: &str, name: &str) -> String {
    let parent = parent.trim_matches(['/', '\\']);
    if parent.is_empty() {
        name.to_string()
    } else {
        format!("{parent}/{name}")
    }
}
