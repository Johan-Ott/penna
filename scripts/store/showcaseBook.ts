// The book in the store and website pictures: served in place of src/demo/demoProject.ts while
// storeImages.mjs and siteImages.mjs take them, so the app itself never ships it.

export const DEMO_PROJECT_DIR = "/Glömda Minnen.skrivro";

const scene = (id: string, title: string, status: string, body: string) => ({
  [`${DEMO_PROJECT_DIR}/scenes/${id}.md`]: `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\n---\n${body}`,
});

const BRON = `Den döde mannen låg under bron med öppna ögon, och regnet hade slutat bry sig om honom. Elias drog av sig handsken.

– Vad kostar det den här gången? frågade Mira.

– Vet inte. Det vet jag aldrig förrän efteråt.

Han lade två fingrar mot mannens tinning. Världen vek sig inåt: ett trapphus som luktade bränt, en röd dörr, en röst som sa hans namn, fast han aldrig hade träffat mannen.

När han kom tillbaka satt han på knä i vattnet. Mira höll honom i kragen.

– Du blöder näsblod, sa hon. Vad hette din mamma?

Elias öppnade munnen. Ingenting kom.
`;

const ANTECKNINGSBOKEN = `Hemma läste han anteckningsboken från början, som varje kväll. Första sidan var skriven med hans egen handstil: Du heter Elias. Du kan läsa de dödas sista minnen. Varje gång tar det något från dig. Lita på Mira.

Längst ner, med färskt bläck, skrev han: Mamma. Fråga Mira vad hon hette.
`;

const ARKIVET = `Mira hade arbetat med Elias i tre år, och han hade glömt henne två gånger. Hon förde hans journal i en låda i arkivet, under ett namn som inte fanns.

Den röda dörren fanns i ett hus som revs 1998. Ändå hade Elias sett den, i en död mans minne, och hört sitt eget namn bakom den.
`;

const SPEGELN = `– Någon har varit i ditt huvud före dig, sa kvinnan i spegeln. Hon log med hans mun.

Elias tog ett steg bakåt. Bakom honom var hallen tom, men i spegeln stod dörren öppen. Den var röd.

– Vem är du?

– Den du glömde först.
`;

const ELIAS = `Minnesläsare. Ser de dödas sista minuter, men betalar med sina egna.

Har glömt sin födelsedag, sin första kärlek och nu sin mammas namn.
`;

const MIRA = `Kriminalinspektör. Den enda som minns Elias som han var.

Säger aldrig hur många gånger hon har presenterat sig.
`;

const KVINNAN = `Finns bara i speglar och fönsterrutor. Känner Elias bättre än han själv.

Vill ha tillbaka något.
`;

const DORREN = `Ett trapphus på söder, rivet 1998. Finns ändå kvar i minst tre döda mäns minnen.
`;

const BOKEN = `Svart, sliten, halvfull. Det enda Elias inte får tappa.
`;

const IDEER = `Bok två: Mira börjar också glömma, och hon har ingen anteckningsbok.
`;

const SECRET = `Det var Elias som stängde in kvinnan bakom dörren, innan han glömde att han hade gjort det.
`;

const IDS = {
  bron: "01JA0SKRVRBK00000000000001",
  anteckningsboken: "01JA0SKRVRBK00000000000002",
  arkivet: "01JA0SKRVRBK00000000000003",
  spegeln: "01JA0SKRVRBK00000000000004",
  slutet: "01JA0SKRVRBK00000000000005",
  elias: "01JA0SKRVRBK00000000000006",
  mira: "01JA0SKRVRBK00000000000007",
  kvinnan: "01JA0SKRVRBK00000000000008",
  dorren: "01JA0SKRVRBK00000000000009",
  boken: "01JA0SKRVRBK00000000000010",
  ideer: "01JA0SKRVRBK00000000000011",
  secret: "01JA0SKRVRBK00000000000012",
};

const MANUSCRIPT = [
  {
    id: "01JA0SKRVRBK000000000000P1",
    kind: "part",
    title: "Glömskan",
    children: [
      {
        id: "01JA0SKRVRBK000000000000C1",
        kind: "chapter",
        title: "Det som blev kvar",
        summary: "En död man under bron, och ett minne som kostar Elias hans mammas namn.",
        when: "Natten till tisdag",
        pov: "Elias",
        children: [
          { id: IDS.bron, kind: "scene" },
          { id: IDS.anteckningsboken, kind: "scene" },
        ],
      },
      {
        id: "01JA0SKRVRBK000000000000C2",
        kind: "chapter",
        title: "Någon annans minne",
        subtitle: "Mira",
        summary: "Den röda dörren finns inte längre, men någon har sett den.",
        when: "Tisdag",
        pov: "Mira",
        children: [{ id: IDS.arkivet, kind: "scene", labels: ["kolla-fakta"] }],
      },
    ],
  },
  {
    id: "01JA0SKRVRBK000000000000P2",
    kind: "part",
    title: "Priset",
    children: [
      {
        id: "01JA0SKRVRBK000000000000C3",
        kind: "chapter",
        title: "Det han inte får glömma",
        summary: "Spegeln visar en dörr som Elias en gång stängde.",
        epigraph: "Allt man glömmer väntar någonstans.",
        epigraphBy: "Ur Elias anteckningsbok",
        when: "Torsdag 03.10",
        pov: "Elias",
        children: [
          { id: IDS.spegeln, kind: "scene", labels: ["skriv-om"] },
          { id: IDS.slutet, kind: "scene", labels: ["lucka"] },
        ],
      },
    ],
  },
];

const NOTES = [
  {
    id: "karaktarer",
    kind: "sort",
    title: "Personer",
    children: [IDS.elias, IDS.mira, IDS.kvinnan],
  },
  { id: "platser", kind: "sort", title: "Platser", children: [IDS.dorren] },
  { id: "saker", kind: "sort", title: "Saker", children: [IDS.boken] },
  { id: "anteckningar", kind: "sort", title: "Övrigt", children: [IDS.ideer] },
].map((sort) => ({ ...sort, children: sort.children.map((id) => ({ id, kind: "scene" })) }));

const PROJECT = {
  title: "Glömda Minnen",
  type: "roman",
  genre: "Urban fantasy",
  dailyGoal: 500,
  submissions: [
    ["Förlaget Blyertsen", "2026-03-02", "nej"],
    ["Bokhuset Kommatecknet", "2026-03-02", "mer"],
    ["Agentur Marginalanteckningen", "2026-03-14", "skickat"],
    ["Förlaget Sista Sidan", "2026-04-01", "ja"],
  ].map(([to, sent, status], row) => ({
    id: `01JA0SKRVRBK000000000000S${row + 1}`,
    to,
    sent,
    status,
    note: "",
  })),
  connections: {
    [IDS.elias]: [
      { id: IDS.mira, role: "arbetar med" },
      { id: IDS.kvinnan, role: "jagas av" },
    ],
  },
  tree: [
    ...MANUSCRIPT,
    ...NOTES,
    {
      id: "hemligheter",
      kind: "sort",
      title: "Hemligheter",
      children: [
        {
          id: IDS.secret,
          kind: "scene",
          reveal: IDS.spegeln,
          knownBy: { [IDS.mira]: IDS.arkivet },
        },
      ],
    },
  ],
};

const COMMENT = [
  {
    id: "01JA0SKRVRBK000000000000K1",
    quote: "i ett hus som revs 1998",
    prefix: "Den röda dörren fanns ",
    suffix: ". Ändå",
    body: "Kan ett minne vara yngre än huset? Bestäm regeln innan kapitel fem.",
    author: "Lektören",
    createdAt: 1_760_000_000_000,
    resolved: false,
  },
];

const STICKY = [
  {
    id: "01JA0SKRVRBK000000000000L1",
    color: "gul",
    text: "Vad tar magin först: det nyaste eller det käraste?\n\nDet käraste. Alltid.",
    strokes: [],
    left: 24,
    top: 64,
    width: 220,
    height: 190,
  },
];

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const DEMO_PROJECT_FILES: Record<string, string> = {
  [`${DEMO_PROJECT_DIR}/project.json`]: json(PROJECT),
  ...scene(IDS.bron, "Bron", "redigering", BRON),
  ...scene(IDS.anteckningsboken, "Anteckningsboken", "utkast", ANTECKNINGSBOKEN),
  ...scene(IDS.arkivet, "Arkivet", "utkast", ARKIVET),
  ...scene(IDS.spegeln, "Spegeln", "utkast", SPEGELN),
  ...scene(IDS.slutet, "Slutet", "idé", ""),
  ...scene(IDS.elias, "Elias", "utkast", ELIAS),
  ...scene(IDS.mira, "Mira", "utkast", MIRA),
  ...scene(IDS.kvinnan, "Kvinnan i spegeln", "utkast", KVINNAN),
  ...scene(IDS.dorren, "Den röda dörren", "utkast", DORREN),
  ...scene(IDS.boken, "Den svarta boken", "utkast", BOKEN),
  ...scene(IDS.ideer, "Idéer", "utkast", IDEER),
  ...scene(IDS.secret, "Elias stängde dörren", "utkast", SECRET),
  [`${DEMO_PROJECT_DIR}/comments/${IDS.arkivet}.json`]: json(COMMENT),
  [`${DEMO_PROJECT_DIR}/lappar.json`]: json(STICKY),
};
