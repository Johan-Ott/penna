// A line for the start picture, shown only when the start takes a while: a tip about Skrivro or
// about writing, in the language the writer chose. It runs before the app, so it has its own texts.
(function () {
  var SWEDISH = [
    "Tips: Ctrl+K öppnar paletten. Där finns allt Skrivro kan.",
    "Tips: Ctrl+Shift+F ger fokusläge, bara du och texten.",
    "Tips: läs upp texten med Ctrl+Shift+U. Örat hittar det ögat missar.",
    "Skrivro sparar inom en sekund. Du kan släppa den oron.",
    "Ett dåligt första utkast går att göra bättre. Ett tomt blad går inte.",
    "Skriv först, putsa sen.",
    "Sluta dagen mitt i en mening, så vet du var du börjar i morgon.",
    "Namnen i dina anteckningar blir länkar i texten.",
    "Granska hittar ord som upprepas för nära varandra.",
    "Vässar skrivron…",
    "Letar efter rätt ord…",
  ];
  var ENGLISH = [
    "Tip: Ctrl+K opens the palette. Everything Skrivro does is there.",
    "Tip: Ctrl+Shift+F gives focus mode, just you and the text.",
    "Tip: read the text aloud with Ctrl+Shift+U. The ear finds what the eye misses.",
    "Skrivro saves within a second. You can let that worry go.",
    "A bad first draft can be made better. A blank page cannot.",
    "Write first, polish later.",
    "End the day in the middle of a sentence, and you know where to begin tomorrow.",
    "The names in your notes become links in the text.",
    "Review finds words repeated too close together.",
    "Sharpening the pen…",
    "Looking for the right word…",
  ];
  var language = "sv";
  try {
    language =
      JSON.parse(globalThis.localStorage.getItem("skrivro.app") || "{}").uiLanguage || "sv";
  } catch {
    language = "sv";
  }
  var tips = language === "en" ? ENGLISH : SWEDISH;
  var tip = tips[Math.floor(Math.random() * tips.length)];
  if (/Mac|iPhone|iPad/.test(globalThis.navigator.platform)) tip = tip.replace(/Ctrl/g, "Cmd");
  var line = globalThis.document.getElementById("boot-tip");
  if (line) line.textContent = tip;
})();
