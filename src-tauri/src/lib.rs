mod backups;
mod books;
mod google;
mod spelling;

use tauri::WebviewWindowBuilder;

#[cfg(desktop)]
const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

// The window is made here rather than from tauri.conf.json, so a computer's WebView2 starts
// without Edge's own popups.
fn open_window(app: &tauri::App) -> tauri::Result<()> {
    let config = app.config().app.windows[0].clone();
    let builder = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    #[cfg(desktop)]
    let builder = builder.additional_browser_args(BROWSER_ARGS);
    builder.build()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init());
    // Remembers folders picked in the dialog, so the last project opens after a restart, and
    // takes updates as signed releases on GitHub.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            spelling::misspelled_words,
            spelling::spelling_suggestions,
            spelling::add_dictionary,
            books::remove_book,
            backups::remove_backup,
            google::sign_in_in_browser,
            google::saved_google_key,
            google::save_google_key
        ]);
    #[cfg(mobile)]
    let builder = builder
        .plugin(google::init())
        .invoke_handler(tauri::generate_handler![
            spelling::misspelled_words,
            spelling::spelling_suggestions,
            spelling::add_dictionary,
            books::remove_book,
            backups::remove_backup,
            google::google_access_token
        ]);
    builder
        .manage(spelling::Dictionaries::default())
        .setup(|app| Ok(open_window(app)?))
        .run(tauri::generate_context!())
        .expect("error while running Penna");
}
