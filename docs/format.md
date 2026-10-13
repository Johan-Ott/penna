# Bokens filer

En bok i Penna är en vanlig mapp med vanliga filer. Den här sidan beskriver dem, så att ett
verktyg eller en annan AI kan läsa och skriva en bok utan att Penna är igång. Är Penna igång med
boken öppen läser appen själv om det som ändrats, och den scen du skriver i skyddas (se
**Om Penna är igång** nedan).

Det enklaste sättet att ändra en bok utifrån är `scripts/penna.mjs --book <mapp>` (se
[styrning.md](styrning.md)). Det använder samma kod som appen och skriver allt rätt. Den här
sidan är för den som skriver filerna själv.

## Mappen

```
Vintervägen.penna/
  project.json          trädet och bokens inställningar
  scenes/<id>.md         en fil per scen och per anteckning
  bilder/                bilder i texten och i bokens design
  filer/                 researchfiler: PDF:er, foton och annat
  kladdlapp.md           Kladdlappen
  comments/<id>.json     kommentarer på en scen
  snapshots/<id>/        versioner av en scen
  utkast/<id>/           sparade utkast av ett kapitel
  stats/<enhet>.json     dagens ord per enhet
  trash/                 det som slängts, så det går att lägga tillbaka
  .penna-sync.json       Drive-synkens läge; rör inte
  .penna-sync-log.json   vad synken förde med sig; rör inte
```

En serie är en mapp som slutar på `.serie` och är byggd på samma sätt.

## project.json

JSON med ett träd och bokens inställningar:

```json
{
  "title": "Vintervägen",
  "type": "roman",
  "dailyGoal": 500,
  "totalGoal": 80000,
  "formatVersion": 1,
  "tree": [
    {
      "id": "01J9Z4K2QX00000000000000P1",
      "kind": "part",
      "title": "Vintern",
      "children": [
        {
          "id": "01J9Z4K2QX00000000000000C1",
          "kind": "chapter",
          "title": "Brevet",
          "summary": "Elin får ett brev.",
          "when": "Januari",
          "children": [{ "id": "01J9Z4K2QX0000000000000001", "kind": "scene" }]
        }
      ]
    },
    { "id": "karaktarer", "kind": "sort", "children": [{ "id": "01J9…04", "kind": "scene" }] }
  ]
}
```

- **Behåll alla fält** du inte känner till. Penna skriver tillbaka dem som de är.
- **`formatVersion`** är 1. Har en bok ett högre nummer är den sparad av en nyare Penna, och då
  ska inget skrivas i den.
- **Ordningen i `tree` är bokens ordning.**

### Noderna

| `kind`    | Är                       | Får innehålla            |
| --------- | ------------------------ | ------------------------ |
| `part`    | en del                   | `chapter`, `scene`       |
| `chapter` | ett kapitel              | `scene`                  |
| `scene`   | en scen eller anteckning | inget                    |
| `folder`  | en mapp, som Papperskorg | allt                     |
| `sort`    | en anteckningssort       | `scene` (anteckningarna) |

Varje nod har ett `id`. Delar, kapitel, mappar och sorter har en `title` i trädet. En scen har
**ingen** titel i trädet; den står i scenens egen fil.

Valfria fält på en nod: `summary` (Vad händer?), `when` (När), `pov` (Vems ögon), `subtitle`,
`epigraph`, `epigraphBy`, `labels` (id:n ur `project.json`s `labels`), och för hemligheter
`reveal` och `knownBy`.

**Sorter med fasta id:n:** `karaktarer` (Personer), `platser`, `saker`, `anteckningar`
(Övrigt) och `hemligheter`. Papperskorgen är mappen `trash`. Egna sorter har vanliga id:n.

## En scen: scenes/&lt;id&gt;.md

```markdown
---
id: 01J9Z4K2QX0000000000000001
title: Köket
status: utkast
---

Brevet låg på köksbordet när Elin kom in från kylan. _Kuvertet var gult av ålder._

– Det kom i morse, sa Arvid.
```

- **Front matter** står mellan två `---`-rader:
  - `id` är samma som filnamnet;
  - `title` är scenens namn;
  - `status` är `idé`, `utkast`, `redigering` eller `klar`.
  - Anteckningar kan också ha `link: true` eller `link: false` (om namnet ska kopplas i texten)
    och `file: "namn.pdf"` (en researchfil i `filer/`).
  - En text med tecken som `:` sätts inom citattecken, som JSON.
- **Texten** är Markdown: stycken med en tom rad emellan, `*kursiv*` och `**fet**`.
- **En anteckning** (en person, en plats) är också en scenfil. Den ligger i en `sort` i trädet
  i stället för i ett kapitel.

## Id:n

Ett id är 26 tecken lång, i tidsordning, av siffror och versaler (ULID), till exempel
`01M4V0QKS5P3HM9V9YCD488TRD`. Ett nytt id måste vara unikt i boken. Id:n ändras aldrig: flyttas
en scen behåller den sitt id, så kommentarer, versioner och synk hittar den.

## Skriva säkert

1. **Skriv hela filen till en tillfällig fil bredvid, och byt sedan namn** till det riktiga. Då
   läser Penna aldrig en halvskriven fil. Använd ett eget namn, till exempel
   `Köket.md.agent-tmp`, aldrig `.penna-tmp`: det är Pennas eget, och en sådan fil tas efter en
   krasch för text som inte hann sparas.
2. **En ny scen behöver både sin fil och en nod i trädet.** Skriv filen först och trädet sedan.
   En scenfil som saknas i trädet hittar Penna ändå, och lägger den sist.
3. **Radera aldrig.** Flytta en nod till `trash`-mappen i trädet, och lägg en fil man vill bli av
   med i `trash/`. Penna raderar själv aldrig något.
4. **Rör inte `.penna-sync.json`, `.penna-sync-log.json` eller `stats/`.** De är Pennas.

## Om Penna är igång

- Penna bevakar bokens mapp och läser om det som ändrats inom ett par sekunder.
- Ändras **den scen som är öppen** och har du inget osparat i den, laddas den nya texten. Har du
  skrivit något som inte hunnit sparas frågar Penna vilken version du vill ha, och den andra blir
  en version, så inget försvinner.
- **Trädet är det enda som kan krocka.** Flyttar du något i Penna samtidigt som ett verktyg
  skriver `project.json` vinner den som skriver sist. `penna.mjs --book` går därför genom appen
  när den har boken öppen.
