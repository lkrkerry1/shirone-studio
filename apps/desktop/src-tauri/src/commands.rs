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

#[tauri::command]
pub async fn http_fetch(url: String) -> Result<String, String> {
    let parsed = reqwest::Url::parse(&url).map_err(|error| format!("Invalid URL: {error}"))?;
    let allowed = matches!(
        parsed.host_str(),
        Some("luogu.com.cn")
            | Some("www.luogu.com.cn")
            | Some("codeforces.com")
            | Some("www.codeforces.com")
            | Some("atcoder.jp")
    );
    if !allowed {
        return Err("Host is not allowed".into());
    }
    let client = reqwest::Client::builder()
        .user_agent("ShironeStudio/0.1 (+https://github.com/lkrkerry1/shirone-studio)")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|error| format!("Cannot create HTTP client: {error}"))?;
    let response = client
        .get(parsed)
        .send()
        .await
        .map_err(|error| format!("Network error: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    response
        .text()
        .await
        .map_err(|error| format!("Cannot read response: {error}"))
}
