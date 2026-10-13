import { useState, type ReactNode } from "react";
import type { AppState } from "../App.js";
import { ImageIcon, NoteIcon, PeopleIcon } from "../shell/icons.js";
import { SprintButton } from "../sprint/SprintBar.js";
import type { Project } from "../useProject.js";
import { BlockPanel } from "./BlockPanel.js";
import { InSceneBlock } from "./InSceneBlock.js";
import { ReferenceBlock } from "./ReferenceBlock.js";
import { ScratchBlock } from "./ScratchBlock.js";
import { t } from "../../i18n/i18n.js";

// The blocks as icons at the text's foot on the right, before Granska; each opens as a panel
// that can be moved, and closing it makes it an icon again.

type BlockId = "kladdlapp" | "iscenen" | "referens";
type Props = { app: AppState; project: Project; review: ReactNode };
type Block = { id: BlockId; title: string; icon: ReactNode; body: (props: Props) => ReactNode };

const BLOCKS: Block[] = [
  {
    id: "kladdlapp",
    title: t("Kladdlapp"),
    icon: <NoteIcon />,
    body: (props) => <ScratchBlock dir={props.project.dir} />,
  },
  {
    id: "iscenen",
    title: t("I scenen"),
    icon: <PeopleIcon />,
    body: (props) => <InSceneBlock app={props.app} />,
  },
  {
    id: "referens",
    title: t("Referensbild"),
    icon: <ImageIcon />,
    body: (props) => <ReferenceBlock project={props.project} />,
  },
];

function DockButton(props: { block: Block; isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      className={props.isOpen ? "dock-button chosen" : "dock-button"}
      aria-label={props.block.title}
      aria-pressed={props.isOpen}
      title={props.block.title}
      onClick={props.onToggle}
    >
      {props.block.icon}
    </button>
  );
}

export function BlocksDock(props: Props) {
  const [open, setOpen] = useState<BlockId[]>([]);
  const toggle = (id: BlockId) =>
    setOpen((now) => (now.includes(id) ? now.filter((each) => each !== id) : [...now, id]));
  return (
    <>
      {BLOCKS.filter((block) => open.includes(block.id)).map((block) => (
        <BlockPanel key={block.id} {...block} onClose={() => toggle(block.id)}>
          {block.body(props)}
        </BlockPanel>
      ))}
      <div className="blocks-dock">
        {BLOCKS.map((block) => (
          <DockButton
            key={block.id}
            block={block}
            isOpen={open.includes(block.id)}
            onToggle={() => toggle(block.id)}
          />
        ))}
        <SprintButton look="dock-button" />
        {props.review}
      </div>
    </>
  );
}
