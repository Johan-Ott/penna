# Styra Penna utifrån

Penna kan styras av ett skript eller av Claude i Claude Code, genom samma kommandon och
handlingar som appen själv använder. Det skrivs därför precis som om du gjort det för hand:
autosparet, versionerna och trädet fungerar som vanligt.

## Kom igång

**Med den vanliga Penna:** slå på Inställningar, Allmänt, "Styr Penna från den här datorn" och
starta om Penna. Anropen går sedan mot dina riktiga böcker med `--app`:

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
| `add <scene\|chapter\|part\|folder> [titel] [efter-id]` | Ny del av boken                                                                    |
| `note <sort> <namn>`                                    | Ny anteckning, till exempel `note Personer Greta`; en ny sort skapas om den saknas |
| `rename <id> <titel>`                                   | Byter namn                                                                         |
| `set <id> vad\|när\|pov <text>`                         | Vad händer?, När eller Vems ögon, som i Innehåll                                   |
| `status <id> <idé\|utkast\|redigering\|klar>`           | Scenens status                                                                     |
| `move <id> <efter-id>`                                  | Flyttar till efter en annan nod                                                    |
| `trash <id>`                                            | Lägger i papperskorgen                                                             |

## Bra att veta

- Den vanliga Penna går bara att styra när du har slagit på det, och bara från den här datorn.
  Stäng av det i Inställningar när du inte behöver det.
- Varje ändring väntar tills appen tagit emot den, så flera anrop i rad bygger på varandra.
- Koden: `src/app/remote.ts` (läsa, kommandon, texten) och `src/app/remoteBook.ts` (ändra
  boken). Testerna: `e2e/styrning.spec.ts`.
