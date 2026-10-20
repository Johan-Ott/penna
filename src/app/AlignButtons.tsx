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
