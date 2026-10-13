import type { ReactNode } from "react";
import type { AppState } from "../App.js";
import { BookIcon, ChartIcon, ImageIcon, NoteIcon, PeopleIcon } from "../shell/icons.js";
import { Colophon } from "../progress/Colophon.js";
import { SprintButton } from "../sprint/SprintBar.js";
import type { Project } from "../useProject.js";
import { BlockPanel } from "./BlockPanel.js";
import { openBlocks, toggleBlock } from "./layout.js";
import { LayoutButton } from "./LayoutButton.js";
import { InSceneBlock } from "./InSceneBlock.js";
import { ReferenceBlock } from "./ReferenceBlock.js";
import { ScratchBlock } from "./ScratchBlock.js";
import { t } from "../../i18n/i18n.js";

// The blocks as icons at the text's foot on the right, before Granska; each opens as a panel
// that can be moved, and closing it makes it an icon again.

type BlockId = "kladdlapp" | "iscenen" | "referens" | "kolofon";
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
    id: "kolofon",
    title: t("Kolofon"),
    icon: <BookIcon />,
    body: (props) =>
      Object.keys(props.app.stats).length > 0 ? (
        <Colophon project={props.project} stats={props.app.stats} />
      ) : (
        <p className="setting-hint reference-empty">
          {t("Kolofonen fylls i när du har skrivit några dagar.")}
        </p>
      ),
  },
  {
    id: "referens",
    title: t("Referensbild"),
    icon: <ImageIcon />,
    body: (props) => <ReferenceBlock project={props.project} />,
  },
];

// Insikter keeps its own open state, as Granska does; here it is one more icon.
function InsightsButton({ app }: { app: AppState }) {
  const { isProgressOpen, setProgressOpen } = app.writingMode;
  return (
    <button
      className={isProgressOpen ? "dock-button chosen" : "dock-button"}
      aria-label={t("Insikter")}
      aria-pressed={isProgressOpen}
      title={t("Insikter")}
      onClick={() => setProgressOpen(!isProgressOpen)}
    >
      <ChartIcon />
    </button>
  );
}

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
  const open = openBlocks.use();
  const toggle = toggleBlock;
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
        <InsightsButton app={props.app} />
        <LayoutButton app={props.app} />
        {props.review}
      </div>
    </>
  );
}
