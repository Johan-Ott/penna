use tauri::WebviewWindowBuilder;

// The window is made here: on Windows without a frame, so llkit's window buttons end the app's
// top bar; a Mac keeps its own buttons over it.
fn open_window(app: &tauri::App) -> tauri::Result<()> {
    let config = app.config().app.windows[0].clone();
    let builder = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    #[cfg(all(desktop, not(target_os = "macos")))]
    let builder = builder.decorations(false);
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
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
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build());
    builder
        .setup(|app| Ok(open_window(app)?))
        .run(tauri::generate_context!())
        .expect("error while running __APP_NAME__");
}
