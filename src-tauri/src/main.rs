#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use tauri::{AppHandle, Manager, State, WebviewWindowBuilder};

// WebView2 picks its spelling dictionary when the window starts, so the open book's language is
// remembered here and the window starts with it. tauri.conf.json has the window with create: false.
const DEFAULT_LANGUAGE: &str = "sv-SE";
const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

struct SpellLanguage(String);

fn language_file(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("spell-language.txt"))
}

// Only tags like "sv-SE" become a browser argument.
fn is_language_tag(text: &str) -> bool {
    let bytes = text.as_bytes();
    bytes.len() == 5
        && bytes[..2].iter().all(u8::is_ascii_lowercase)
        && bytes[2] == b'-'
        && bytes[3..].iter().all(u8::is_ascii_uppercase)
}

fn saved_language(app: &AppHandle) -> String {
    language_file(app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .map(|text| text.trim().to_string())
        .filter(|text| is_language_tag(text))
        .unwrap_or_else(|| DEFAULT_LANGUAGE.to_string())
}

/// Remembers the book's language and restarts when the window was started with another one.
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        // Remembers folders picked in the dialog, so the last project opens after a restart.
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![set_spell_language])
        .setup(|app| {
            let language = saved_language(app.handle());
            let config = app.config().app.windows[0].clone();
            WebviewWindowBuilder::from_config(app.handle(), &config)?
                .additional_browser_args(&format!("{BROWSER_ARGS} --lang={language}"))
                .build()?;
            app.manage(SpellLanguage(language));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Penna");
}
