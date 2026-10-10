//! Sharing on a phone: the file is written to Penna's cache and handed to Android's share sheet
//! by src-tauri/android/SharePlugin.kt, so it can be sent on or saved to Files or Drive.

use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::{AppHandle, Manager, State, Wry};

pub struct Share(PluginHandle<Wry>);

pub fn init() -> TauriPlugin<Wry> {
    Builder::new("share")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            app.manage(Share(
                api.register_android_plugin("se.penna.app", "SharePlugin")?,
            ));
            let _ = (app, api);
            Ok(())
        })
        .build()
}

/// The file's bytes as a list: a phone's bridge carries no raw body, unlike the computer's.
#[tauri::command]
pub fn share_file(
    app: AppHandle,
    share: State<'_, Share>,
    name: String,
    mime: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("dela");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(if name.is_empty() {
        "Penna".into()
    } else {
        name
    });
    std::fs::write(&path, bytes).map_err(|error| error.to_string())?;
    let payload = serde_json::json!({ "path": path, "mime": mime });
    share
        .0
        .run_mobile_plugin::<()>("share", payload)
        .map_err(|error| error.to_string())
}
