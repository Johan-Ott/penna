import type { Command, EditorState } from "prosemirror-state";
import type { ReactNode } from "react";
import { currentStyle, setStyle } from "../editor/commands.js";
import { Icon } from "./shell/icons.js";
import { t } from "../i18n/i18n.js";

type Run = (command: Command) => void;

const AlignLeftIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16" />
    <path d="M4 12h10" />
    <path d="M4 17h14" />
  </Icon>
);

const AlignCenterIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16" />
    <path d="M7 12h10" />
    <path d="M5 17h14" />
  </Icon>
);

const AlignRightIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16" />
    <path d="M10 12h10" />
    <path d="M6 17h14" />
  </Icon>
);

const BulletIcon = () => (
  <Icon size={16}>
    <path d="M9 7h11" />
    <path d="M9 12h11" />
    <path d="M9 17h11" />
    <circle cx="4.5" cy="7" r="0.8" />
    <circle cx="4.5" cy="12" r="0.8" />
    <circle cx="4.5" cy="17" r="0.8" />
  </Icon>
);

const NumberedIcon = () => (
  <Icon size={16}>
    <path d="M10 7h10" />
    <path d="M10 12h10" />
    <path d="M10 17h10" />
    <path d="M4 5.5 5.5 4.5v5" />
    <path d="M4 14.5c.5-1 2.5-1 2.5.3 0 1-2.5 1.7-2.5 3.2h2.5" />
  </Icon>
);

const IndentIcon = () => (
  <Icon size={16}>
    <path d="M4 6h16" />
    <path d="M11 10h9" />
    <path d="M11 14h9" />
    <path d="M4 18h16" />
    <path d="m4 9.5 3 2.5-3 2.5" />
  </Icon>
);

// Each a style around the paragraphs: chosen again, the paragraphs are plain text once more.
const BLOCK_STYLES: ["punktlista" | "numrerad" | "indrag", string, ReactNode][] = [
  ["punktlista", t("Punktlista"), <BulletIcon key="p" />],
  ["numrerad", t("Numrerad lista"), <NumberedIcon key="n" />],
  ["indrag", t("Indrag"), <IndentIcon key="i" />],
];

export function ListButtons({ editorState, run }: { editorState: EditorState | null; run: Run }) {
  const current = editorState ? currentStyle(editorState) : "brodtext";
  return (
    <span className="bar-group" role="group" aria-label={t("Listor")}>
      {BLOCK_STYLES.map(([choice, label, icon]) => (
        <button
          key={choice}
          className="icon-button"
          aria-label={label}
          title={label}
          aria-pressed={current === choice}
          onClick={() => run(setStyle(current === choice ? "brodtext" : choice))}
        >
          {icon}
        </button>
      ))}
    </span>
  );
}

// Vänster, centrerat and höger are the styles of those names; vänster leaves any other style be.
const ALIGNMENTS: ["vanster" | "centrerat" | "hoger", string, ReactNode][] = [
  ["vanster", t("Vänsterställt"), <AlignLeftIcon key="v" />],
  ["centrerat", t("Centrerat"), <AlignCenterIcon key="c" />],
  ["hoger", t("Högerställt"), <AlignRightIcon key="h" />],
];

export function AlignButtons({ editorState, run }: { editorState: EditorState | null; run: Run }) {
  const current = editorState ? currentStyle(editorState) : "brodtext";
  const isSet = (choice: string) =>
    choice === "vanster" ? current !== "centrerat" && current !== "hoger" : current === choice;
  const choose = (choice: string) => {
    if (choice !== "vanster") return run(setStyle(choice as "centrerat" | "hoger"));
    if (current === "centrerat" || current === "hoger") run(setStyle("brodtext"));
  };
  return (
    <span className="bar-group" role="group" aria-label={t("Justering")}>
      {ALIGNMENTS.map(([choice, label, icon]) => (
        <button
          key={choice}
          className="icon-button"
          aria-label={label}
          title={label}
          aria-pressed={isSet(choice)}
          onClick={() => choose(choice)}
        >
          {icon}
        </button>
      ))}
    </span>
  );
}
