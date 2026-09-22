use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::{AppError, Result};
use crate::services::path_util::{canonicalize_existing, ensure_within_root, resolve_relative};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AttachmentType {
    File,
    Image,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAttachment {
    pub path: String,
    pub kind: AttachmentType,
}

pub const ATTACHMENTS_DIR: &str = "attachments";

pub fn list_attachments(project_root: &Path) -> Result<Vec<ProjectAttachment>> {
    let root = canonicalize_existing(project_root)?;
    let dir = root.join(ATTACHMENTS_DIR);
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else {
            continue;
        };
        if !is_safe_file_name(name) {
            continue;
        }
        files.push(ProjectAttachment {
            path: format!("{ATTACHMENTS_DIR}/{name}"),
            kind: attachment_type(&path),
        });
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(files)
}

fn attachment_type(path: &Path) -> AttachmentType {
    let is_image = mime_guess::from_path(path)
        .first()
        .is_some_and(|mime| mime.type_() == mime_guess::mime::IMAGE);
    if is_image {
        AttachmentType::Image
    } else {
        AttachmentType::File
    }
}

pub fn copy_attachment(project_root: &Path, source_path: &Path) -> Result<String> {
    let root = canonicalize_existing(project_root)?;
    let source = canonicalize_existing(source_path)?;
    if !source.is_file() {
        return Err(AppError::message(format!(
            "attachment source is not a file: {}",
            source.display()
        )));
    }

    let dir = root.join(ATTACHMENTS_DIR);
    fs::create_dir_all(&dir)?;
    let bytes = fs::read(&source)?;

    if let Some(existing) = find_same_content(&dir, &bytes)? {
        let name = existing
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| AppError::message("attachment file name is not valid unicode"))?;
        return Ok(format!("{ATTACHMENTS_DIR}/{name}"));
    }

    let original = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("file");
    let stored_name = next_available_name(&dir, &sanitize_file_name(original));
    let dest = dir.join(&stored_name);
    ensure_within_root(&root, &dest)?;
    fs::write(&dest, &bytes)?;
    Ok(format!("{ATTACHMENTS_DIR}/{stored_name}"))
}

pub fn resolve_project_attachment(project_root: &Path, relative_path: &str) -> Result<PathBuf> {
    let relative = normalize_relative(relative_path);
    if attachment_file_name(&relative).is_none() {
        return Err(AppError::message(format!(
            "attachment path is outside the project: {relative_path}"
        )));
    }

    let root = canonicalize_existing(project_root)?;
    let path = resolve_relative(&root, &relative)?;
    if !path.is_file() {
        return Err(AppError::message(format!(
            "attachment not found: {relative}"
        )));
    }
    Ok(path)
}

fn find_same_content(dir: &Path, bytes: &[u8]) -> Result<Option<PathBuf>> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let metadata = fs::metadata(&path)?;
        if metadata.len() != bytes.len() as u64 {
            continue;
        }
        if fs::read(&path)? == bytes {
            return Ok(Some(path));
        }
    }
    Ok(None)
}

fn next_available_name(dir: &Path, file_name: &str) -> String {
    if !dir.join(file_name).exists() {
        return file_name.to_string();
    }

    let (stem, extension) = split_stem_ext(file_name);
    let mut index = 2;
    loop {
        let candidate = format!("{stem}-{index}{extension}");
        if !dir.join(&candidate).exists() {
            return candidate;
        }
        index += 1;
    }
}

fn split_stem_ext(file_name: &str) -> (String, String) {
    match file_name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() && !extension.is_empty() => {
            (stem.to_string(), format!(".{extension}"))
        }
        _ => (file_name.to_string(), String::new()),
    }
}

fn sanitize_file_name(name: &str) -> String {
    let safe: String = name
        .trim()
        .chars()
        .map(|ch| {
            if ch.is_control() || matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|')
            {
                '_'
            } else {
                ch
            }
        })
        .collect();
    let safe = safe.trim_matches('.').to_string();
    if safe.is_empty() {
        "file".to_string()
    } else {
        safe
    }
}

fn normalize_relative(relative: &str) -> String {
    relative.trim().trim_matches(['/', '\\']).replace('\\', "/")
}

fn attachment_file_name(relative: &str) -> Option<&str> {
    let parts: Vec<&str> = relative
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    let file_name = match parts.as_slice() {
        ["attachments", file_name] => *file_name,
        [".resq", "attachments", file_name] => *file_name,
        _ => return None,
    };
    if is_safe_file_name(file_name) {
        Some(file_name)
    } else {
        None
    }
}

fn is_safe_file_name(name: &str) -> bool {
    !name.is_empty()
        && name != "."
        && name != ".."
        && !name.contains('/')
        && !name.contains('\\')
        && !name.contains('\0')
}

#[cfg(test)]
mod tests {
    use super::{
        copy_attachment, list_attachments, resolve_project_attachment, AttachmentType,
        ProjectAttachment,
    };
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(label: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("resq-{label}-{nanos}"));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn copy_reuses_an_existing_file_with_the_same_bytes() {
        let root = temp_root("reuse");
        let first = root.join("foto.png");
        let second = root.join("otra.png");
        fs::write(&first, b"png").unwrap();
        fs::write(&second, b"png").unwrap();

        let stored = copy_attachment(&root, &first).unwrap();
        let again = copy_attachment(&root, &second).unwrap();
        assert_eq!(stored, "attachments/foto.png");
        assert_eq!(again, stored);
        assert_eq!(
            list_attachments(&root).unwrap(),
            vec![ProjectAttachment {
                path: stored.clone(),
                kind: AttachmentType::Image,
            }]
        );

        let path = resolve_project_attachment(&root, &stored).unwrap();
        assert_eq!(fs::read(path).unwrap(), b"png");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn copy_keeps_a_different_file_that_shares_the_name() {
        let root = temp_root("suffix");
        let source = root.join("foto.png");
        fs::write(&source, b"one").unwrap();
        let first = copy_attachment(&root, &source).unwrap();

        fs::write(&source, b"two").unwrap();
        let second = copy_attachment(&root, &source).unwrap();
        assert_eq!(first, "attachments/foto.png");
        assert_eq!(second, "attachments/foto-2.png");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn list_marks_images_and_other_files() {
        let root = temp_root("kinds");
        let image = root.join("foto.webp");
        let notes = root.join("notas.txt");
        fs::write(&image, b"webp").unwrap();
        fs::write(&notes, b"txt").unwrap();
        copy_attachment(&root, &image).unwrap();
        copy_attachment(&root, &notes).unwrap();

        assert_eq!(
            list_attachments(&root).unwrap(),
            vec![
                ProjectAttachment {
                    path: "attachments/foto.webp".to_string(),
                    kind: AttachmentType::Image,
                },
                ProjectAttachment {
                    path: "attachments/notas.txt".to_string(),
                    kind: AttachmentType::File,
                },
            ]
        );
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn resolve_rejects_paths_outside_attachments() {
        let root = temp_root("escape");
        let err = resolve_project_attachment(&root, "../secret.txt").unwrap_err();
        assert!(err.to_string().contains("outside the project"));
        let _ = fs::remove_dir_all(&root);
    }
}
