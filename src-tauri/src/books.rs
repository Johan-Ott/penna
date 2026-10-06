//! Removing a book the writer chose to remove: to the system's trash on a computer, so it can be
//! put back; on a phone, which has no trash, only from inside Penna's own folder.

/// Moves a book's folder to the Recycle Bin or the Trash.
#[cfg(desktop)]
#[tauri::command]
pub fn remove_book(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|error| error.to_string())
}

/// Deletes a book's folder, but only one inside Penna's own folder.
#[cfg(mobile)]
#[tauri::command]
pub fn remove_book(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri::Manager;
    let own = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let target = std::path::Path::new(&path);
    if !target.starts_with(&own) || target == own {
        return Err("Boken ligger inte i Pennas egen mapp".into());
    }
    std::fs::remove_dir_all(target).map_err(|error| error.to_string())
}
