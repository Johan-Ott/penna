//! Penna's own spelling check, the same on every device: Hunspell dictionaries read by spellbook.
//! Each is fetched the first time it is chosen or a book needs it, at a fixed version, and kept in
//! Penna's own folder, so the app itself carries none. Finnish has none.

use spellbook::Dictionary;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_http::reqwest;

#[derive(Default)]
pub struct Dictionaries(Mutex<HashMap<String, Dictionary>>);

// npm packages never change once published, so a version names exactly one dictionary.
const FETCHED: [(&str, &str); 5] = [
    ("sv-SE", "dictionary-sv@4.0.0"),
    ("en-GB", "dictionary-en-gb@3.0.0"),
    ("da-DK", "dictionary-da@6.0.0"),
    ("nb-NO", "dictionary-nb@3.0.0"),
    ("de-DE", "dictionary-de@3.0.0"),
];

/// A file of an npm package at a fixed version, from jsDelivr, which serves them for free.
pub async fn fetch_bytes(package: &str, file: &str) -> Result<Vec<u8>, String> {
    let url = format!("https://cdn.jsdelivr.net/npm/{package}/{file}");
    let response = reqwest::get(url).await.map_err(|error| error.to_string())?;
    let response = response
        .error_for_status()
        .map_err(|error| error.to_string())?;
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    Ok(bytes.to_vec())
}

async fn fetch(package: &str, file: &str) -> Result<String, String> {
    String::from_utf8(fetch_bytes(package, file).await?).map_err(|error| error.to_string())
}

// Kept once fetched, so the spelling works without the web from then on.
async fn fetched_files(app: &AppHandle, language: &str) -> Result<(String, String), String> {
    let (_, package) = FETCHED
        .iter()
        .find(|(tag, _)| *tag == language)
        .ok_or("Ingen ordlista för språket")?;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("ordlistor");
    let aff_path = dir.join(format!("{language}.aff"));
    let dic_path = dir.join(format!("{language}.dic"));
    if let (Ok(aff), Ok(dic)) = (
        std::fs::read_to_string(&aff_path),
        std::fs::read_to_string(&dic_path),
    ) {
        return Ok((aff, dic));
    }
    let aff = fetch(package, "index.aff").await?;
    let dic = fetch(package, "index.dic").await?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    std::fs::write(&aff_path, &aff).map_err(|error| error.to_string())?;
    std::fs::write(&dic_path, &dic).map_err(|error| error.to_string())?;
    Ok((aff, dic))
}

// Hunspell skips a line it cannot read, such as Danish "A/S", where spellbook stops; so the
// line it names is left out and the rest read again.
fn read_leniently(aff: &str, dic: &str) -> Result<Dictionary, String> {
    let mut lines: Vec<&str> = dic.lines().collect();
    for _ in 0..50 {
        let error = match Dictionary::new(aff, &lines.join("\n")) {
            Ok(dictionary) => return Ok(dictionary),
            Err(error) => error.to_string(),
        };
        match bad_line(&error) {
            Some(line) if line >= 1 && line <= lines.len() => lines.remove(line - 1),
            _ => return Err(error),
        };
    }
    Err("Ordlistan har för många trasiga rader".to_string())
}

fn bad_line(error: &str) -> Option<usize> {
    let rest = &error[error.find("on line ")? + "on line ".len()..];
    rest.split(':').next()?.trim().parse().ok()
}

async fn ensure(
    app: &AppHandle,
    dictionaries: &Dictionaries,
    language: &str,
) -> Result<(), String> {
    if dictionaries
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .contains_key(language)
    {
        return Ok(());
    }
    let (aff, dic) = fetched_files(app, language).await?;
    let dictionary = read_leniently(&aff, &dic)?;
    let mut loaded = dictionaries.0.lock().map_err(|error| error.to_string())?;
    loaded.entry(language.to_string()).or_insert(dictionary);
    Ok(())
}

fn with_dictionary<T>(
    dictionaries: &Dictionaries,
    language: &str,
    use_it: impl FnOnce(&Dictionary) -> T,
) -> Result<T, String> {
    let loaded = dictionaries.0.lock().map_err(|error| error.to_string())?;
    let dictionary = loaded.get(language).ok_or("Ingen ordlista för språket")?;
    Ok(use_it(dictionary))
}

/// The words the dictionary does not know, out of a whole scene's at once.
#[tauri::command]
pub async fn misspelled_words(
    app: AppHandle,
    dictionaries: State<'_, Dictionaries>,
    language: String,
    words: Vec<String>,
) -> Result<Vec<String>, String> {
    ensure(&app, &dictionaries, &language).await?;
    with_dictionary(&dictionaries, &language, |dictionary| {
        words
            .into_iter()
            .filter(|word| !dictionary.check(word))
            .collect()
    })
}

#[tauri::command]
pub async fn spelling_suggestions(
    app: AppHandle,
    dictionaries: State<'_, Dictionaries>,
    language: String,
    word: String,
) -> Result<Vec<String>, String> {
    ensure(&app, &dictionaries, &language).await?;
    with_dictionary(&dictionaries, &language, |dictionary| {
        let mut suggestions = Vec::new();
        dictionary.suggest(&word, &mut suggestions);
        suggestions.truncate(6);
        suggestions
    })
}

/// Fetches the language's dictionary now, as the first start does for the languages chosen.
#[tauri::command]
pub async fn prepare_dictionary(
    app: AppHandle,
    dictionaries: State<'_, Dictionaries>,
    language: String,
) -> Result<(), String> {
    ensure(&app, &dictionaries, &language).await
}
