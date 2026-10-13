# Styra Penna utifrån

Penna kan styras av ett skript eller av Claude i Claude Code, genom samma kommandon och
handlingar som appen själv använder. Det skrivs därför precis som om du gjort det för hand:
autosparet, versionerna och trädet fungerar som vanligt.

## Kom igång

**Med den vanliga Penna:** slå på Inställningar, Allmänt, "Styr Penna från den här datorn" och
starta om Penna. Det gäller den starten och bara den: topplisten visar "Styrs utifrån" så länge
det är på, och nästa gång Penna startar är det av igen. Anropen går mot dina riktiga böcker med
`--app`:

```bash
node scripts/penna.mjs --app tree
```

**Med Penna Test**, för att prova utan att röra dina böcker:

1. Starta Penna Test: `npm run app:test`. Den har egna böcker under `%APPDATA%\se.penna.test`.
2. Öppna boken du vill arbeta med i Penna Test.
3. Be Claude i Claude Code om något, till exempel "lägg till ett kapitel Stormen efter kapitel
   2 och sätt När till Mars", eller kör ett anrop själv:

```bash
node scripts/penna.mjs tree
```

Svaret kommer som JSON.

## Utan att Penna är igång: --book

Med `--book <bokmapp>` fungerar anropen även när Penna är av. Har Penna samma bok öppen går
anropet genom appen, som vanligt; annars skrivs bokens filer direkt, med samma kod som appen
använder. En Penna som startar eller redan bevakar mappen läser själv in ändringen.

```bash
node scripts/penna.mjs --book "C:/Users/Elin/Documents/Penna/Vintervägen.penna" tree
node scripts/penna.mjs --book "…/Vintervägen.penna" write <scen-id> kapitel1.md
```

Det fungerar utan `--book` bara med appen igång. Bokens filer beskrivs i
[format.md](format.md), för den som vill skriva dem själv.

## Anropen

| Anrop                                                   | Vad det gör                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `state`                                                 | Bok, mapp, vy, öppen text och dagens ord                                           |
| `tree`                                                  | Delar, kapitel, scener och anteckningar med id och titel                           |
| `commands`                                              | Alla kommandon i paletten                                                          |
| `run <kommando>`                                        | Kör ett palettkommando, till exempel `run "Ny scen"` eller `run Fokusläge`         |
| `open <id>`                                             | Öppnar en scen eller anteckning                                                    |
| `text`                                                  | Den öppna textens innehåll                                                         |
| `type <text>`                                           | Skriver vid markören i den öppna texten                                            |
| `read <id>`                                             | En scens eller antecknings fil som den ligger på disk                              |
| `write <id> <fil>`                                      | Ersätter scenens text med filens; titel och status behålls                         |
| `add <scene\|chapter\|part\|folder> [titel] [efter-id]` | Ny del av boken                                                                    |
| `note <sort> <namn>`                                    | Ny anteckning, till exempel `note Personer Greta`; en ny sort skapas om den saknas |
| `rename <id> <titel>`                                   | Byter namn                                                                         |
| `set <id> vad\|när\|pov <text>`                         | Vad händer?, När eller Vems ögon, som i Innehåll                                   |
| `status <id> <idé\|utkast\|redigering\|klar>`           | Scenens status                                                                     |
| `move <id> <efter-id>`                                  | Flyttar till efter en annan nod                                                    |
| `trash <id>`                                            | Lägger i papperskorgen                                                             |

## Bra att veta

- Den vanliga Penna går bara att styra när du har slagit på det, en start i taget, och bara från
  den här datorn. Porten har inget lösenord, så vilket program på datorn som helst kan använda
  den under den starten.
- Varje ändring väntar tills appen tagit emot den, så flera anrop i rad bygger på varandra.
- `state`, `commands`, `run`, `open`, `text` och `type` gäller den öppna appen och finns bara
  genom den.
- Koden: `src/app/remote.ts` (läsa, kommandon, texten), `src/app/remoteBook.ts` (ändra boken
  genom appen) och `src/project/bookFiles.ts` (ändra boken i filerna). Testerna:
  `e2e/styrning.spec.ts` och `tests/bookFiles.test.ts`.
