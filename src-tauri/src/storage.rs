use crate::history::get_app_dir;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Everything Ultra Mimic writes lives under one folder: `%APPDATA%\Ultra Mimic`.
pub fn data_dir() -> PathBuf {
    get_app_dir()
}

/// WebView2 profile, moved out of `%LOCALAPPDATA%` so the app leaves a single folder.
pub fn webview_dir() -> PathBuf {
    data_dir().join("EBWebView")
}

pub fn games_cache_path() -> PathBuf {
    data_dir().join("games_cache.json")
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    let mut total = 0u64;
    let mut stack = vec![path.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let Ok(meta) = entry.metadata() else {
                continue;
            };
            if meta.is_dir() {
                stack.push(entry.path());
            } else {
                total += meta.len();
            }
        }
    }
    total
}

#[derive(Debug, Serialize)]
pub struct StorageInfo {
    pub data_dir: String,
    pub total_bytes: u64,
    pub cache_bytes: u64,
    pub history_bytes: u64,
    pub webview_bytes: u64,
}

pub fn storage_info() -> StorageInfo {
    let dir = data_dir();
    let cache = dir.join("games_cache.json");
    let history = dir.join("history.json");
    StorageInfo {
        data_dir: dir.to_string_lossy().to_string(),
        total_bytes: dir_size(&dir),
        cache_bytes: if cache.exists() {
            fs::metadata(&cache).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        },
        history_bytes: if history.exists() {
            fs::metadata(&history).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        },
        webview_bytes: dir_size(&webview_dir()),
    }
}

/// Files that can be re-downloaded at any time. History is never touched.
pub fn clear_cache() -> Result<u64, String> {
    let before = storage_info().cache_bytes;
    let cache = games_cache_path();
    if cache.exists() {
        fs::remove_file(&cache).map_err(|e| e.to_string())?;
    }
    // Temporary dummy executables created by the spoofer.
    let temp = std::env::temp_dir().join("ultra_mimic");
    if temp.exists() {
        let _ = fs::remove_dir_all(temp);
    }
    Ok(before)
}

/// Deletes disposable WebView2 caches while keeping Local Storage (our settings).
pub fn purge_webview_caches() {
    let root = webview_dir();
    if !root.exists() {
        return;
    }
    let disposable = [
        "Default/Cache",
        "Default/Code Cache",
        "Default/GPUCache",
        "Default/DawnCache",
        "Default/DawnGraphiteCache",
        "Default/DawnWebGPUCache",
        "Default/Service Worker/CacheStorage",
        "GrShaderCache",
        "GPUPersistentCache",
        "ShaderCache",
        "Crashpad",
        "component_crx_cache",
        "extensions_crx_cache",
    ];
    for relative in disposable {
        let path = root.join(relative);
        if path.exists() {
            let _ = fs::remove_dir_all(path);
        }
    }
}

/// Opens the single data folder in Explorer.
pub fn open_data_folder() -> Result<(), String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    #[cfg(windows)]
    {
        Command::new("explorer")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
