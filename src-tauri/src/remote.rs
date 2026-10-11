//! "Styr Penna från den här datorn": a file in Penna's own folder says so, and the next start
//! opens the WebView on port 9334 for scripts/penna.mjs. Only this computer can reach it.

use std::path::PathBuf;
use tauri::Manager;

pub const PORT_ARG: &str = "--remote-debugging-port=9334";

fn flag(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join("remote-control"))
}

pub fn is_on(app: &tauri::AppHandle) -> bool {
    flag(app).is_some_and(|path| path.exists())
}

/// Turns it on or off from the next start; with no value it only says how it stands.
#[tauri::command]
pub fn remote_control(app: tauri::AppHandle, turn_on: Option<bool>) -> Result<bool, String> {
    let path = flag(&app).ok_or("Pennas mapp hittas inte")?;
    match turn_on {
        Some(true) => {
            std::fs::create_dir_all(path.parent().unwrap_or(&path)).map_err(|e| e.to_string())?;
            std::fs::write(&path, "").map_err(|e| e.to_string())?;
        }
        Some(false) if path.exists() => std::fs::remove_file(&path).map_err(|e| e.to_string())?,
        _ => {}
    }
    Ok(path.exists())
}
