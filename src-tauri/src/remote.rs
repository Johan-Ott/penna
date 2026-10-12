//! "Styr Penna från den här datorn", for one start at a time: turning it on leaves a file in
//! Penna's own folder, and the next start takes the file away as it opens the WebView on port
//! 9334 for scripts/penna.mjs. Only this computer can reach the port, and the app says it is open.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

pub const PORT_ARG: &str = "--remote-debugging-port=9334";

static IS_OPEN: AtomicBool = AtomicBool::new(false);

fn flag(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("remote-control"))
}

/// True once, at the start after it was turned on; the file is gone afterwards.
pub fn take(app: &tauri::AppHandle) -> bool {
    let is_asked = flag(app).is_some_and(|path| std::fs::remove_file(path).is_ok());
    IS_OPEN.store(is_asked, Ordering::Relaxed);
    is_asked
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteState {
    /// The port is open now, for this start.
    is_open: bool,
    /// It opens at the next start.
    is_next: bool,
}

/// Asks for the next start, or takes that back; with no value it only says how it stands.
#[tauri::command]
pub fn remote_control(app: tauri::AppHandle, turn_on: Option<bool>) -> Result<RemoteState, String> {
    let path = flag(&app).ok_or("Pennas mapp hittas inte")?;
    match turn_on {
        Some(true) => {
            std::fs::create_dir_all(path.parent().unwrap_or(&path)).map_err(|e| e.to_string())?;
            std::fs::write(&path, "").map_err(|e| e.to_string())?;
        }
        Some(false) if path.exists() => std::fs::remove_file(&path).map_err(|e| e.to_string())?,
        _ => {}
    }
    Ok(RemoteState {
        is_open: IS_OPEN.load(Ordering::Relaxed),
        is_next: path.exists(),
    })
}
