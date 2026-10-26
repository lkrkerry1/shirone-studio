use crate::fsutil::{
    self, DirEntry, FileContent, FileStat, ProjectLayoutInfo,
};

#[tauri::command]
pub fn detect_project_layout(root: String) -> Result<ProjectLayoutInfo, String> {
    fsutil::detect_layout(&root)
}

#[tauri::command]
pub fn read_text(root: String, path: String) -> Result<FileContent, String> {
    fsutil::read_text_file(&root, &path)
}

#[tauri::command]
pub fn write_text(
    root: String,
    path: String,
    content: String,
    expected_hash: Option<String>,
) -> Result<(String, u64), String> {
    let (hash, mtime) = fsutil::write_text_file(&root, &path, &content, expected_hash.as_deref())?;
    Ok((hash, mtime))
}

#[tauri::command]
pub fn list_dir(root: String, path: String) -> Result<Vec<DirEntry>, String> {
    fsutil::list_dir(&root, &path)
}

#[tauri::command]
pub fn stat_path(root: String, path: String) -> Result<FileStat, String> {
    fsutil::stat_path(&root, &path)
}

#[tauri::command]
pub fn create_dir(root: String, path: String) -> Result<(), String> {
    fsutil::create_dir(&root, &path)
}
