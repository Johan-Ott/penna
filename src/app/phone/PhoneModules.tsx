import type { ReactNode } from "react";
import type { AppState } from "../App.js";
import { InSceneBlock } from "../blocks/InSceneBlock.js";
import { ReferenceBlock } from "../blocks/ReferenceBlock.js";
import { StickyNoteCard } from "../blocks/StickyNotes.js";
import { useStickyNotes } from "../blocks/useStickyNotes.js";
import { CloseButton } from "../controls.js";
import {
  ChartIcon,
  GridIcon,
  ImageIcon,
  NoteIcon,
  PeopleIcon,
  ReviewIcon,
  TimerIcon,
} from "../shell/icons.js";
import { setPanelOpen } from "../sprint/sprint.js";
import { createStore } from "../store.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

// The computer's blocks on a phone, in its dock's order, listed by one button in Skriv's bar;
// the sprint, Insikter and Granska open in their own places, the others as a sheet from below.

type ModuleId = "lappar" | "iscenen" | "referens";
type Props = { app: AppState; project: Project };

const shown = createStore<ModuleId | "lista" | null>(null);

const MODULES: { id: ModuleId; title: string; icon: ReactNode }[] = [
  { id: "lappar", title: t("Lappar"), icon: <NoteIcon /> },
  { id: "iscenen", title: t("I scenen"), icon: <PeopleIcon /> },
  { id: "referens", title: t("Referensbild"), icon: <ImageIcon /> },
];

// The ones with a place of their own, opened there; the sheet closes for them.
function openOwn(app: AppState) {
  const { writingMode } = app;
  return [
    { title: t("Skrivsprint"), icon: <TimerIcon />, open: () => setPanelOpen(true), count: 0 },
    {
      title: t("Insikter"),
      icon: <ChartIcon />,
      open: () => writingMode.setProgressOpen(true),
      count: 0,
    },
    {
      title: t("Granska"),
      icon: <ReviewIcon />,
      open: () => writingMode.setReviewOpen(true),
      count: writingMode.review.count ?? 0,
    },
  ];
}

export function ModulesButton({ app }: { app: AppState }) {
  const count = app.writingMode.review.count ?? 0;
  return (
    <button
      className="topbar-button review-dock"
      aria-label={t("Moduler")}
      onClick={() => shown.set("lista")}
    >
      <GridIcon />
      {count > 0 && <span className="dock-badge">{count}</span>}
    </button>
  );
}

function PhoneNotes({ project }: { project: Project }) {
  const state = useStickyNotes(project.dir);
  return (
    <div className="phone-notes">
      {(state.notes ?? []).map((note) => (
        <StickyNoteCard key={note.id} note={note} state={state} isInGrid />
      ))}
      <button className="phone-note-add" onClick={() => state.add({ left: 24, top: 64 })}>
        {t("+ Ny lapp")}
      </button>
    </div>
  );
}

function ModuleBody({ id, app, project }: Props & { id: ModuleId }) {
  if (id === "lappar") return <PhoneNotes project={project} />;
  if (id === "iscenen") return <InSceneBlock app={app} />;
  return <ReferenceBlock project={project} />;
}

function ModuleList({ app }: { app: AppState }) {
  const choose = (open: () => void) => () => (shown.set(null), open());
  return (
    <div className="phone-module-list">
      {MODULES.map((module) => (
        <button key={module.id} className="phone-module" onClick={() => shown.set(module.id)}>
          {module.icon}
          <span>{module.title}</span>
        </button>
      ))}
      {openOwn(app).map((own) => (
        <button key={own.title} className="phone-module" onClick={choose(own.open)}>
          {own.icon}
          <span>{own.title}</span>
          {own.count > 0 && <span className="dock-badge">{own.count}</span>}
        </button>
      ))}
    </div>
  );
}

// A module chosen is a screen of its own, as the other panels: back to the list, its name, ×.
function ModulePage({ id, app, project }: Props & { id: ModuleId }) {
  const title = MODULES.find((module) => module.id === id)?.title;
  return (
    <section className="block-panel phone-module-page" aria-label={title}>
      <header className="block-head">
        <button
          className="topbar-button phone-bar-back"
          aria-label={t("Moduler")}
          data-phone-back
          onClick={() => shown.set("lista")}
        >
          ‹
        </button>
        <span className="block-title">{title}</span>
        <CloseButton onClose={() => shown.set(null)} />
      </header>
      <ModuleBody id={id} app={app} project={project} />
    </section>
  );
}

/** The list as a sheet from below; a module chosen from it fills the screen. */
export function ModulesSheet({ app, project }: Props) {
  const open = shown.use();
  if (!open) return null;
  if (open !== "lista") return <ModulePage id={open} app={app} project={project} />;
  return (
    <>
      <div className="phone-sheet-backdrop" onClick={() => shown.set(null)} />
      <section className="phone-sheet" aria-label={t("Moduler")}>
        <header className="phone-sheet-head">
          <span className="phone-sheet-title">{t("Moduler")}</span>
          <CloseButton isPhoneBack onClose={() => shown.set(null)} />
        </header>
        <div className="phone-sheet-body">
          <ModuleList app={app} />
        </div>
      </section>
    </>
  );
}
