pub mod commands;
pub mod discord;
pub mod fake_status;
pub mod history;
pub mod i18n;
pub mod rpc;
pub mod spoofer;
pub mod state;
pub mod storage;
pub mod updater;

use state::AppState;
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

/// WebView2 flags that keep its profile small: no disk cache, no shader cache,
/// no background component downloads, no crash dumps.
const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection \
--disk-cache-size=1 --media-cache-size=1 --disable-gpu-shader-disk-cache \
--disable-component-update --disable-background-networking --disable-breakpad \
--disable-domain-reliability --disable-sync --no-first-run";



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // Only one copy may run: a second launch focuses the existing window.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::fetch_games,
            commands::get_games_list,
            commands::start_spoofer,
            commands::pause_spoofer,
            commands::resume_spoofer,
            commands::stop_spoofer,
            commands::check_discord_status,
            commands::get_spoofer_state,
            commands::clear_history,
            commands::get_history_games,
            commands::remove_history_entries,
            commands::export_history,
            commands::import_history,
            commands::get_storage_info,
            commands::clear_app_cache,
            commands::open_data_folder,
            commands::open_external_url,
            commands::set_language,
            commands::start_fake_status,
            commands::stop_fake_status,
            commands::get_fake_status,
            updater::check_update,
            updater::download_update,
            updater::apply_update,
        ])
        .setup(|app| {
            // Start from a clean profile even if the previous run was force-closed.
            storage::purge_webview_caches();

            // Keep the WebView2 profile inside the app's single data folder.
            // WebView2 appends its own `EBWebView` subfolder, so pass the root.
            let data_dir = storage::data_dir();
            let _ = std::fs::create_dir_all(&data_dir);

            let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Ultra Mimic")
                .inner_size(1240.0, 816.0)
                .min_inner_size(1080.0, 720.0)
                .resizable(true)
                .decorations(false)
                .center()
                .theme(Some(tauri::Theme::Dark))
                .background_color(tauri::window::Color(23, 24, 29, 255))
                .data_directory(data_dir)
                .additional_browser_args(BROWSER_ARGS);

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone())?;
            }

            builder.build()?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Ultra Mimic desktop application");

    app.run(|_app_handle, event| {
        if let RunEvent::Exit = event {
            // Leave no dummy executables or WebView caches behind.
            spoofer::cleanup_runtime_temp();
            storage::purge_webview_caches();
        }
    });
}
