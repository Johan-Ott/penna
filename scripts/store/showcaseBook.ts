// The book in the store pictures: served in place of src/demo/demoProject.ts while
// scripts/store/storeImages.mjs takes them, so the app itself never ships it.

export const DEMO_PROJECT_DIR = "/Kanelbullemordet.skrivro";

const scene = (id: string, title: string, status: string, body: string) => ({
  [`${DEMO_PROJECT_DIR}/scenes/${id}.md`]: `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\n---\n${body}`,
});

const BAGERIET = `Klockan tolv minuter över sex på lördagsmorgonen upptäckte bagare Holm att den sista kanelbullen var borta.

– Någon har tagit den, sa han. *Någon i det här rummet.*

Greta tittade sig omkring. I bageriet fanns bagare Holm, en säck mjöl och katten Sixten, som låtsades sova på fönsterbrädan.

– Det är bara vi här, sa hon.

– Precis, sa Holm och kisade. Precis.

Greta ställde ner kaffekoppen. Hon hade löst tre mord, ett försvunnet paraply och en gång, för länge sedan, vem som ätit upp julskinkan. En kanelbulle borde inte ta mer än en förmiddag.
`;

const SPAREN = `Spåren i mjölet var små, runda och hade fyra tår. Greta böjde sig ner så långt hennes knän tillät.

– Sixten, sa hon.

Katten öppnade ett öga, betraktade henne med djupt förakt och stängde det igen. Det var precis vad en skyldig katt skulle göra. Men det var också precis vad en oskyldig katt skulle göra. Det var det svåra med katter.
`;

const FONSTRET = `Sixten hade sett allt. Holm som smög upp mitt i natten, kylskåpsdörren som gled upp och smulorna som föll på golvet.

Han tänkte inte säga ett ord. Ingen hade frågat honom om något sedan 2019, och då gällde det ett nystan.
`;

const FORHORET = `– Var befann du dig klockan tre i natt? frågade Greta.

– I sängen, sa Holm. Jag sover som en stock.

– Och mustaschen?

Holm tog sig om överläppen. Ett litet moln av pärlsocker singlade ner på disken. Ingen sa något på en lång stund. Sixten gäspade, mycket högt.
`;

const GRETA = `78 år. Pensionerad postmästare. Har löst tre mord och ett försvunnet paraply.

Dricker kaffet svart och slutsatserna starka.
`;

const HOLM = `Bagare på Gyllene Kringlan sedan 1986. Stolt över sina bullar, ännu stoltare över sin mustasch.

Går i sömnen. Vet inte om det.
`;

const SIXTEN = `Katt. Huvudmisstänkt. Alibi: sov.

Har inte rört sig snabbare än nödvändigt sedan 2019.
`;

const KRINGLAN = `Litet bageri vid torget. Doftar kardemumma, öppnar sex och stänger när bullarna är slut.
`;

const BULLEN = `Den sista kanelbullen. Extra pärlsocker. Saknad sedan lördag morgon.
`;

const IDEER = `Bok två: Mazarinmysteriet. Någon har ätit glasyren och lämnat resten.
`;

const SECRET = `Det var Holm. Han åt bullen i sömnen, och Sixten såg alltihop.
`;

const IDS = {
  bageriet: "01JA0SKRVRBK00000000000001",
  sparen: "01JA0SKRVRBK00000000000002",
  fonstret: "01JA0SKRVRBK00000000000003",
  forhoret: "01JA0SKRVRBK00000000000004",
  avslojandet: "01JA0SKRVRBK00000000000005",
  greta: "01JA0SKRVRBK00000000000006",
  holm: "01JA0SKRVRBK00000000000007",
  sixten: "01JA0SKRVRBK00000000000008",
  kringlan: "01JA0SKRVRBK00000000000009",
  bullen: "01JA0SKRVRBK00000000000010",
  ideer: "01JA0SKRVRBK00000000000011",
  secret: "01JA0SKRVRBK00000000000012",
};

const MANUSCRIPT = [
  {
    id: "01JA0SKRVRBK000000000000P1",
    kind: "part",
    title: "Brottet",
    children: [
      {
        id: "01JA0SKRVRBK000000000000C1",
        kind: "chapter",
        title: "Bullen som försvann",
        summary: "Den sista kanelbullen är borta, och bagare Holm misstänker alla utom sig själv.",
        when: "Lördag 06.12",
        pov: "Greta",
        children: [
          { id: IDS.bageriet, kind: "scene" },
          { id: IDS.sparen, kind: "scene" },
        ],
      },
      {
        id: "01JA0SKRVRBK000000000000C2",
        kind: "chapter",
        title: "Katten vet något",
        subtitle: "Sixten",
        summary: "Sixten har sett allt, men ingen frågar en katt.",
        when: "Natten innan",
        pov: "Sixten",
        children: [{ id: IDS.fonstret, kind: "scene", labels: ["kolla-fakta"] }],
      },
    ],
  },
  {
    id: "01JA0SKRVRBK000000000000P2",
    kind: "part",
    title: "Upplösningen",
    children: [
      {
        id: "01JA0SKRVRBK000000000000C3",
        kind: "chapter",
        title: "Kaffe och misstankar",
        summary: "Greta förhör Holm och ser något vitt i hans mustasch.",
        epigraph: "Den som har smulor i mustaschen ska inte kasta kanelbullar.",
        epigraphBy: "Gammalt bagarordspråk",
        when: "Lördag 10.30",
        pov: "Greta",
        children: [
          { id: IDS.forhoret, kind: "scene", labels: ["skriv-om"] },
          { id: IDS.avslojandet, kind: "scene", labels: ["lucka"] },
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
    children: [IDS.greta, IDS.holm, IDS.sixten],
  },
  { id: "platser", kind: "sort", title: "Platser", children: [IDS.kringlan] },
  { id: "saker", kind: "sort", title: "Saker", children: [IDS.bullen] },
  { id: "anteckningar", kind: "sort", title: "Övrigt", children: [IDS.ideer] },
].map((sort) => ({ ...sort, children: sort.children.map((id) => ({ id, kind: "scene" })) }));

const PROJECT = {
  title: "Kanelbullemordet",
  type: "roman",
  genre: "Mysdeckare",
  dailyGoal: 500,
  connections: {
    [IDS.greta]: [
      { id: IDS.holm, role: "granne" },
      { id: IDS.sixten, role: "inneboende" },
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
          reveal: IDS.forhoret,
          knownBy: { [IDS.sixten]: IDS.fonstret },
        },
      ],
    },
  ],
};

const COMMENT = [
  {
    id: "01JA0SKRVRBK000000000000K1",
    quote: "kylskåpsdörren som gled upp",
    prefix: "mitt i natten, ",
    suffix: " och smulorna som föll",
    body: "Ser katter i mörker? Kolla fakta, eller fråga en katt.",
    author: "Redaktören",
    createdAt: 1_760_000_000_000,
    resolved: false,
  },
];

const STICKY = [
  {
    id: "01JA0SKRVRBK000000000000L1",
    color: "gul",
    text: "Vem har smulor i mustaschen?\n\nHolm. Alltid Holm.",
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
  ...scene(IDS.bageriet, "Bageriet", "redigering", BAGERIET),
  ...scene(IDS.sparen, "Spåren i mjölet", "utkast", SPAREN),
  ...scene(IDS.fonstret, "Fönsterbrädan", "utkast", FONSTRET),
  ...scene(IDS.forhoret, "Förhöret", "utkast", FORHORET),
  ...scene(IDS.avslojandet, "Avslöjandet", "idé", ""),
  ...scene(IDS.greta, "Greta", "utkast", GRETA),
  ...scene(IDS.holm, "Bagare Holm", "utkast", HOLM),
  ...scene(IDS.sixten, "Sixten", "utkast", SIXTEN),
  ...scene(IDS.kringlan, "Gyllene Kringlan", "utkast", KRINGLAN),
  ...scene(IDS.bullen, "Den sista kanelbullen", "utkast", BULLEN),
  ...scene(IDS.ideer, "Idéer", "utkast", IDEER),
  ...scene(IDS.secret, "Det var Holm", "utkast", SECRET),
  [`${DEMO_PROJECT_DIR}/comments/${IDS.fonstret}.json`]: json(COMMENT),
  [`${DEMO_PROJECT_DIR}/lappar.json`]: json(STICKY),
};
