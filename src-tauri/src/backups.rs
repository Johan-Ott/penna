//! The automatic copies of each book live in Penna's own folder, under backups/. Penna never
//! deletes the writer's files; this only removes old copies, and only inside that folder.

use tauri::Manager;

/// Deletes one old copy: a .zip file inside backups/ in Penna's own folder, nothing else.
#[tauri::command]
pub fn remove_backup(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let own = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("backups");
    // The app writes paths with forward slashes; compare them as the system writes them.
    let target = std::path::PathBuf::from(path.replace('/', std::path::MAIN_SEPARATOR_STR));
    let is_copy = target
        .extension()
        .is_some_and(|extension| extension == "zip");
    if !target.starts_with(&own)
        || !is_copy
        || target.components().any(|part| part.as_os_str() == "..")
    {
        return Err("Det är ingen säkerhetskopia i Pennas egen mapp".into());
    }
    std::fs::remove_file(&target).map_err(|error| error.to_string())
}
