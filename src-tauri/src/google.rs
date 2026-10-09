//! Google sign-in for Drive sync. Computer: browser plus a local redirect, the refresh token in the
//! system's password store. Android: Google Play's authorization API.

#[cfg(desktop)]
mod desktop {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::time::{Duration, Instant};
    use tauri::{AppHandle, Manager};
    use tauri_plugin_opener::OpenerExt;

    const KEYRING_USER: &str = "google-drive";
    const WAIT: Duration = Duration::from_secs(300);
    const DONE_PAGE: &str = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n\
        <!doctype html><title>Penna</title><p style=\"font:18px sans-serif;margin:3em\">\
        Klart, Penna är kopplad till Google Drive. Du kan stänga fliken.</p>";

    #[derive(serde::Serialize)]
    pub struct BrowserAnswer {
        redirect: String,
        query: String,
    }

    // The first line of the browser's request is "GET /?code=...&state=... HTTP/1.1".
    fn query_of(request: &str) -> String {
        let path = request.split_whitespace().nth(1).unwrap_or("");
        path.split_once('?')
            .map(|(_, query)| query.to_string())
            .unwrap_or_default()
    }

    // Polls instead of blocking, so an abandoned sign-in ends after WAIT.
    fn answer_once(listener: &TcpListener) -> Result<String, String> {
        listener
            .set_nonblocking(true)
            .map_err(|error| error.to_string())?;
        let start = Instant::now();
        loop {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    stream
                        .set_nonblocking(false)
                        .map_err(|error| error.to_string())?;
                    let mut buffer = [0u8; 8192];
                    let size = stream
                        .read(&mut buffer)
                        .map_err(|error| error.to_string())?;
                    let _ = stream.write_all(DONE_PAGE.as_bytes());
                    return Ok(query_of(&String::from_utf8_lossy(&buffer[..size])));
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    if start.elapsed() > WAIT {
                        return Err("Inloggningen tog för lång tid".into());
                    }
                    std::thread::sleep(Duration::from_millis(200));
                }
                Err(error) => return Err(error.to_string()),
            }
        }
    }

    /// `{redirect}` in `url` becomes the local redirect address. Returns it and Google's query.
    #[tauri::command]
    pub async fn sign_in_in_browser(app: AppHandle, url: String) -> Result<BrowserAnswer, String> {
        let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| error.to_string())?;
        let port = listener
            .local_addr()
            .map_err(|error| error.to_string())?
            .port();
        let redirect = format!("http://127.0.0.1:{port}");
        let page = url.replace("{redirect}", &format!("http%3A%2F%2F127.0.0.1%3A{port}"));
        app.opener()
            .open_url(page, None::<&str>)
            .map_err(|error| error.to_string())?;
        let query = tauri::async_runtime::spawn_blocking(move || answer_once(&listener))
            .await
            .map_err(|error| error.to_string())??;
        // Bring Penna back in front after the browser.
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        Ok(BrowserAnswer { redirect, query })
    }

    // Kept under the app's identifier, so the test build never sees the real sign-in.
    fn entry(app: &AppHandle) -> Result<keyring::Entry, String> {
        keyring::Entry::new(&app.config().identifier, KEYRING_USER)
            .map_err(|error| error.to_string())
    }

    #[tauri::command]
    pub fn saved_google_key(app: AppHandle) -> Option<String> {
        entry(&app).ok()?.get_password().ok()
    }

    /// `None` forgets the key.
    #[tauri::command]
    pub fn save_google_key(app: AppHandle, key: Option<String>) -> Result<(), String> {
        let entry = entry(&app)?;
        match key {
            Some(key) => entry.set_password(&key).map_err(|error| error.to_string()),
            None => match entry.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                Err(error) => Err(error.to_string()),
            },
        }
    }
}

#[cfg(desktop)]
pub use desktop::*;

#[cfg(mobile)]
mod mobile {
    use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
    use tauri::{Manager, State, Wry};

    pub struct GoogleSignIn(PluginHandle<Wry>);

    #[derive(serde::Deserialize)]
    struct Token {
        token: String,
    }

    /// The Kotlin side, src-tauri/android/GoogleSignInPlugin.kt.
    pub fn init() -> TauriPlugin<Wry> {
        Builder::new("google-sign-in")
            .setup(|app, api| {
                // iPad gets its own sign-in later; until then it has none.
                #[cfg(target_os = "android")]
                app.manage(GoogleSignIn(
                    api.register_android_plugin("se.penna.app", "GoogleSignInPlugin")?,
                ));
                let _ = (app, api);
                Ok(())
            })
            .build()
    }

    /// Without `interactive` it fails rather than show Google's account and consent screen.
    #[tauri::command]
    pub async fn google_access_token(
        sign_in: State<'_, GoogleSignIn>,
        interactive: bool,
    ) -> Result<String, String> {
        let payload = serde_json::json!({ "interactive": interactive });
        let answer: Token = sign_in
            .0
            .run_mobile_plugin_async("authorize", payload)
            .await
            .map_err(|error| error.to_string())?;
        Ok(answer.token)
    }
}

#[cfg(mobile)]
pub use mobile::*;
