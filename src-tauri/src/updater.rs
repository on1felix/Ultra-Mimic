use crate::state::AppState;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::io::Write;
use std::path::Path;
use std::sync::atomic::Ordering;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

/// Latest published build. Tag format is `Ultra_Mimic_v2.0.0`.
const GITHUB_API: &str = "https://api.github.com/repos/on1felix/Ultra-Mimic/releases/latest";
const USER_AGENT: &str = "Ultra-Mimic-Updater (+https://github.com/on1felix/Ultra-Mimic)";
const UPDATE_EXE: &str = "UltraMimic_update.exe";
const UPDATE_SCRIPT: &str = "UltraMimic_update.ps1";

#[derive(Clone, Serialize)]
pub struct UpdateInfo {
    pub current: String,
    pub latest: String,
    pub download_url: String,
    pub size: u64,
    /// SHA-256 from the release asset, when GitHub provides one.
    pub sha256: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct UpdateProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
    pub speed_mbps: f64,
}

fn parse_version(text: &str) -> Vec<u64> {
    text.split('.')
        .filter_map(|part| {
            let digits: String = part.chars().take_while(|c| c.is_ascii_digit()).collect();
            digits.parse::<u64>().ok()
        })
        .collect()
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    let mut latest_parts = parse_version(latest);
    let mut current_parts = parse_version(current);
    let len = latest_parts.len().max(current_parts.len());
    latest_parts.resize(len, 0);
    current_parts.resize(len, 0);
    latest_parts > current_parts
}

/// `Ultra_Mimic_v2.0.0` / `v2.0.0` / `Ultra-Mimic-2.0.0` -> `2.0.0`.
fn version_from_tag(tag: &str) -> String {
    tag.rsplit(['_', '-', '/'])
        .next()
        .unwrap_or(tag)
        .trim()
        .trim_start_matches(['v', 'V'])
        .to_string()
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .connect_timeout(Duration::from_secs(15))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

fn hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

/// Picks the newest release asset for this build. Split out from the command so
/// the release JSON shape can be tested without network access.
fn select_update(json: &serde_json::Value, current: &str) -> Option<UpdateInfo> {
    let latest = version_from_tag(json["tag_name"].as_str().unwrap_or(""));
    if latest.is_empty() || !is_newer_version(&latest, current) {
        return None;
    }

    // Prefer the portable build; any other .exe asset is the fallback.
    let mut chosen: Option<(String, u64, Option<String>)> = None;
    if let Some(assets) = json["assets"].as_array() {
        for asset in assets {
            let name = asset["name"].as_str().unwrap_or("").to_ascii_lowercase();
            if !name.ends_with(".exe") {
                continue;
            }
            let url = asset["browser_download_url"].as_str().unwrap_or("");
            if url.is_empty() {
                continue;
            }
            let size = asset["size"].as_u64().unwrap_or(0);
            let digest = asset["digest"]
                .as_str()
                .map(|value| value.trim_start_matches("sha256:").to_ascii_lowercase());
            let preferred = name.contains("mimic");
            if chosen.is_none() || preferred {
                chosen = Some((url.to_string(), size, digest));
            }
            if preferred {
                break;
            }
        }
    }

    chosen.map(|(download_url, size, sha256)| UpdateInfo {
        current: current.to_string(),
        latest,
        download_url,
        size,
        sha256,
    })
}

/// Latest GitHub release, or `None` when this build is already up to date.
#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let response = client()
        .get(GITHUB_API)
        .header("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("GitHub API: HTTP {}", response.status()));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let current = app.package_info().version.to_string();
    Ok(select_update(&json, &current))
}

/// Downloads the release into the temp folder and reports progress.
#[tauri::command]
pub async fn download_update(
    app: AppHandle,
    url: String,
    sha256: Option<String>,
    size: Option<u64>,
) -> Result<String, String> {
    let tmp = std::env::temp_dir().join(UPDATE_EXE);
    let _ = std::fs::remove_file(&tmp);

    let mut response = client()
        .get(&url)
        .header("Accept", "application/octet-stream")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download: HTTP {}", response.status()));
    }

    let total = response
        .content_length()
        .filter(|value| *value > 0)
        .or(size)
        .unwrap_or(0);

    let mut file = std::fs::File::create(&tmp).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_time = Instant::now();
    let mut last_bytes: u64 = 0;
    let mut speed = 0.0f64;

    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        hasher.update(&chunk);
        downloaded += chunk.len() as u64;

        let elapsed = last_time.elapsed().as_secs_f64();
        if elapsed >= 0.25 {
            let instant = (downloaded - last_bytes) as f64 / elapsed / (1024.0 * 1024.0);
            speed = if speed == 0.0 {
                instant
            } else {
                speed * 0.7 + instant * 0.3
            };
            last_time = Instant::now();
            last_bytes = downloaded;
            let _ = app.emit(
                "update-progress",
                UpdateProgress {
                    downloaded,
                    total,
                    percent: if total > 0 {
                        downloaded as f64 / total as f64 * 100.0
                    } else {
                        0.0
                    },
                    speed_mbps: speed,
                },
            );
        }
    }
    file.flush().ok();
    drop(file);

    if total > 0 && downloaded != total {
        let _ = std::fs::remove_file(&tmp);
        return Err(format!(
            "Download incomplete: {} of {} bytes",
            downloaded, total
        ));
    }

    let actual = hex(&hasher.finalize());
    if let Some(expected) = sha256.as_deref() {
        if !expected.is_empty() && !actual.eq_ignore_ascii_case(expected) {
            let _ = std::fs::remove_file(&tmp);
            return Err("Update checksum mismatch, download rejected".to_string());
        }
    }

    let _ = app.emit(
        "update-progress",
        UpdateProgress {
            downloaded,
            total: total.max(downloaded),
            percent: 100.0,
            speed_mbps: speed,
        },
    );

    Ok(tmp.to_string_lossy().into_owned())
}

fn ps_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

/// Hidden PowerShell helper: waits for this process to exit, replaces the exe
/// and starts it again. PowerShell is used instead of a .bat because paths with
/// spaces or Cyrillic characters survive quoting intact that way.
fn build_helper(target: &Path, new_exe: &Path) -> String {
    format!(
        "$ErrorActionPreference = 'SilentlyContinue'\r\n\
         $target = {target}\r\n\
         $new = {new}\r\n\
         $stage = \"$($target).new\"\r\n\
         $appPid = {pid}\r\n\
         for ($i = 0; $i -lt 120; $i++) {{\r\n\
           if (-not (Get-Process -Id $appPid -ErrorAction SilentlyContinue)) {{ break }}\r\n\
           Start-Sleep -Milliseconds 250\r\n\
         }}\r\n\
         Start-Sleep -Milliseconds 600\r\n\
         for ($i = 0; $i -lt 20; $i++) {{\r\n\
           try {{\r\n\
             Copy-Item -LiteralPath $new -Destination $stage -Force -ErrorAction Stop\r\n\
             Move-Item -LiteralPath $stage -Destination $target -Force -ErrorAction Stop\r\n\
             break\r\n\
           }} catch {{\r\n\
             Remove-Item -LiteralPath $stage -Force -ErrorAction SilentlyContinue\r\n\
             Start-Sleep -Milliseconds 500\r\n\
           }}\r\n\
         }}\r\n\
         if (Test-Path -LiteralPath $target) {{\r\n\
           Start-Process -FilePath $target -WorkingDirectory (Split-Path -LiteralPath $target)\r\n\
         }}\r\n\
         Remove-Item -LiteralPath $new -Force\r\n\
         Remove-Item -LiteralPath $PSCommandPath -Force\r\n",
        target = ps_literal(&target.to_string_lossy()),
        new = ps_literal(&new_exe.to_string_lossy()),
        pid = std::process::id(),
    )
}

/// Stops the current run, swaps the exe and relaunches the app.
#[tauri::command]
pub async fn apply_update(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let new_exe = std::env::temp_dir().join(UPDATE_EXE);
    if !new_exe.is_file() {
        return Err("Update file not found".to_string());
    }

    let current = std::env::current_exe()
        .map_err(|e| format!("Cannot resolve the current exe: {}", e))?;

    // A run must not leave dummy processes behind after the restart.
    state.cancel_flag.store(true, Ordering::SeqCst);
    state.pause_flag.store(false, Ordering::SeqCst);
    state.resume_notify.notify_waiters();
    let pids = {
        let mut guard = state.active_pids.lock().await;
        let list = guard.clone();
        guard.clear();
        list
    };
    for pid in pids {
        crate::spoofer::force_kill_pid(pid);
    }
    let _ = app.emit("spoofer_status", crate::state::SpooferStatusEvent {
        status: crate::state::SpooferStatus::Idle,
        message: None,
    });

    let script_path = std::env::temp_dir().join(UPDATE_SCRIPT);
    let script = build_helper(&current, &new_exe);
    let mut bytes = Vec::with_capacity(script.len() + 3);
    // PowerShell 5.1 needs the BOM to read the file as UTF-8.
    bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    bytes.extend_from_slice(script.as_bytes());
    std::fs::write(&script_path, bytes)
        .map_err(|e| format!("Cannot create the update script: {}", e))?;

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-File",
            ])
            .arg(&script_path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Cannot start the update helper: {}", e))?;
    }

    // `process::exit` skips the RunEvent::Exit hook, so the runtime temp folder
    // is cleaned here. The downloaded exe must stay: the helper still swaps it in.
    crate::spoofer::cleanup_runtime_temp();
    crate::storage::purge_webview_caches();
    std::process::exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Trimmed copy of the real GitHub payload for `Ultra_Mimic_v2.0.0`.
    const RELEASE: &str = r#"{
        "tag_name": "Ultra_Mimic_v2.0.0",
        "assets": [
            {
                "name": "README.md",
                "browser_download_url": "https://github.com/on1felix/Ultra-Mimic/releases/download/x/README.md",
                "size": 1200
            },
            {
                "name": "Ultra.Mimic.exe",
                "browser_download_url": "https://github.com/on1felix/Ultra-Mimic/releases/download/x/Ultra.Mimic.exe",
                "size": 15508992,
                "digest": "sha256:AFBA59B6C0FFEE"
            }
        ]
    }"#;

    #[test]
    fn current_build_does_not_prompt() {
        let json: serde_json::Value = serde_json::from_str(RELEASE).unwrap();
        // This build is 2.2.2, the release is 2.0.0: no dialog must appear.
        assert!(select_update(&json, "2.2.2").is_none());
        assert!(select_update(&json, "2.0.0").is_none());
    }

    #[test]
    fn release_asset_is_selected_for_older_builds() {
        let json: serde_json::Value = serde_json::from_str(RELEASE).unwrap();
        let found = select_update(&json, "1.9.0").expect("older build should update");
        assert_eq!(found.latest, "2.0.0");
        assert_eq!(found.current, "1.9.0");
        assert_eq!(found.size, 15_508_992);
        assert_eq!(found.sha256.as_deref(), Some("afba59b6c0ffee"));
        assert!(found.download_url.ends_with("Ultra.Mimic.exe"));
    }

    #[test]
    fn release_without_exe_is_ignored() {
        let json: serde_json::Value = serde_json::from_str(
            r#"{"tag_name": "Ultra_Mimic_v9.9.9", "assets": [{"name": "notes.txt"}]}"#,
        )
        .unwrap();
        assert!(select_update(&json, "2.2.2").is_none());
    }

    #[test]
    fn tag_versions_are_parsed() {
        assert_eq!(version_from_tag("Ultra_Mimic_v2.0.0"), "2.0.0");
        assert_eq!(version_from_tag("Ultra-Mimic-2.1.3"), "2.1.3");
        assert_eq!(version_from_tag("v2.2.2"), "2.2.2");
        assert_eq!(version_from_tag("2.2.2"), "2.2.2");
    }

    #[test]
    fn newer_version_detection() {
        assert!(is_newer_version("2.3.0", "2.2.2"));
        assert!(is_newer_version("2.2.3", "2.2.2"));
        assert!(is_newer_version("3.0.0", "2.9.9"));
        assert!(is_newer_version("2.2.2.1", "2.2.2"));
        assert!(!is_newer_version("2.2.2", "2.2.2"));
        assert!(!is_newer_version("2.0.0", "2.2.2"));
        assert!(!is_newer_version("2.2", "2.2.0"));
    }

    #[test]
    fn helper_quotes_paths() {
        let script = build_helper(
            Path::new("C:\\Users\\Иван\\Ultra Mimic.exe"),
            Path::new("C:\\Temp\\it's update.exe"),
        );
        assert!(script.contains("'C:\\Users\\Иван\\Ultra Mimic.exe'"));
        assert!(script.contains("'C:\\Temp\\it''s update.exe'"));
        // Copied next to the target first, so a failed swap never loses the exe.
        assert!(script.contains("Copy-Item -LiteralPath $new -Destination $stage"));
        assert!(script.contains("Move-Item -LiteralPath $stage -Destination $target"));
    }
}