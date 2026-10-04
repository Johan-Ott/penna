# Första släppet: vad som är klart och vad Johan gör

## Klart i koden

- Alla v1-skärmar för desktop enligt specen och designen, på svenska och engelska.
- Version 0.1.0 (`npm run version -- X.Y.Z` sätter den överallt).
- Signerade uppdateringar: appen frågar GitHub Releases vid start.
- `.github/workflows/release.yml`: en tagg `vX.Y.Z` bygger Windows och macOS till ett utkast.
- Typsnittens licenser ligger i `public/fonts/`; Om Penna nämner typsnitten och Typst.

## Johan gör, en gång

1. **GitHub-hemlighet:** repo → Settings → Secrets → Actions → `TAURI_SIGNING_PRIVATE_KEY` med
   innehållet i `~/.tauri/penna-updater.key`. Lösenordet är tomt. Säkerhetskopiera nyckelfilen.
2. **Repot publikt eller en egen adress för uppdateringar.** Appen läser
   `https://github.com/Johan-Ott/penna/releases/latest/download/latest.json`. Är repot privat
   når appen den inte; då behövs ett publikt repo bara för släpp, eller en annan adress i
   `tauri.conf.json` under `plugins.updater.endpoints`.
3. **Kodsignering**
   - Windows: Microsoft Store (sköter signeringen) eller ett eget certifikat. Utan det visar
     Windows "okänd utgivare" vid installation.
   - macOS: Apple Developer-konto (cirka 99 USD per år) för signering och notarisering. Lägg
     certifikatet som hemligheter i GitHub enligt tauri-action.
4. **Butiker:** pris och engångsköp, skärmdumpar, butikstext på svenska och engelska,
   integritetsetiketten "Data samlas inte in".
5. **Webbsida:** nedladdning, support-e-post och integritetspolicy (krävs av butikerna även när
   ingen data samlas in). När adressen och e-posten finns kan Om Penna länka till dem.
6. **Varumärkeskoll** av namnet Penna.

## Prova innan släppet, i det riktiga fönstret

- Stavning: skriv "speling kökbordet" i en scen. Rött bara under "speling" betyder att den
  svenska ordlistan används.
- Tryck-PDF: exportera exempelboken och öppna PDF:en.
- Uppdatering: släpp 0.1.0, installera, släpp 0.1.1 och se att appen erbjuder den.
- Påminnelsen: sätt den till en timme som har passerat en dag utan skrivande.

## Släpp

```bash
npm run version -- 0.1.0
git commit -am "Penna 0.1.0" && git tag v0.1.0 && git push --follow-tags
```

Publicera sedan utkastet under Releases på GitHub.
