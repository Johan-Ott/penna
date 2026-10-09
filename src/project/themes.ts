import { t } from "../i18n/i18n.js";

/** A book's mood while writing: three colours and a heading font. Export follows Publicera. */
export interface Theme {
  id: string;
  background: string;
  text: string;
  accent: string;
  heading: string;
  isItalicHeading?: boolean;
}

const LITERATA = '"Literata", Georgia, serif';
export const HEADING_FONTS: [string, string][] = [
  ["Literata", LITERATA],
  ["Garamond", '"EB Garamond", Garamond, Georgia, serif'],
  ["Geist", '"Geist Sans", system-ui, sans-serif'],
];

export const THEMES: Theme[] = [
  {
    id: "romance",
    background: "#fffaf8",
    text: "#3a2226",
    accent: "#b5546b",
    heading: '"EB Garamond", Garamond, Georgia, serif',
    isItalicHeading: true,
  },
  {
    id: "skrack",
    background: "#161414",
    text: "#e8e2dc",
    accent: "#a83232",
    heading: '"Source Serif 4", Georgia, serif',
  },
  {
    id: "thriller",
    background: "#f8f9fa",
    text: "#121820",
    accent: "#2f5d8a",
    heading: '"Geist Sans", system-ui, sans-serif',
  },
];

export const themeNames = (): Record<string, [string, string]> => ({
  app: [t("Som appen"), t("Ljust eller mörkt, som i inställningarna")],
  romance: [t("Romance"), t("Rosépapper, kursiva rubriker")],
  skrack: [t("Skräck"), t("Nattsvart med blodröd ton")],
  thriller: [t("Thriller"), t("Kall stålblå, stram typografi")],
  eget: [t("Eget tema"), t("Skapa med tre färger")],
});

export const START_OWN: Theme = {
  id: "eget",
  background: "#f3efe6",
  text: "#2b2520",
  accent: "#8a5a2b",
  heading: LITERATA,
};

const isColour = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** A theme from project.json or a .pennatema file; null for anything that is not one. */
export function themeFrom(value: unknown): Theme | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  const known = THEMES.find((theme) => theme.id === item["id"]);
  if (known) return known;
  if (!isColour(item["background"]) || !isColour(item["text"]) || !isColour(item["accent"]))
    return null;
  const heading = typeof item["heading"] === "string" ? item["heading"] : LITERATA;
  return {
    id: "eget",
    background: item["background"],
    text: item["text"],
    accent: item["accent"],
    heading,
  };
}

export const bookTheme = (fields: Record<string, unknown>) => themeFrom(fields["theme"]);

const rgb = (colour: string) =>
  [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16));

/** `share` of the way from one colour to the other. */
export function mix(from: string, to: string, share: number) {
  const target = rgb(to);
  return `#${rgb(from)
    .map((value, index) =>
      Math.round(value + ((target[index] ?? 0) - value) * share)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function luminance(colour: string) {
  const [red = 0, green = 0, blue = 0] = rgb(colour).map((value) => {
    const share = value / 255;
    return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG's contrast between two colours, from 1 to 21. */
export function contrast(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort((one, two) => two - one);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

export const isDarkTheme = (theme: Theme) => luminance(theme.background) < 0.2;

// How far each token lies from the background towards the text, and from the text back.
const FROM_PAPER: [string, number][] = [
  ["--bg-preview", 0.06],
  ["--surface-hover", 0.07],
  ["--surface-selected", 0.12],
  ["--border", 0.1],
  ["--border-soft", 0.06],
  ["--border-control", 0.14],
  ["--border-card", 0.1],
  ["--mode-track", 0.09],
  ["--match", 0.08],
  ["--match-current", 0.16],
  ["--heat-0", 0.06],
  ["--heat-1", 0.2],
  ["--heat-2", 0.4],
  ["--heat-3", 0.65],
  ["--heat-4", 1],
];
const FROM_TEXT: [string, number][] = [
  ["--text", 0],
  ["--primary", 0],
  ["--text-prose", 0.06],
  ["--text-tree", 0.2],
  ["--text-muted", 0.4],
  ["--text-label", 0.45],
  ["--text-dim", 0.7],
];

/** Every colour token of the app worked out from the theme's three colours. */
export function themeTokens(theme: Theme): Record<string, string> {
  const { background: paper, text, accent } = theme;
  const frame = mix(paper, isDarkTheme(theme) ? "#000000" : text, 0.06);
  return {
    ...Object.fromEntries(FROM_PAPER.map(([token, share]) => [token, mix(paper, text, share)])),
    ...Object.fromEntries(FROM_TEXT.map(([token, share]) => [token, mix(text, paper, share)])),
    "--bg": paper,
    "--paper": paper,
    "--on-primary": paper,
    "--bg-subtle": frame,
    "--bg-panel": mix(frame, paper, 0.5),
    "--selection": mix(paper, accent, 0.22),
    "--accent": accent,
    "--font-heading": theme.heading,
    "--heading-style": theme.isItalicHeading ? "italic" : "normal",
  };
}

/** The theme as a file to share; the id is left out, a shared theme is always one's own. */
export const themeFileText = (theme: Theme) =>
  `${JSON.stringify({ background: theme.background, text: theme.text, accent: theme.accent, heading: theme.heading }, null, 2)}\n`;
