use crate::fsutil::{
    self, DirEntry, FileContent, FileStat, ProjectLayoutInfo,
};
use crate::git::{self, GitCommitResult, GitPushResult, GitStatus};

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
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Cannot read response: {error}"))?;
    if !status.is_success() {
        // Codeforces answers 400 with a JSON comment; keep it readable.
        let detail: String = body.chars().take(200).collect();
        return Err(format!("HTTP {status}: {detail}"));
    }
    Ok(body)
}

/// Run blocking work off the UI thread; git can take a moment on big trees.
async fn run_blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| format!("后台任务失败：{error}"))?
}

#[tauri::command]
pub async fn git_status(root: String) -> Result<GitStatus, String> {
    run_blocking(move || git::status(&root)).await
}

#[tauri::command]
pub async fn git_stage(root: String, paths: Vec<String>) -> Result<GitStatus, String> {
    run_blocking(move || git::stage(&root, &paths)).await
}

#[tauri::command]
pub async fn git_unstage(root: String, paths: Vec<String>) -> Result<GitStatus, String> {
    run_blocking(move || git::unstage(&root, &paths)).await
}

#[tauri::command]
pub async fn git_commit(
    root: String,
    message: String,
    paths: Vec<String>,
) -> Result<GitCommitResult, String> {
    run_blocking(move || git::commit(&root, &message, &paths)).await
}

#[tauri::command]
pub async fn git_push(root: String) -> Result<GitPushResult, String> {
    run_blocking(move || git::push(&root)).await
}

#[tauri::command]
pub async fn git_diff(root: String, path: String, staged: bool) -> Result<String, String> {
    run_blocking(move || git::diff(&root, &path, staged)).await
}

#[tauri::command]
pub async fn write_asset(root: String, path: String, base64: String) -> Result<(String, u64), String> {
    run_blocking(move || fsutil::write_asset(&root, &path, &base64)).await
}
