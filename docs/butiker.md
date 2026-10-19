# Butikerna och Google-inloggningen

Allt som behövs för att Penna ska kunna släppas till alla: Google Play, Microsoft Store och
Googles inloggning i produktion. Texterna nedan klistras in som de står.

## Google-inloggningen (Google Cloud Console)

Penna ber bara om `drive.file`: filer som Penna själv skapat. Det är ett icke-känsligt scope,
så ingen säkerhetsgranskning krävs, bara varumärkesverifiering.

- **OAuth consent screen → Publishing status:** Testing → **In production**.
- **App name:** Penna
- **User support email och Developer contact:** johan.lonelodge@gmail.com
- **App logo:** `site/penna-logo.png` (120 × 120 px eller större, kvadratisk)
- **Application home page:** https://johan-ott.github.io/penna/
- **Privacy policy:** https://johan-ott.github.io/penna/integritet.html
- **Terms of service:** https://johan-ott.github.io/penna/villkor.html
- **Authorized domains:** `johan-ott.github.io`. Domänen verifieras i Google Search Console
  med en HTML-tagg i `site/index.html`.
- **Scopes:** endast `.../auth/drive.file`.
- **Android-klienten:** OAuth-klienten av typen Android ska ha SHA-1 för **både** Pennas egen
  nyckel och Play-signeringen om Play signerar om appen (se Google Play nedan). Annars fungerar
  inloggningen inte i appen från Play.

## Google Play (Play Console)

### Fil och signering

- Bygg: `npm run build:android -- --play` → `out/Penna.aab`.
- **App signing:** välj att ladda upp Pennas egen nyckel (`~/.penna/penna-release.jks`) som
  appens signeringsnyckel. Då har appen från Play och APK:n från webbplatsen samma signatur, och
  en telefon kan byta mellan dem utan att avinstallera. Väljer Play en egen nyckel måste dess
  SHA-1 läggas till i Google Cloud (se ovan), och webbplatsens APK och Play-appen kan inte
  uppdatera varandra.
- **Nya privatkonton:** ett **stängt test med minst 12 testare i 14 dagar** krävs innan appen
  får släppas i produktion.

### Butikstexter

**Appens namn:** Penna: skriv din bok

**Kort beskrivning (sv, högst 80 tecken):**
Skriv din bok i lugn och ro, från första idé till färdigt manus och e-bok.

**Short description (en, max 80 characters):**
Write your book in peace, from the first idea to a finished manuscript and e-book.

**Fullständig beskrivning (sv):**

Penna är ett skrivprogram för dig som skriver böcker. Lugnt, svenskt och utan konto.

Skriv

- En lugn skrivyta med fokusläge, skrivmaskinsläge och mål för dagen.
- Kapitel och scener i ett träd som du flyttar runt med fingret.
- Stavningskontroll och upprepningar markerade medan du skriver.

Håll ordning

- Anteckningar om personer, platser och saker, kopplade till namnen i texten.
- Hemligheter: vem vet vad, och när får läsaren veta.
- Versioner av varje scen och säkerhetskopior av hela boken.

Gör klart

- Granska med kommentarer och förslag, som en redaktör.
- Exportera som standardmanus, e-bok (EPUB), tryck-PDF med omslag, Word, Markdown eller webbsida.
- Synopsis och följebrev till förlag, och en lista över dina inskick.

Dina texter är dina

- Böckerna ligger på din telefon. Penna samlar inte in något.
- Vill du ha dem på flera enheter synkar Penna via din egen Google Drive.

Penna finns även för Windows och är gratis under betan.

**Full description (en):**

Penna is a writing app for people who write books. Calm, simple and with no account.

Write

- A calm page with focus mode, typewriter mode and a goal for the day.
- Chapters and scenes in a tree you rearrange with your finger.
- Spelling and repeated words marked as you write.

Stay organised

- Notes on people, places and things, linked to the names in your text.
- Secrets: who knows what, and when the reader finds out.
- Versions of every scene and backups of the whole book.

Finish it

- Review with comments and suggestions, like an editor.
- Export as a standard manuscript, e-book (EPUB), print PDF with cover, Word, Markdown or a web page.
- Synopsis and cover letter for publishers, and a list of your submissions.

Your writing is yours

- Your books stay on your phone. Penna collects nothing.
- If you want them on several devices, Penna syncs through your own Google Drive.

Penna is also available for Windows and is free during the beta.

### Övrigt i Play Console

- **Kategori:** Produktivitet. **Taggar:** Skrivande, Anteckningar, Dokument.
- **Kontakt:** johan.lonelodge@gmail.com, webbplats https://johan-ott.github.io/penna/
- **Integritetspolicy:** https://johan-ott.github.io/penna/integritet.html
- **Annonser:** Nej.
- **Appåtkomst:** Alla funktioner finns utan inloggning (inloggning behövs bara för synk).
- **Innehållsklassning (IARC):** Verktyg/produktivitet; inget våld, inga köp, ingen chatt
  mellan användare, ingen platsdelning → Alla / PEGI 3.
- **Målgrupp:** 13 år och äldre (Penna är inte gjord för barn, och Google-inloggning kräver 13).
- **Nyhetsappar, statliga appar, hälsa, finans:** Nej.

### Datasäkerhet (Data safety)

- **Samlar appen in eller delar användardata?** Nej.
  - Böckerna sparas på enheten. Synk skickar dem till användarens egen Google Drive, på
    användarens eget val och med användarens eget konto; Penna har ingen server och ser dem inte.
  - Felrapporter skickas bara när användaren själv mejlar dem.
- **Krypteras data under överföring?** Ja (HTTPS till Google Drive).
- **Kan användaren be om att data raderas?** Data finns bara på enheten och i användarens
  egen Drive; användaren raderar den själv.

## Microsoft Store (Partner Center)

- När appen är reserverad: **Product management → Product identity**. Där står de fyra
  värdena som ska in i `src-tauri/store.json`: Package/Identity/Name → `identityName`,
  Package/Identity/Publisher → `publisher`, Package/Properties/PublisherDisplayName →
  `publisherDisplayName`, och appens namn → `displayName`.
- Bygg sedan: `npm run build:store` → MSIX-filen att ladda upp. Store signerar den, så
  SmartScreen-varningen försvinner.
- **Pris:** Gratis. **Kategori:** Produktivitet.
- **Integritetspolicy:** https://johan-ott.github.io/penna/integritet.html
- **Ålder:** IARC-frågorna besvaras som för Play → 3+.
- **Beskrivning:** samma texter som för Play.
- **Kraschdata:** Partner Center visar krascher för Store-appen utan kod i Penna.

## Kraschdata och felrapporter

Penna skickar ingenting av sig själv. Krascher och "svarar inte" syns i Play Console (Android
vitals) och i Partner Center. Penna sparar sina senaste fel på enheten, och efter en krasch
erbjuder nästa start att mejla dem.
