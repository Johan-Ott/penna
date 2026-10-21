# Styra Skrivro utifrån

Skrivro kan styras av ett skript eller av Claude i Claude Code, genom samma kommandon och
handlingar som appen själv använder. Det skrivs därför precis som om du gjort det för hand:
autosparet, versionerna och trädet fungerar som vanligt.

## Kom igång

**Med den vanliga Skrivro:** slå på Inställningar, Avancerat, "Styr Skrivro från den här datorn" och
starta om Skrivro. Det gäller den starten och bara den: topplisten visar "Styrs utifrån" så länge
det är på, och nästa gång Skrivro startar är det av igen. Anropen går mot dina riktiga böcker med
`--app`:

```bash
node scripts/skrivro.mjs --app tree
```

**Med Skrivro Test**, för att prova utan att röra dina böcker:

1. Starta Skrivro Test: `npm run app:test`. Den har egna böcker under `%APPDATA%\se.skrivro.test`.
2. Öppna boken du vill arbeta med i Skrivro Test.
3. Be Claude i Claude Code om något, till exempel "lägg till ett kapitel Stormen efter kapitel
   2 och sätt När till Mars", eller kör ett anrop själv:

```bash
node scripts/skrivro.mjs tree
```

Svaret kommer som JSON.

## Utan att Skrivro är igång: --book

Med `--book <bokmapp>` fungerar anropen även när Skrivro är av. Har Skrivro samma bok öppen går
anropet genom appen, som vanligt; annars skrivs bokens filer direkt, med samma kod som appen
använder. En Skrivro som startar eller redan bevakar mappen läser själv in ändringen.

```bash
node scripts/skrivro.mjs --book "C:/Users/Elin/Documents/Skrivro/Vintervägen.skrivro" tree
node scripts/skrivro.mjs --book "…/Vintervägen.skrivro" write <scen-id> kapitel1.md
```

Det fungerar utan `--book` bara med appen igång. Bokens filer beskrivs i
[format.md](format.md), för den som vill skriva dem själv.

## Ny bok

`new` gör en ny bok i Skrivro-biblioteket, med samma kod som Ny bok i appen. Skrivro behöver inte
vara igång. En disposition i Markdown blir bokens träd, som när Importera läser den: `#` blir
delar, `##` kapitel och texten under dem scener.

```bash
node scripts/skrivro.mjs new "C:/Users/Elin/Documents/Skrivro" Vintervägen disposition.md
```

Svaret är bokens mapp och första scenens id. Sedan fungerar de andra anropen med `--book`.

## Anropen

| Anrop                                                   | Vad det gör                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `state`                                                 | Bok, mapp, vy, öppen text och dagens ord                                                       |
| `tree`                                                  | Delar, kapitel, scener och anteckningar med id och titel                                       |
| `commands`                                              | Alla kommandon i paletten                                                                      |
| `run <kommando>`                                        | Kör ett palettkommando, till exempel `run "Ny scen"` eller `run Fokusläge`                     |
| `open <id>`                                             | Öppnar en scen eller anteckning                                                                |
| `text`                                                  | Den öppna textens innehåll                                                                     |
| `type <text>`                                           | Skriver vid markören i den öppna texten                                                        |
| `read <id>`                                             | En scens eller antecknings fil som den ligger på disk                                          |
| `write <id> <fil>`                                      | Ersätter scenens text med filens och sparar den förra som en version; titel och status behålls |
| `add <scene\|chapter\|part\|folder> [titel] [efter-id]` | Ny del av boken                                                                                |
| `note <sort> <namn>`                                    | Ny anteckning, till exempel `note Personer Greta`; en ny sort skapas om den saknas             |
| `rename <id> <titel>`                                   | Byter namn                                                                                     |
| `set <id> vad\|när\|pov <text>`                         | Vad händer?, När eller Vems ögon, som i Innehåll                                               |
| `status <id> <idé\|utkast\|redigering\|klar>`           | Scenens status                                                                                 |
| `move <id> <efter-id>`                                  | Flyttar till efter en annan nod                                                                |
| `trash <id>`                                            | Lägger i papperskorgen                                                                         |
| `book [fält värde]`                                     | Bokens inställningar, eller ett fält: titel, totalmål, dagsmål, deadline, röst, språk          |
| `label <id> <namn> [av]`                                | Sätter en etikett på en nod; ett nytt namn blir en ny etikett, `av` tar bort den               |
| `pieces <bit,bit…>`                                     | Lägger till bitar från Ny bok, till exempel `deckare,romans`: sorter och etiketter             |
| `series <namn>`                                         | Lägger boken i en serie, och gör serien om den inte finns                                      |
| `toSeries <id…>`                                        | Flyttar anteckningar till seriens, så att seriens böcker delar dem                             |
| `comment <id> <citat> <text> [författare]`              | En kommentar på citatet i scenen, förankrad som i appen                                        |
| `comments <id>`                                         | Scenens kommentarer                                                                            |
| `batch <fil.json>`                                      | Flera anrop i följd: `[["add","chapter","Stormen"],["set","$0","vad","…"]]`                    |

## Bra att veta

- Den vanliga Skrivro går bara att styra när du har slagit på det, en start i taget, och bara från
  den här datorn. Porten har inget lösenord, så vilket program på datorn som helst kan använda
  den under den starten.
- Varje ändring väntar tills appen tagit emot den, så flera anrop i rad bygger på varandra.
- `state`, `commands`, `run`, `open`, `text` och `type` gäller den öppna appen och finns bara
  genom den.
- Koden: `src/app/remote.ts` (läsa, kommandon, texten), `src/app/remoteBook.ts` (ändra boken
  genom appen) och `src/project/bookFiles.ts` (ändra boken i filerna). Testerna:
  `e2e/styrning.spec.ts` och `tests/bookFiles.test.ts`.
- `röst` skrivs som `jag dåtid djup`: jag, tredje eller allvetande, dåtid eller nutid, och djup
  för djup POV. `$0`, `$1` och så vidare i en batch är svaret från anrop 0, 1 och så vidare.
- `write` sparar alltid scenens förra text som en version ("Före ändring utifrån") i
  Versioner, så att inget skrivet försvinner.
