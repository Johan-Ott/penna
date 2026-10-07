//! Penna's own spelling check, the same on every device: Hunspell dictionaries read by spellbook.
//! Swedish and British English are built in; another language is handed over once it is fetched.

use spellbook::Dictionary;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

#[derive(Default)]
pub struct Dictionaries(Mutex<HashMap<String, Dictionary>>);

fn built_in(language: &str) -> Option<(&'static str, &'static str)> {
    match language {
        "sv-SE" => Some((
            include_str!("../dictionaries/sv-SE.aff"),
            include_str!("../dictionaries/sv-SE.dic"),
        )),
        "en-GB" => Some((
            include_str!("../dictionaries/en-GB.aff"),
            include_str!("../dictionaries/en-GB.dic"),
        )),
        _ => None,
    }
}

// A built-in dictionary is read the first time its language is asked for.
fn with_dictionary<T>(
    dictionaries: &Dictionaries,
    language: &str,
    use_it: impl FnOnce(&Dictionary) -> T,
) -> Result<T, String> {
    let mut loaded = dictionaries.0.lock().map_err(|error| error.to_string())?;
    if !loaded.contains_key(language) {
        let (aff, dic) = built_in(language).ok_or("Ingen ordlista för språket")?;
        let dictionary = Dictionary::new(aff, dic).map_err(|error| error.to_string())?;
        loaded.insert(language.to_string(), dictionary);
    }
    Ok(use_it(&loaded[language]))
}

/// The words the dictionary does not know, out of a whole paragraph's or scene's at once.
#[tauri::command]
pub async fn misspelled_words(
    dictionaries: State<'_, Dictionaries>,
    language: String,
    words: Vec<String>,
) -> Result<Vec<String>, String> {
    with_dictionary(&dictionaries, &language, |dictionary| {
        words.into_iter().filter(|word| !dictionary.check(word)).collect()
    })
}

#[tauri::command]
pub async fn spelling_suggestions(
    dictionaries: State<'_, Dictionaries>,
    language: String,
    word: String,
) -> Result<Vec<String>, String> {
    with_dictionary(&dictionaries, &language, |dictionary| {
        let mut suggestions = Vec::new();
        dictionary.suggest(&word, &mut suggestions);
        suggestions.truncate(6);
        suggestions
    })
}

/// A language that is not built in, fetched by the app and handed over as its two files.
#[tauri::command]
pub async fn add_dictionary(
    dictionaries: State<'_, Dictionaries>,
    language: String,
    aff: String,
    dic: String,
) -> Result<(), String> {
    let dictionary = Dictionary::new(&aff, &dic).map_err(|error| error.to_string())?;
    let mut loaded = dictionaries.0.lock().map_err(|error| error.to_string())?;
    loaded.insert(language, dictionary);
    Ok(())
}
