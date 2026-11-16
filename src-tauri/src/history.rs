use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Serialises every read-modify-write of `history.json`.
///
/// The spoofer records a finished batch from its own task while the UI can
/// return games to the pool or import a history file at the same moment. Two
/// concurrent `load -> change -> save` cycles would otherwise keep only the
/// last write, silently dropping the other change. Reads stay lock-free: a save
/// swaps the file in atomically, so a reader always sees a complete copy.
static HISTORY_LOCK: Mutex<()> = Mutex::new(());

fn lock_history() -> std::sync::MutexGuard<'static, ()> {
    // A panic while holding the lock must not turn every later history call
    // into an error: the data on disk is still valid.
    HISTORY_LOCK.lock().unwrap_or_else(|poison| poison.into_inner())
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SpoofHistory {
    pub played_ids: HashSet<String>,
}

/// Per-user data folder for Ultra Mimic (history, cached game database).
pub fn get_app_dir() -> PathBuf {
    #[cfg(windows)]
    let base_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir());

    #[cfg(target_os = "macos")]
    let base_dir = std::env::var("HOME")
        .map(|h| PathBuf::from(h).join("Library").join("Application Support"))
        .unwrap_or_else(|_| std::env::temp_dir());

    #[cfg(all(not(windows), not(target_os = "macos")))]
    let base_dir = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join(".config")))
        .unwrap_or_else(|_| std::env::temp_dir());

    let app_dir = base_dir.join("Ultra Mimic");
    let _ = fs::create_dir_all(&app_dir);
    migrate_legacy_data(&base_dir, &app_dir);
    app_dir
}

/// Copies history and the games cache from the old "mimic" folder once, so a
/// rename does not reset progress. The legacy folder itself is left untouched.
fn migrate_legacy_data(base_dir: &std::path::Path, app_dir: &std::path::Path) {
    let legacy = base_dir.join("mimic");
    if !legacy.is_dir() {
        return;
    }
    for file in ["history.json", "games_cache.json"] {
        let source = legacy.join(file);
        let target = app_dir.join(file);
        if source.is_file() && !target.exists() {
            let _ = fs::copy(&source, &target);
        }
    }
}

pub fn get_history_path() -> PathBuf {
    get_app_dir().join("history.json")
}

pub fn load_history() -> HashSet<String> {
    let path = get_history_path();
    if !path.exists() {
        return HashSet::new();
    }

    if let Some(ids) = read_history_file(&path) {
        return ids;
    }

    // A damaged file must never silently restart every game: fall back to the
    // last good copy that save_history keeps next to it.
    let backup = path.with_extension("json.bak");
    match read_history_file(&backup) {
        Some(ids) => {
            let _ = fs::copy(&backup, &path);
            ids
        }
        None => HashSet::new(),
    }
}

fn read_history_file(path: &std::path::Path) -> Option<HashSet<String>> {
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<SpoofHistory>(&data)
        .ok()
        .map(|hist| hist.played_ids)
}

pub fn save_history(played_ids: &HashSet<String>) -> Result<(), String> {
    let path = get_history_path();
    let hist = SpoofHistory {
        played_ids: played_ids.clone(),
    };
    let json = serde_json::to_string_pretty(&hist).map_err(|e| e.to_string())?;

    // Never truncate the real file in place: write a temp copy first and swap
    // it in. A crash in the middle then leaves the previous history intact.
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, &json).map_err(|e| e.to_string())?;

    let backup = path.with_extension("json.bak");
    if path.exists() {
        let _ = fs::copy(&path, &backup);
    }

    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn record_played_batch(new_ids: &[String]) {
    let _guard = lock_history();
    let mut current = load_history();
    let before = current.len();
    for id in new_ids {
        current.insert(id.clone());
    }
    // Only touch the file when something actually changed: a repeated batch
    // must not rewrite the history (and race with nothing at all).
    if current.len() != before {
        let _ = save_history(&current);
    }
}

/// Puts the given ids back into the pool. Serialised against recording and
/// importing, so a game finished at the same moment is not lost.
pub fn remove_history_ids(ids: &[String]) -> Result<usize, String> {
    let _guard = lock_history();
    let mut current = load_history();
    let before = current.len();
    for id in ids {
        current.remove(id);
    }
    let removed = before - current.len();
    if removed > 0 {
        save_history(&current)?;
    }
    Ok(removed)
}

/// Adds imported ids to the existing history. Serialised like the other
/// read-modify-write operations.
pub fn merge_history_ids(ids: impl IntoIterator<Item = String>) -> Result<usize, String> {
    let _guard = lock_history();
    let mut current = load_history();
    let before = current.len();
    for id in ids {
        current.insert(id);
    }
    let added = current.len() - before;
    if added > 0 {
        save_history(&current)?;
    }
    Ok(added)
}

pub fn clear_history() -> Result<(), String> {
    let _guard = lock_history();
    let path = get_history_path();
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    // Drop the recovery copies too, otherwise a later load would restore them.
    let _ = fs::remove_file(path.with_extension("json.bak"));
    let _ = fs::remove_file(path.with_extension("json.tmp"));
    Ok(())
}
