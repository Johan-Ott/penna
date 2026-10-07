import type { Command } from "prosemirror-state";
import {
  clearFormatting,
  insertSceneBreak,
  setStyle,
  STYLE_LABELS,
  toggleBold,
  toggleItalic,
  type StyleChoice,
} from "../../editor/commands.js";
import {
  changeSize,
  DEFAULT_SETTINGS,
  nextLineHeight,
  nextWidth,
  THEME_LABELS,
  type Theme,
  type FocusMode,
  type ProseFont,
  type WritingSettings,
} from "../../editor/writingSettings.js";
import {
  manuscriptSceneIds,
  numberNodes,
  findNode,
  type NodeKind,
  type TreeNode,
} from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import type { SettingsChange } from "../useWritingSettings.js";
import type { PaletteEntry } from "./paletteSearch.js";
import { cardEntries, sceneEntries } from "./bookEntries.js";
import { VIEWS, type View } from "../useWritingMode.js";
import type { Card } from "../../project/cards.js";
import { insertFootnote } from "../../editor/footnoteEditing.js";
import { t } from "../../i18n/i18n.js";

export interface PaletteContext {
  project: Project;
  settings: WritingSettings;
  openScene: (id: string) => void;
  add: (kind: NodeKind) => void;
  run: (command: Command) => void;
  changeSettings: (change: SettingsChange) => void;
  toggleFocusMode: () => void;
  openSearch: () => void;
  /** Null on a phone, where Penna keeps its books in its own folder. */
  chooseFolder: (() => void) | null;
  showShelf: () => void;
  /** Null when no scene is open. */
  showSnapshots: (() => void) | null;
  openSettings: () => void;
  /** Null on a phone, which has its own screens instead of the views. */
  showView: ((view: View) => void) | null;
  cards: (Card & { sortLabel: string })[];
  /** The first sentence of a note, shown beside its name. */
  describe: (id: string) => string;
  openCard: (id: string) => void;
  newNote: () => void;
  /** Null when there is nothing to split or merge. */
  splitScene: (() => void) | null;
  mergeScene: (() => void) | null;
  /** Null when no text is open. */
  insertPicture: (() => void) | null;
  /** A chapter, or the whole book when null. Null on a phone, which has no reading view. */
  read: ((chapterId: string | null) => void) | null;
  openChapterId: string | null;
}

export const command = (label: string, run: () => void, shortcut?: string): PaletteEntry => ({
  id: `kommando:${label}`,
  label,
  group: "Kommandon",
  run,
  ...(shortcut ? { shortcut } : {}),
});

/** The node's labels, for the palette's label chips. */
export function labelled(tree: TreeNode[], id: string) {
  const labels = findNode(tree, id)?.node.labels;
  return labels?.length ? { labels } : {};
}

function placeEntries({ project, openScene }: PaletteContext): PaletteEntry[] {
  const scenes = manuscriptSceneIds(project.tree).map((id): PaletteEntry => {
    const chapter = chapterOf(project.tree, id);
    return {
      id: `scen:${id}`,
      label: project.summaries[id]?.title ?? t("Namnlös scen"),
      group: "Scener",
      run: () => openScene(id),
      ...(chapter ? { hint: t("Kapitel {number}", { number: chapter.number }) } : {}),
      ...labelled(project.tree, id),
    };
  });
  const chapters = [...numberNodes(project.tree, "chapter")].flatMap(
    ([id, number]): PaletteEntry[] => {
      const chapter = findNode(project.tree, id)?.node;
      const firstScene = chapter?.children?.find((child) => child.kind === "scene");
      if (!chapter || !firstScene) return [];
      return [
        {
          id: `kapitel:${id}`,
          label: `${number}. ${chapter.title ?? ""}`,
          group: "Kapitel",
          run: () => openScene(firstScene.id),
          ...labelled(project.tree, id),
        },
      ];
    },
  );
  return [...scenes, ...chapters];
}

function writingEntries(context: PaletteContext): PaletteEntry[] {
  const { run } = context;
  const styles = (Object.keys(STYLE_LABELS) as StyleChoice[]).map((style) =>
    command(t("Stil: {style}", { style: STYLE_LABELS[style] }), () => run(setStyle(style))),
  );
  return [
    command(t("Ny scen"), () => context.add("scene"), "Ctrl+Alt+N"),
    command(t("Nytt kapitel"), () => context.add("chapter")),
    command(t("Ny del"), () => context.add("part")),
    command(t("Ny mapp"), () => context.add("folder")),
    command(t("Ny anteckning"), context.newNote),
    ...sceneEntries(context),
    command(t("Sök och ersätt"), context.openSearch, "Ctrl+F"),
    command(t("Fokusläge"), context.toggleFocusMode, "Ctrl+Shift+F"),
    ...(context.showSnapshots
      ? [command(t("Versioner av den här texten"), context.showSnapshots)]
      : []),
    command(t("Inställningar"), context.openSettings, "Ctrl+,"),
    ...viewEntries(context.showView),
    command(t("Fetstil"), () => run(toggleBold), "Ctrl+B"),
    command(t("Kursiv"), () => run(toggleItalic), "Ctrl+I"),
    command(t("Rensa formatering"), () => run(clearFormatting)),
    command(t("Scenbrytning"), () => run(insertSceneBreak), "Ctrl+Enter"),
    command(t("Infoga fotnot"), () => run(insertFootnote), "Ctrl+Alt+F"),
    ...(context.insertPicture ? [command(t("Infoga bild…"), context.insertPicture)] : []),
    ...styles,
  ];
}

const onOff = (isOn: boolean) => (isOn ? t("av") : t("på"));

const FONTS: [ProseFont, string][] = [
  ["serif", "Serif"],
  ["sans", "Sans"],
  ["mono", "Mono"],
];
const FOCUS_MODES: [FocusMode, string][] = [
  ["av", t("Av")],
  ["mening", t("Mening")],
  ["stycke", t("Stycke")],
];

const changeTo =
  (changes: Partial<WritingSettings>): SettingsChange =>
  (current) => ({ ...current, ...changes });

function textEntries({ changeSettings: change }: PaletteContext): PaletteEntry[] {
  return [
    command(t("Större text"), () => change((current) => changeSize(current, 1)), "Ctrl++"),
    command(t("Mindre text"), () => change((current) => changeSize(current, -1)), "Ctrl+-"),
    command(
      t("Standardstorlek på texten"),
      () => change(changeTo({ size: DEFAULT_SETTINGS.size })),
      "Ctrl+0",
    ),
    ...FONTS.map(([font, label]) =>
      command(t("Typsnitt: {font}", { font: label }), () => change(changeTo({ font }))),
    ),
    command(t("Radavstånd: nästa"), () =>
      change((current) => ({ ...current, lineHeight: nextLineHeight(current.lineHeight) })),
    ),
    command(t("Textbredd: nästa"), () =>
      change((current) => ({ ...current, width: nextWidth(current.width) })),
    ),
  ];
}

const viewEntries = (showView: PaletteContext["showView"]) =>
  showView
    ? VIEWS.map(([view, label, keys]) =>
        command(t("Gå till {view}", { view: label }), () => showView(view), keys),
      )
    : [];

function switchEntries({
  settings,
  changeSettings: change,
  chooseFolder,
  showShelf,
}: PaletteContext): PaletteEntry[] {
  const flip = (label: string, key: "indent" | "typewriter") =>
    command(`${label} ${onOff(settings[key])}`, () => change(changeTo({ [key]: !settings[key] })));
  return [
    ...(Object.keys(THEME_LABELS) as Theme[]).map((theme) =>
      command(`Utseende: ${THEME_LABELS[theme]}`, () => change(changeTo({ theme }))),
    ),
    flip(t("Indrag första rad"), "indent"),
    flip(t("Typewriter"), "typewriter"),
    ...FOCUS_MODES.map(([focus, label]) =>
      command(`Fokus: ${label}`, () => change(changeTo({ focus }))),
    ),
    command(t("Bokhylla"), showShelf),
    ...(chooseFolder ? [command(t("Öppna projektmapp…"), chooseFolder)] : []),
  ];
}

export function paletteEntries(context: PaletteContext): PaletteEntry[] {
  return [
    ...placeEntries(context),
    ...cardEntries(context),
    ...writingEntries(context),
    ...textEntries(context),
    ...switchEntries(context),
  ];
}
