mod backups;
mod books;
mod google;

use tauri::WebviewWindowBuilder;
#[cfg(desktop)]
use {
    std::path::PathBuf,
    tauri::{AppHandle, Manager, State},
};

// WebView2 picks its spelling dictionary when the window starts, so the open book's language is
// remembered here and the window starts with it. tauri.conf.json has the window with create: false.
#[cfg(desktop)]
const DEFAULT_LANGUAGE: &str = "sv-SE";
#[cfg(desktop)]
const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

#[cfg(desktop)]
struct SpellLanguage(String);

#[cfg(desktop)]
fn language_file(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("spell-language.txt"))
}

// Only tags like "sv-SE" become a browser argument.
#[cfg(desktop)]
fn is_language_tag(text: &str) -> bool {
    let bytes = text.as_bytes();
    bytes.len() == 5
        && bytes[..2].iter().all(u8::is_ascii_lowercase)
        && bytes[2] == b'-'
        && bytes[3..].iter().all(u8::is_ascii_uppercase)
}

#[cfg(desktop)]
fn saved_language(app: &AppHandle) -> String {
    language_file(app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .map(|text| text.trim().to_string())
        .filter(|text| is_language_tag(text))
        .unwrap_or_else(|| DEFAULT_LANGUAGE.to_string())
}

/// Remembers the book's language and restarts when the window was started with another one.
/// A phone's keyboard checks the spelling itself, so there it does nothing.
#[cfg(mobile)]
#[tauri::command]
fn set_spell_language(_language: String) -> Result<(), String> {
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn set_spell_language(
    app: AppHandle,
    current: State<SpellLanguage>,
    language: String,
) -> Result<(), String> {
    if !is_language_tag(&language) || language == current.0 {
        return Ok(());
    }
    let path = language_file(&app).ok_or("Ingen inställningsmapp")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    }
    std::fs::write(&path, &language).map_err(|error| error.to_string())?;
    app.restart();
}

// The window is made here rather than from tauri.conf.json: on a computer it starts with the
// book's spelling language, on a phone as the system makes it.
fn open_window(app: &tauri::App) -> tauri::Result<()> {
    let config = app.config().app.windows[0].clone();
    let builder = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    #[cfg(desktop)]
    let builder = {
        let language = saved_language(app.handle());
        app.manage(SpellLanguage(language.clone()));
        builder.additional_browser_args(&format!("{BROWSER_ARGS} --lang={language}"))
    };
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            set_spell_language,
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
            set_spell_language,
            books::remove_book,
            backups::remove_backup,
            google::google_access_token
        ]);
    builder
        .setup(|app| Ok(open_window(app)?))
        .run(tauri::generate_context!())
        .expect("error while running Penna");
}
