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
  type FocusMode,
  type ProseFont,
  type WritingSettings,
} from "../../editor/writingSettings.js";
import { manuscriptSceneIds, numberNodes, findNode, type NodeKind } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import type { SettingsChange } from "../useWritingSettings.js";
import type { PaletteEntry } from "./paletteSearch.js";

export interface PaletteContext {
  project: Project;
  settings: WritingSettings;
  openScene: (id: string) => void;
  add: (kind: NodeKind) => void;
  run: (command: Command) => void;
  changeSettings: (change: SettingsChange) => void;
  toggleFocusMode: () => void;
  openSearch: () => void;
  chooseFolder: () => void;
}

const command = (label: string, run: () => void, shortcut?: string): PaletteEntry => ({
  id: `kommando:${label}`,
  label,
  group: "Kommandon",
  run,
  ...(shortcut ? { shortcut } : {}),
});

function placeEntries({ project, openScene }: PaletteContext): PaletteEntry[] {
  const scenes = manuscriptSceneIds(project.tree).map((id): PaletteEntry => {
    const chapter = chapterOf(project.tree, id);
    return {
      id: `scen:${id}`,
      label: project.summaries[id]?.title ?? "Namnlös scen",
      group: "Scener",
      run: () => openScene(id),
      ...(chapter ? { hint: `Kapitel ${chapter.number}` } : {}),
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
        },
      ];
    },
  );
  return [...scenes, ...chapters];
}

function writingEntries(context: PaletteContext): PaletteEntry[] {
  const { run } = context;
  const styles = (Object.keys(STYLE_LABELS) as StyleChoice[]).map((style) =>
    command(`Stil: ${STYLE_LABELS[style]}`, () => run(setStyle(style))),
  );
  return [
    command("Ny scen", () => context.add("scene"), "Ctrl+Alt+N"),
    command("Nytt kapitel", () => context.add("chapter")),
    command("Ny del", () => context.add("part")),
    command("Ny mapp", () => context.add("folder")),
    command("Sök och ersätt", context.openSearch, "Ctrl+F"),
    command("Fokusläge", context.toggleFocusMode, "Ctrl+Shift+F"),
    command("Fetstil", () => run(toggleBold), "Ctrl+B"),
    command("Kursiv", () => run(toggleItalic), "Ctrl+I"),
    command("Rensa formatering", () => run(clearFormatting)),
    command("Scenbrytning", () => run(insertSceneBreak), "Ctrl+Enter"),
    ...styles,
  ];
}

const onOff = (isOn: boolean) => (isOn ? "av" : "på");

const FONTS: [ProseFont, string][] = [
  ["serif", "Serif"],
  ["sans", "Sans"],
  ["mono", "Mono"],
];
const FOCUS_MODES: [FocusMode, string][] = [
  ["av", "Av"],
  ["mening", "Mening"],
  ["stycke", "Stycke"],
];

const changeTo =
  (changes: Partial<WritingSettings>): SettingsChange =>
  (current) => ({ ...current, ...changes });

function textEntries({ changeSettings: change }: PaletteContext): PaletteEntry[] {
  return [
    command("Större text", () => change((current) => changeSize(current, 1)), "Ctrl++"),
    command("Mindre text", () => change((current) => changeSize(current, -1)), "Ctrl+-"),
    command(
      "Standardstorlek på texten",
      () => change(changeTo({ size: DEFAULT_SETTINGS.size })),
      "Ctrl+0",
    ),
    ...FONTS.map(([font, label]) =>
      command(`Typsnitt: ${label}`, () => change(changeTo({ font }))),
    ),
    command("Radavstånd: nästa", () =>
      change((current) => ({ ...current, lineHeight: nextLineHeight(current.lineHeight) })),
    ),
    command("Textbredd: nästa", () =>
      change((current) => ({ ...current, width: nextWidth(current.width) })),
    ),
  ];
}

function switchEntries({
  settings,
  changeSettings: change,
  chooseFolder,
}: PaletteContext): PaletteEntry[] {
  const flip = (label: string, key: "darkTheme" | "indent" | "typewriter") =>
    command(`${label} ${onOff(settings[key])}`, () => change(changeTo({ [key]: !settings[key] })));
  return [
    flip("Mörkt tema", "darkTheme"),
    flip("Indrag första rad", "indent"),
    flip("Typewriter", "typewriter"),
    ...FOCUS_MODES.map(([focus, label]) =>
      command(`Fokus: ${label}`, () => change(changeTo({ focus }))),
    ),
    command("Byt projektmapp", chooseFolder),
  ];
}

/** Everything the command palette can find: scenes, chapters, commands and settings. */
export function paletteEntries(context: PaletteContext): PaletteEntry[] {
  return [
    ...placeEntries(context),
    ...writingEntries(context),
    ...textEntries(context),
    ...switchEntries(context),
  ];
}
