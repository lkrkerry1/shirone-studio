mod commands;
mod fsutil;

use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Exit code used when the WebView2 runtime cannot produce a webview.
///
/// A Rust panic exits with 101 and prints a bare `RUST_BACKTRACE` hint, which
/// looks like a project bug. This distinct code lets launchers and CI report
/// "this machine cannot host WebView2" instead.
const EXIT_WEBVIEW_UNAVAILABLE: i32 = 4;

/// Report a fatal startup problem and stop the process.
///
/// A console (a debug launch from `pnpm tauri dev`) already shows the text, so
/// the dialog is opened only when nothing else would be visible: a release
/// build, or a double-clicked debug executable.
fn fatal(title: &str, body: &str) -> ! {
    eprintln!("\n{title}\n{body}\n");
    if !has_console() {
        show_message_box(title, body);
    }
    std::process::exit(EXIT_WEBVIEW_UNAVAILABLE);
}

#[cfg(windows)]
fn has_console() -> bool {
    #[link(name = "kernel32")]
    extern "system" {
        fn GetConsoleWindow() -> *mut std::ffi::c_void;
    }

    // SAFETY: takes no arguments; a null return just means "no console".
    unsafe { !GetConsoleWindow().is_null() }
}

#[cfg(not(windows))]
fn has_console() -> bool {
    true
}

#[cfg(windows)]
fn show_message_box(title: &str, body: &str) {
    const MB_ICONERROR: u32 = 0x0000_0010;
    const MB_SETFOREGROUND: u32 = 0x0001_0000;

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(
            hwnd: *mut std::ffi::c_void,
            text: *const u16,
            caption: *const u16,
            u_type: u32,
        ) -> i32;
    }

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(std::iter::once(0)).collect()
    }

    let text = wide(body);
    let caption = wide(title);
    // SAFETY: both buffers are null terminated and outlive the call.
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            caption.as_ptr(),
            MB_ICONERROR | MB_SETFOREGROUND,
        );
    }
}

#[cfg(not(windows))]
fn show_message_box(title: &str, body: &str) {
    let _ = (title, body);
}

/// Explain a failed webview creation and what the user can do about it.
///
/// Kept ASCII so it survives any console code page.
fn webview_unavailable_message(error: &str) -> String {
    let error_line = format!("Error: {error}");
    [
        "Shirone Studio could not create its WebView2 window.",
        "",
        error_line.as_str(),
        "",
        "The Microsoft Edge WebView2 runtime failed to start its browser process,",
        "so no window can be shown. This is an environment problem, not a bug in",
        "the editor: Tauri cannot draw a window without a working WebView2.",
        "",
        "Things to try:",
        "",
        "  1. Run the editor outside a sandboxed shell. A sandbox that only allows",
        "     writes to its workspace makes the WebView2 browser process abort;",
        "     this build already retries with a workspace-local profile folder.",
        "  2. Repair or reinstall the Evergreen Microsoft Edge WebView2 Runtime.",
        "  3. Point WebView2 at another runtime with a fixed-version install:",
        "       set WEBVIEW2_BROWSER_EXECUTABLE_FOLDER=<runtime folder>",
        "  4. Try different browser switches for a broken GPU or sandbox:",
        "       set SHIRONE_WEBVIEW_ARGS=--no-sandbox --disable-gpu",
        "  5. Store the WebView2 profile somewhere else:",
        "       set SHIRONE_WEBVIEW_DATA_DIR=<writable folder>",
        "       set SHIRONE_WEBVIEW_DATA_DIR=default   (use Tauri's folder)",
        "",
        "See README.md, section \"WebView2 profile location\", for the failure this",
        "was diagnosed from.",
    ]
    .join("\r\n")
}

/// WebView2 profile locations to try, in order.
///
/// The browser process writes its profile before it can host anything. Some
/// sandboxed launchers (the DSH shell is one) let a process write to its
/// workspace but refuse the same writes from the WebView2 browser process; the
/// browser then aborts with a bare `0x8000FFFF` and no window appears. Trying a
/// workspace-local folder turns that into a working window.
///
/// An explicit `SHIRONE_WEBVIEW_DATA_DIR` always wins and is used alone, so a
/// deliberately broken path still fails loudly. `SHIRONE_WEBVIEW_DATA_DIR=default`
/// means "Tauri's own app data folder".
fn webview_data_dirs() -> Vec<Option<std::path::PathBuf>> {
    match std::env::var_os("SHIRONE_WEBVIEW_DATA_DIR") {
        Some(value) if value == std::ffi::OsStr::new("default") => return vec![None],
        Some(value) => return vec![Some(std::path::PathBuf::from(value))],
        None => {}
    }

    let home = std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(std::path::PathBuf::from)
        .map(|home| home.join(".shirone-studio").join("webview2"));
    let workspace = std::env::current_dir()
        .ok()
        .map(|dir| dir.join(".shirone-webview2"));
    let temp = Some(std::env::temp_dir().join("shirone-studio-webview2"));

    // Under a sandboxed shell the workspace is the location that works, so try
    // it first instead of burning a crash on the home folder every launch.
    let ordered = if std::env::var_os("DSH_SHELL").is_some() {
        [workspace, home, temp]
    } else {
        [home, workspace, temp]
    };

    let mut dirs: Vec<Option<std::path::PathBuf>> =
        ordered.into_iter().filter(Option::is_some).collect();
    dirs.dedup();
    dirs
}

/// Build the main window against one WebView2 profile directory.
fn build_window(
    app: &tauri::AppHandle,
    data_dir: Option<&std::path::Path>,
) -> Result<tauri::WebviewWindow, String> {
    let mut window = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::App("index.html".into()),
    )
    .title("Shirone Studio")
    .inner_size(1440.0, 900.0)
    .min_inner_size(1024.0, 680.0);

    if let Some(dir) = data_dir {
        std::fs::create_dir_all(dir).map_err(|error| {
            format!(
                "cannot create the WebView2 data directory {}: {error}",
                dir.display()
            )
        })?;
        window = window.data_directory(dir.to_path_buf());
    }

    // Escape hatch for machines whose WebView2 runtime crashes in the
    // GPU/audio sandbox. Normal launches keep Tauri's defaults.
    if let Ok(args) = std::env::var("SHIRONE_WEBVIEW_ARGS") {
        window = window.additional_browser_args(&args);
    }

    window.build().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let candidates = webview_data_dirs();
            let mut last_error = String::new();

            // A configured directory is an explicit decision: use it alone.
            // Otherwise try each candidate, because a sandboxed launcher can
            // block the home folder while the workspace stays writable.
            for (index, data_dir) in candidates.iter().enumerate() {
                match build_window(&handle, data_dir.as_deref()) {
                    Ok(_) => {
                        if index > 0 {
                            let used = data_dir
                                .as_ref()
                                .map(|dir| dir.display().to_string())
                                .unwrap_or_else(|| "Tauri's default folder".into());
                            eprintln!(
                                "[shirone] WebView2 profile fell back to {used} \
                                 (the earlier locations are not writable from the \
                                 WebView2 browser process)"
                            );
                        }
                        return Ok(());
                    }
                    Err(error) => {
                        if candidates.len() > 1 {
                            let tried = data_dir
                                .as_ref()
                                .map(|dir| dir.display().to_string())
                                .unwrap_or_else(|| "Tauri's default folder".into());
                            eprintln!("[shirone] WebView2 profile at {tried} failed: {error}");
                        }
                        last_error = error;
                    }
                }
            }

            fatal(
                "Shirone Studio - WebView2 unavailable",
                &webview_unavailable_message(&last_error),
            )
        })
        .invoke_handler(tauri::generate_handler![
            commands::detect_project_layout,
            commands::read_text,
            commands::write_text,
            commands::list_dir,
            commands::stat_path,
            commands::create_dir,
            commands::http_fetch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Shirone Studio");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, MutexGuard};

    /// Env vars are process-global, so the tests that touch them take turns.
    fn env_lock() -> MutexGuard<'static, ()> {
        static LOCK: Mutex<()> = Mutex::new(());
        LOCK.lock().unwrap_or_else(|error| error.into_inner())
    }

    #[test]
    fn webview_failure_message_keeps_the_original_error() {
        let message = webview_unavailable_message("WebView2 error: 0x8000FFFF");
        assert!(message.contains("Error: WebView2 error: 0x8000FFFF"));
    }

    #[test]
    fn webview_failure_message_lists_every_escape_hatch() {
        let message = webview_unavailable_message("boom");
        assert!(message.contains("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER"));
        assert!(message.contains("SHIRONE_WEBVIEW_ARGS"));
        assert!(message.contains("SHIRONE_WEBVIEW_DATA_DIR"));
        assert!(message.contains("sandboxed shell"));
    }

    #[test]
    fn webview_failure_message_uses_windows_line_endings() {
        let message = webview_unavailable_message("boom");
        assert!(message.contains("\r\n"));
        assert!(!message.contains("\n\n"));
    }

    #[test]
    fn explicit_profile_directory_is_used_alone() {
        let _guard = env_lock();
        std::env::set_var("SHIRONE_WEBVIEW_DATA_DIR", r"C:\custom\profile");
        let dirs = webview_data_dirs();
        std::env::remove_var("SHIRONE_WEBVIEW_DATA_DIR");

        assert_eq!(dirs, vec![Some(std::path::PathBuf::from(r"C:\custom\profile"))]);
    }

    #[test]
    fn default_keyword_means_tauris_own_folder() {
        let _guard = env_lock();
        std::env::set_var("SHIRONE_WEBVIEW_DATA_DIR", "default");
        let dirs = webview_data_dirs();
        std::env::remove_var("SHIRONE_WEBVIEW_DATA_DIR");

        assert_eq!(dirs, vec![None]);
    }
}
