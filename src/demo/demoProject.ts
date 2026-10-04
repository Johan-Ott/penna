export const DEMO_PROJECT_DIR = "/Vintervägen.penna";

const scene = (id: string, title: string, status: string, body: string) => ({
  [`${DEMO_PROJECT_DIR}/scenes/${id}.md`]: `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\n---\n${body}`,
});

const KOKET = `Brevet låg på köksbordet när Elin kom in från kylan. *Kuvertet var gult av ålder*, och handstilen kände hon igen innan hon ens hunnit ta av sig vantarna.

– Det kom i morse, sa Arvid utan att se upp från spisen. Med posten. Som om ingenting hade hänt.

Hon satte sig. Utanför fönstret hade isen lagt sig över viken, grå och orörlig, och bortom udden blinkade fyren som den gjort varje natt i fyrtio år.

– Vet du vem det är från?

::: brev
Kära Elin. Om du läser det här har isen till slut släppt.

Din Henrik
:::
`;

const ISEN = `Isen bar. Den hade burit sedan jul, men Elin gick ändå nära stranden, där vassen stack upp genom snön.

* * *

På kvällen kom Maja över med en termos.
`;

// Characters are written like scenes; these two show how Penna finds them in the text.
const ELIN = `Trettioåtta. Lämnade ön när hon var arton och har inte varit tillbaka sedan pappans begravning.

Säger sällan vad hon tänker, men skriver allt i en svart anteckningsbok.
`;

const ARVID = `Elins farbror. Fiskare, och fyrens siste vakt innan den automatiserades.

Vet mer om brevet än han vill säga.
`;

const SCENE_IDS = {
  koket: "01J9Z4K2QX0000000000000001",
  isen: "01J9Z4K2QX0000000000000002",
  fyren: "01J9Z4K2QX0000000000000003",
  elin: "01J9Z4K2QX0000000000000004",
  arvid: "01J9Z4K2QX0000000000000005",
};

const PROJECT = {
  title: "Vintervägen",
  type: "roman",
  dailyGoal: 500,
  tree: [
    {
      id: "01J9Z4K2QX00000000000000P1",
      kind: "part",
      title: "Vintern",
      children: [
        {
          id: "01J9Z4K2QX00000000000000C1",
          kind: "chapter",
          title: "Brevet",
          children: [
            { id: SCENE_IDS.koket, kind: "scene" },
            { id: SCENE_IDS.isen, kind: "scene" },
          ],
        },
        {
          id: "01J9Z4K2QX00000000000000C2",
          kind: "chapter",
          title: "Fyren",
          children: [{ id: SCENE_IDS.fyren, kind: "scene" }],
        },
      ],
    },
    {
      id: "karaktarer",
      kind: "folder",
      title: "Karaktärer",
      children: [
        { id: SCENE_IDS.elin, kind: "scene" },
        { id: SCENE_IDS.arvid, kind: "scene" },
      ],
    },
  ],
};

/** The example project shown when Penna runs in a browser without Tauri. */
export const DEMO_PROJECT_FILES: Record<string, string> = {
  [`${DEMO_PROJECT_DIR}/project.json`]: `${JSON.stringify(PROJECT, null, 2)}\n`,
  ...scene(SCENE_IDS.koket, "Köket", "utkast", KOKET),
  ...scene(SCENE_IDS.isen, "Isen", "utkast", ISEN),
  ...scene(SCENE_IDS.fyren, "Fyren", "idé", ""),
  ...scene(SCENE_IDS.elin, "Elin", "utkast", ELIN),
  ...scene(SCENE_IDS.arvid, "Arvid", "utkast", ARVID),
};
