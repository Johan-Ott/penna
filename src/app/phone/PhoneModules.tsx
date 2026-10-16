import type { ReactNode } from "react";
import type { AppState } from "../App.js";
import { InSceneBlock } from "../blocks/InSceneBlock.js";
import { ReferenceBlock } from "../blocks/ReferenceBlock.js";
import { StickyNoteCard } from "../blocks/StickyNotes.js";
import { useStickyNotes } from "../blocks/useStickyNotes.js";
import { CloseButton } from "../controls.js";
import { Colophon } from "../progress/Colophon.js";
import {
  BookIcon,
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

type ModuleId = "lappar" | "iscenen" | "referens" | "kolofon";
type Props = { app: AppState; project: Project };

const shown = createStore<ModuleId | "lista" | null>(null);

const MODULES: { id: ModuleId; title: string; icon: ReactNode }[] = [
  { id: "lappar", title: t("Lappar"), icon: <NoteIcon /> },
  { id: "iscenen", title: t("I scenen"), icon: <PeopleIcon /> },
  { id: "kolofon", title: t("Kolofon"), icon: <BookIcon /> },
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
  if (id === "referens") return <ReferenceBlock project={project} />;
  if (Object.keys(app.stats).length === 0)
    return <p className="setting-hint">{t("Kolofonen fylls i när du har skrivit några dagar.")}</p>;
  return <Colophon project={project} stats={app.stats} />;
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

/** The list, or the module chosen from it, as a sheet from below. */
export function ModulesSheet({ app, project }: Props) {
  const open = shown.use();
  if (!open) return null;
  const title =
    open === "lista" ? t("Moduler") : MODULES.find((module) => module.id === open)?.title;
  return (
    <>
      <div className="phone-sheet-backdrop" onClick={() => shown.set(null)} />
      <section className="phone-sheet" aria-label={title}>
        <header className="phone-sheet-head">
          {open !== "lista" && (
            <button className="link-button" onClick={() => shown.set("lista")}>
              {t("← Moduler")}
            </button>
          )}
          <span className="phone-sheet-title">{title}</span>
          <CloseButton isPhoneBack onClose={() => shown.set(null)} />
        </header>
        <div className="phone-sheet-body">
          {open === "lista" ? (
            <ModuleList app={app} />
          ) : (
            <ModuleBody id={open} app={app} project={project} />
          )}
        </div>
      </section>
    </>
  );
}
