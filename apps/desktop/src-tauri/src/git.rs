use serde::Serialize;
use std::path::Path;
use std::process::{Command, Output};

use crate::fsutil::{canonical_root, ensure_relative};

const MAX_ENTRIES: usize = 500;
const MAX_DIFF_BYTES: usize = 200_000;
const MAX_OUTPUT_BYTES: usize = 8_000;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileEntry {
    pub path: String,
    pub index: String,
    pub worktree: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub entries: Vec<GitFileEntry>,
    pub truncated: bool,
}

impl GitStatus {
    fn not_a_repo() -> Self {
        Self {
            is_repo: false,
            branch: String::new(),
            ahead: 0,
            behind: 0,
            entries: Vec::new(),
            truncated: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitResult {
    pub committed: bool,
    pub hash: String,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitPushResult {
    pub ok: bool,
    pub output: String,
}

/// Run git with a fixed argument list. Paths are validated by the caller.
fn run_git(root: &Path, args: &[&str]) -> Result<Output, String> {
    Command::new("git")
        .arg("--no-pager")
        .arg("-C")
        .arg(root)
        .args(args)
        // Never block on a credential prompt: fail and let the UI show the error.
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .env("LC_ALL", "C")
        .env("LANG", "C")
        .output()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "无法运行 git：请确认已安装 Git 并已加入 PATH".to_string()
            } else {
                format!("无法运行 git：{error}")
            }
        })
}

fn normalize_paths(paths: &[String]) -> Result<Vec<&str>, String> {
    if paths.is_empty() {
        return Err("没有选中任何文件".into());
    }
    if paths.len() > MAX_ENTRIES {
        return Err(format!("一次最多处理 {MAX_ENTRIES} 个文件"));
    }
    let mut out = Vec::with_capacity(paths.len());
    for path in paths {
        ensure_relative(path)?;
        out.push(path.as_str());
    }
    Ok(out)
}

fn tail(text: &str, limit: usize) -> String {
    if text.len() <= limit {
        return text.to_string();
    }
    let mut start = text.len() - limit;
    while start < text.len() && !text.is_char_boundary(start) {
        start += 1;
    }
    format!("…\n{}", &text[start..])
}

/// Parse `git status --porcelain=v1 -z -b` output.
pub fn parse_porcelain(output: &str) -> GitStatus {
    let mut status = GitStatus {
        is_repo: true,
        ..GitStatus::not_a_repo()
    };
    let mut tokens = output.split('\0');

    while let Some(token) = tokens.next() {
        if token.is_empty() {
            continue;
        }
        if let Some(rest) = token.strip_prefix("## ") {
            let tracking = match rest.find("...") {
                Some(index) => {
                    status.branch = rest[..index].to_string();
                    &rest[index + 3..]
                }
                None => {
                    status.branch = rest.split(" [").next().unwrap_or(rest).trim().to_string();
                    ""
                }
            };
            if let Some(start) = tracking.find('[') {
                if let Some(end) = tracking[start..].find(']') {
                    for part in tracking[start + 1..start + end].split(',') {
                        let part = part.trim();
                        if let Some(value) = part.strip_prefix("ahead ") {
                            status.ahead = value.trim().parse().unwrap_or(0);
                        }
                        if let Some(value) = part.strip_prefix("behind ") {
                            status.behind = value.trim().parse().unwrap_or(0);
                        }
                    }
                }
            }
            continue;
        }

        if token.len() < 3 {
            continue;
        }
        let index = token[..1].to_string();
        let worktree = token[1..2].to_string();
        let path = token[3..].to_string();
        // Rename and copy entries carry the original path as the next token.
        let renamed = matches!(index.as_str(), "R" | "C") || matches!(worktree.as_str(), "R" | "C");
        if renamed {
            let _original = tokens.next();
        }

        if status.entries.len() >= MAX_ENTRIES {
            status.truncated = true;
            continue;
        }
        status.entries.push(GitFileEntry {
            path,
            index,
            worktree,
        });
    }

    status
}

/// Git localizes this message; `run_git` asks for C locale, but stay tolerant.
fn is_not_a_repository(stderr: &str) -> bool {
    let lower = stderr.to_lowercase();
    lower.contains("not a git repository") || stderr.contains("不是一个 git 仓库")
}

pub fn status(root: &str) -> Result<GitStatus, String> {
    let root = canonical_root(root)?;
    let output = run_git(&root, &["status", "--porcelain=v1", "-z", "-b"])?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if is_not_a_repository(&stderr) {
            return Ok(GitStatus::not_a_repo());
        }
        return Err(format!("git status 失败：{}", stderr.trim()));
    }
    Ok(parse_porcelain(&String::from_utf8_lossy(&output.stdout)))
}

pub fn stage(root: &str, paths: &[String]) -> Result<GitStatus, String> {
    let root = canonical_root(root)?;
    let relative = normalize_paths(paths)?;
    let mut args = vec!["add", "--"];
    args.extend(relative);
    let output = run_git(&root, &args)?;
    if !output.status.success() {
        return Err(format!(
            "git add 失败：{}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    status(root.to_string_lossy().as_ref())
}

pub fn unstage(root: &str, paths: &[String]) -> Result<GitStatus, String> {
    let root = canonical_root(root)?;
    let relative = normalize_paths(paths)?;
    let mut args = vec!["restore", "--staged", "--"];
    args.extend(relative.clone());
    let output = run_git(&root, &args)?;
    if !output.status.success() {
        // A repository without commits has no HEAD to restore from.
        let mut fallback = vec!["rm", "--cached", "-r", "--"];
        fallback.extend(relative);
        let retry = run_git(&root, &fallback)?;
        if !retry.status.success() {
            return Err(format!(
                "git restore 失败：{}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }
    }
    status(root.to_string_lossy().as_ref())
}

pub fn commit(root: &str, message: &str, paths: &[String]) -> Result<GitCommitResult, String> {
    let message = message.trim();
    if message.is_empty() {
        return Err("提交信息不能为空".into());
    }
    if message.chars().count() > 200 {
        return Err("提交信息不能超过 200 字".into());
    }

    let root = canonical_root(root)?;
    let relative = normalize_paths(paths)?;

    let mut add_args = vec!["add", "--"];
    add_args.extend(relative.clone());
    let added = run_git(&root, &add_args)?;
    if !added.status.success() {
        return Err(format!(
            "git add 失败：{}",
            String::from_utf8_lossy(&added.stderr).trim()
        ));
    }

    let mut commit_args = vec!["commit", "-m", message, "--"];
    commit_args.extend(relative);
    let committed = run_git(&root, &commit_args)?;
    let stdout = String::from_utf8_lossy(&committed.stdout);
    let stderr = String::from_utf8_lossy(&committed.stderr);

    if !committed.status.success() {
        let combined = format!("{stdout}{stderr}");
        if combined.contains("nothing to commit") || combined.contains("no changes added") {
            return Ok(GitCommitResult {
                committed: false,
                hash: String::new(),
                summary: "没有可提交的改动".into(),
            });
        }
        return Err(format!("git commit 失败：{}", stderr.trim()));
    }

    let hash = run_git(&root, &["rev-parse", "--short", "HEAD"])
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .unwrap_or_default();
    let summary = stdout
        .lines()
        .find(|line| line.starts_with('['))
        .map(|line| line.trim().to_string())
        .unwrap_or_else(|| "已提交".into());

    Ok(GitCommitResult {
        committed: true,
        hash,
        summary,
    })
}

pub fn push(root: &str) -> Result<GitPushResult, String> {
    let root = canonical_root(root)?;
    let output = run_git(&root, &["push"])?;
    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    Ok(GitPushResult {
        ok: output.status.success(),
        output: tail(combined.trim(), MAX_OUTPUT_BYTES),
    })
}

pub fn diff(root: &str, path: &str, staged: bool) -> Result<String, String> {
    let root = canonical_root(root)?;
    ensure_relative(path)?;
    let mut args = vec!["diff"];
    if staged {
        args.push("--cached");
    }
    args.extend(["--", path]);
    let output = run_git(&root, &args)?;
    if !output.status.success() {
        return Err(format!(
            "git diff 失败：{}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let text = String::from_utf8_lossy(&output.stdout);
    if text.len() > MAX_DIFF_BYTES {
        let mut end = MAX_DIFF_BYTES;
        while end > 0 && !text.is_char_boundary(end) {
            end -= 1;
        }
        return Ok(format!("{}\n… (diff 已截断)", &text[..end]));
    }
    Ok(text.into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_header_and_changes() {
        let output = "## main...origin/main [ahead 1, behind 2]\0 M src/a.ts\0A  new.md\0?? img/x.png\0";
        let status = parse_porcelain(output);
        assert!(status.is_repo);
        assert_eq!(status.branch, "main");
        assert_eq!(status.ahead, 1);
        assert_eq!(status.behind, 2);
        assert_eq!(status.entries.len(), 3);
        assert_eq!(status.entries[0].path, "src/a.ts");
        assert_eq!(status.entries[0].worktree, "M");
        assert_eq!(status.entries[1].index, "A");
        assert_eq!(status.entries[2].index, "?");
    }

    #[test]
    fn parses_branch_without_upstream_and_paths_with_spaces() {
        let output = "## feature/x\0 M dir/with space/file name.md\0";
        let status = parse_porcelain(output);
        assert_eq!(status.branch, "feature/x");
        assert_eq!(status.ahead, 0);
        assert_eq!(status.entries[0].path, "dir/with space/file name.md");
    }

    #[test]
    fn skips_the_original_path_of_a_rename() {
        let output = "## main\0R  new.md\0old.md\0 M other.md\0";
        let status = parse_porcelain(output);
        assert_eq!(status.entries.len(), 2);
        assert_eq!(status.entries[0].index, "R");
        assert_eq!(status.entries[0].path, "new.md");
        assert_eq!(status.entries[1].path, "other.md");
    }

    #[test]
    fn caps_the_entry_list() {
        let mut output = String::from("## main\0");
        for index in 0..(MAX_ENTRIES + 5) {
            output.push_str(&format!(" M file{index}.md\0"));
        }
        let status = parse_porcelain(&output);
        assert_eq!(status.entries.len(), MAX_ENTRIES);
        assert!(status.truncated);
    }

    #[test]
    fn detects_the_not_a_repository_message() {
        assert!(is_not_a_repository(
            "fatal: not a git repository (or any of the parent directories): .git"
        ));
        assert!(is_not_a_repository("fatal: 不是一个 git 仓库（或者任何父目录）：.git"));
        assert!(!is_not_a_repository("fatal: bad revision 'HEAD'"));
    }

    #[test]
    fn rejects_paths_outside_the_root() {
        assert!(normalize_paths(&["../escape".to_string()]).is_err());
        assert!(normalize_paths(&["C:/windows".to_string()]).is_err());
        assert!(normalize_paths(&[]).is_err());
        assert!(normalize_paths(&["ok/file.md".to_string()]).is_ok());
    }
}
