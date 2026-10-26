mod commands;
mod fsutil;

use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Keep WebView2 state in the user's home folder. Tauri's default
            // app_local_data_dir can be blocked by restricted desktop tokens.
            let data_dir = if let Some(path) = std::env::var_os("SHIRONE_WEBVIEW_DATA_DIR") {
                std::path::PathBuf::from(path)
            } else {
                let home = std::env::var_os("USERPROFILE")
                    .or_else(|| std::env::var_os("HOME"))
                    .ok_or_else(|| {
                        std::io::Error::new(
                            std::io::ErrorKind::NotFound,
                            "Cannot resolve home directory",
                        )
                    })?;
                std::path::PathBuf::from(home)
                    .join(".shirone-studio")
                    .join("webview2")
            };
            std::fs::create_dir_all(&data_dir)?;

            let mut window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("Shirone Studio")
            .inner_size(1440.0, 900.0)
            .min_inner_size(1024.0, 680.0)
            .data_directory(data_dir);

            // Escape hatch for machines whose WebView2 runtime crashes in the
            // GPU/audio sandbox. Normal launches keep Tauri's defaults.
            if let Ok(args) = std::env::var("SHIRONE_WEBVIEW_ARGS") {
                window = window.additional_browser_args(&args);
            }

            window.build()?;

            Ok(())
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
