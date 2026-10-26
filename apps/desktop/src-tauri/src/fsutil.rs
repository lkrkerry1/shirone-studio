use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub content: String,
    pub hash: String,
    pub mtime_ms: u64,
    pub eol: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub exists: bool,
    pub is_directory: bool,
    pub size: u64,
    pub mtime_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub relative_path: String,
    pub is_directory: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLayoutInfo {
    pub mode: String,
    pub root: String,
    pub content_root: String,
    pub config_root: String,
    pub public_root: String,
}

pub fn canonical_root(root: &str) -> Result<PathBuf, String> {
    let path = fs::canonicalize(root).map_err(|error| format!("Invalid workspace root: {error}"))?;
    if !path.is_dir() {
        return Err("Workspace root is not a directory".into());
    }
    Ok(path)
}

fn ensure_relative(relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path.is_absolute() {
        return Err("Absolute paths are not allowed".into());
    }
    if path
        .components()
        .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_)))
    {
        return Err("Path traversal is not allowed".into());
    }
    Ok(path.to_path_buf())
}

pub fn resolve_existing(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = ensure_relative(relative)?;
    let target = root.join(relative);
    let canonical = fs::canonicalize(&target).map_err(|error| format!("Path not found: {error}"))?;
    if !canonical.starts_with(root) {
        return Err("Path escapes workspace root".into());
    }
    Ok(canonical)
}

pub fn resolve_for_write(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = ensure_relative(relative)?;
    let target = root.join(&relative);
    let parent = target
        .parent()
        .ok_or_else(|| "Path has no parent directory".to_string())?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| format!("Parent directory not found: {error}"))?;
    if !canonical_parent.starts_with(root) {
        return Err("Path escapes workspace root".into());
    }
    Ok(canonical_parent.join(
        target
            .file_name()
            .ok_or_else(|| "Path has no file name".to_string())?,
    ))
}

pub fn hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

pub fn read_text_file(root: &str, relative: &str) -> Result<FileContent, String> {
    let root = canonical_root(root)?;
    let target = resolve_existing(&root, relative)?;
    let bytes = fs::read(&target).map_err(|error| format!("Cannot read file: {error}"))?;
    let content = String::from_utf8(bytes.clone()).map_err(|error| format!("File is not UTF-8: {error}"))?;
    let meta = fs::metadata(&target).map_err(|error| format!("Cannot stat file: {error}"))?;
    let eol = if content.contains("\r\n") { "crlf" } else { "lf" };
    Ok(FileContent {
        content,
        hash: hash_bytes(&bytes),
        mtime_ms: mtime_ms(&meta),
        eol: eol.into(),
    })
}

pub fn write_text_file(
    root: &str,
    relative: &str,
    content: &str,
    expected_hash: Option<&str>,
) -> Result<(String, u64), String> {
    let root = canonical_root(root)?;
    let target = resolve_for_write(&root, relative)?;
    if let Some(expected) = expected_hash {
        if target.exists() {
            let current = fs::read(&target).map_err(|error| format!("Cannot read current file: {error}"))?;
            if hash_bytes(&current) != expected {
                return Err("CONFLICT".into());
            }
        }
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Cannot create directory: {error}"))?;
    }
    let temp = target.with_extension(format!(
        "tmp-{}",
        std::process::id()
    ));
    {
        let mut file = fs::File::create(&temp).map_err(|error| format!("Cannot create temp file: {error}"))?;
        file.write_all(content.as_bytes())
            .map_err(|error| format!("Cannot write temp file: {error}"))?;
    }
    if target.exists() {
        fs::remove_file(&target).map_err(|error| format!("Cannot replace file: {error}"))?;
    }
    fs::rename(&temp, &target).map_err(|error| format!("Cannot finalize write: {error}"))?;
    let meta = fs::metadata(&target).map_err(|error| format!("Cannot stat written file: {error}"))?;
    Ok((hash_bytes(content.as_bytes()), mtime_ms(&meta)))
}

pub fn list_dir(root: &str, relative: &str) -> Result<Vec<DirEntry>, String> {
    let root = canonical_root(root)?;
    let target = resolve_existing(&root, relative)?;
    if !target.is_dir() {
        return Err("Path is not a directory".into());
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(&target).map_err(|error| format!("Cannot list directory: {error}"))? {
        let entry = entry.map_err(|error| format!("Cannot read directory entry: {error}"))?;
        let path = entry.path();
        let relative_path = path
            .strip_prefix(&root)
            .map_err(|_| "Entry escapes workspace root".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            relative_path,
            is_directory: path.is_dir(),
        });
    }
    entries.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(entries)
}

pub fn stat_path(root: &str, relative: &str) -> Result<FileStat, String> {
    let root = canonical_root(root)?;
    let target = root.join(ensure_relative(relative)?);
    if !target.exists() {
        return Ok(FileStat {
            exists: false,
            is_directory: false,
            size: 0,
            mtime_ms: 0,
        });
    }
    let canonical = fs::canonicalize(&target).map_err(|error| format!("Cannot resolve path: {error}"))?;
    if !canonical.starts_with(&root) {
        return Err("Path escapes workspace root".into());
    }
    let meta = fs::metadata(&target).map_err(|error| format!("Cannot stat path: {error}"))?;
    Ok(FileStat {
        exists: true,
        is_directory: meta.is_dir(),
        size: meta.len(),
        mtime_ms: mtime_ms(&meta),
    })
}

pub fn create_dir(root: &str, relative: &str) -> Result<(), String> {
    let root = canonical_root(root)?;
    let target = resolve_for_write(&root, &format!("{relative}/.keep"))?;
    let parent = target.parent().ok_or_else(|| "Invalid directory".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Cannot create directory: {error}"))
}

pub fn detect_layout(root: &str) -> Result<ProjectLayoutInfo, String> {
    let root_path = canonical_root(root)?;
    let root_str = root_path.to_string_lossy().replace('\\', "/");
    if root_path.join("shirones/content").is_dir() {
        return Ok(ProjectLayoutInfo {
            mode: "npm".into(),
            root: root_str.clone(),
            content_root: format!("{root_str}/shirones/content"),
            config_root: format!("{root_str}/shirones/config"),
            public_root: format!("{root_str}/public"),
        });
    }
    if root_path.join("src/content").is_dir() {
        return Ok(ProjectLayoutInfo {
            mode: "source".into(),
            root: root_str.clone(),
            content_root: format!("{root_str}/src/content"),
            config_root: format!("{root_str}/src/config"),
            public_root: format!("{root_str}/public"),
        });
    }
    Err("Not a Shirone project: expected shirones/content or src/content".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn rejects_parent_traversal() {
        assert!(ensure_relative("../x").is_err());
        assert!(ensure_relative("a/../../x").is_err());
        assert!(ensure_relative("a/b").is_ok());
    }

    #[test]
    fn writes_and_hashes_text() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!("fsutil-test-{}", std::process::id()));
        fs::create_dir_all(root.join("posts")).unwrap();
        let root_string = root.to_string_lossy().into_owned();
        let (hash, _) = write_text_file(&root_string, "posts/a.md", "hello", None).unwrap();
        let content = read_text_file(&root_string, "posts/a.md").unwrap();
        assert_eq!(content.content, "hello");
        assert_eq!(content.hash, hash);
        assert!(write_text_file(&root_string, "posts/a.md", "changed", Some("wrong")).is_err());
        fs::remove_dir_all(&root).ok();
    }
}
