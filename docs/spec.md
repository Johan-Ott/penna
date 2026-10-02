# Penna, kort spec

Fullständig spec: https://claude.ai/artifact/X69SvjmxRQrtJjVszL9Qsn
Design (canvas "Penna - skrivapp"): https://claude.ai/artifact/L7PB4FUJKpiCT2wjDWzepd

Specen gäller för beteende, canvasen för utseende, copy och tillstånd.

## Principer

1. Lokalt först: vanliga filer i en mapp användaren väljer, helt offline.
2. Inga servrar, inga konton: synk via användarens molnmapp (iCloud, Dropbox, OneDrive).
3. Ingen prenumeration: engångsköp.
4. Ingen AI: ingen text lämnar enheten.
5. Semantik före utseende: man märker upp vad texten är, bokdesign bestämmer hur den ser ut.

## Teknik

Tauri 2 + TypeScript + ProseMirror, Typst för tryck-PDF. Windows först, sedan macOS, mobil sist.
Lagring direkt i filsystemet med filbevakning, ingen databas.

## v1

Skriv + Träd + Fokusläge. Övriga skärmar är senare steg.

| Skärm     | Acceptanskriterium                                                                       |
| --------- | ---------------------------------------------------------------------------------------- |
| Skriv     | Inget skrivet ord försvinner: sparas inom 1 s efter paus, vid scenbyte och vid stängning |
| Träd      | Flytt av scen ändrar bara `project.json`, aldrig scenfilen                               |
| Fokusläge | Raden man skriver på står still vertikalt när typewriter är på                           |

Första spiken, före funktionerna: välj mapp, läs och skriv scenfil atomärt, upptäck ändringar
från molnsynk. Håller inte detta måste teknikvalet ses över.

## Filformat

```
Vintervägen.penna/
  project.json      titel, mål, trädets ordning, bokdesign
  entities.json     karaktärer, platser, föremål
  stats.json        ord per dag
  scenes/<ULID>.md  en fil per scen, front matter id/title/status, CommonMark
  notes/  comments/  snapshots/  trash/
```

## Kantfall som spiken täcker

| Fall                                                         | Beteende                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Synkkonflikt (Dropbox "conflicted copy", iCloud "Scen 2.md") | Upptäck kopior bredvid scenfilen, visa båda, radera aldrig automatiskt            |
| Filen ändras utanför appen                                   | Inga osparade ändringar: ladda om tyst. Annars konfliktdialog                     |
| Molnfil inte nedladdad (iCloud)                              | Visa "Hämtar…", ingen redigering förrän filen är lokal                            |
| Krasch eller strömavbrott                                    | Skriv till tempfil och byt namn. Vid start: erbjud återställning av nyare tempfil |
