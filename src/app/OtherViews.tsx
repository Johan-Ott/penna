import type { AppState } from "./App.js";
import { BookDesignView } from "./bookdesign/BookDesignView.js";
import { ExportView } from "./exporting/ExportView.js";
import { PlanView } from "./planning/PlanView.js";
import { ProgressView } from "./progress/ProgressView.js";
import { openIfOnDisk } from "./useSceneSession.js";
import type { Project } from "./useProject.js";

// "Gå till scenen" after a failed export: the scene is found by the title the error named.
function openSceneTitled(app: AppState, project: Project, title: string) {
  const id = Object.keys(project.summaries).find((key) => project.summaries[key]?.title === title);
  if (!id) return;
  app.writingMode.setView("skriv");
  openIfOnDisk(app.session, project, id);
}

/** The views beside Skriv. Skriv itself stays mounted underneath, so its scene is kept. */
export function OtherViews({ app, project }: { app: AppState; project: Project }) {
  const view = app.writingMode.view;
  const saveFields = (fields: Record<string, unknown>) => void app.updateFields(fields);
  if (view === "planera") {
    return <PlanView planning={app.planning} project={project} cards={app.cards} />;
  }
  if (view === "framsteg") {
    return <ProgressView project={project} stats={app.stats} onSaveGoals={saveFields} />;
  }
  if (view === "bokdesign") {
    const generalAuthor = app.startup.preferences.authorName;
    return (
      <BookDesignView project={project} generalAuthor={generalAuthor} onSaveFields={saveFields} />
    );
  }
  if (view !== "exportera") return null;
  return (
    <ExportView
      project={project}
      generalAuthor={app.startup.preferences.authorName}
      onSaveFields={saveFields}
      onOpenScene={(title) => openSceneTitled(app, project, title)}
    />
  );
}
