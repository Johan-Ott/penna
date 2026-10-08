import { useEffect, useState } from "react";
import { readComments, type Comment } from "../../project/comments.js";
import { chapterOf } from "../../project/treeLabels.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type Task = { sceneId: string; comment: Comment };

// Only the scenes that have a comments file are read, so a save costs nothing here.
export async function openTasks(project: Project): Promise<Task[]> {
  const files = await platform.fileSystem.list(joinPath(project.dir, "comments"));
  const sceneIds = files.filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5));
  const lists = await Promise.all(
    sceneIds.map(async (sceneId) =>
      (await readComments(platform.fileSystem, project.dir, sceneId))
        .filter((comment) => !comment.replyTo && !comment.resolved)
        .map((comment) => ({ sceneId, comment })),
    ),
  );
  return lists.flat().sort((one, other) => one.comment.createdAt - other.comment.createdAt);
}

function placeOf(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const title = project.summaries[sceneId]?.title ?? "";
  return chapter ? `${chapter.number}. ${chapter.title} · ${title}` : title;
}

// Read again when the book or the open scene's comments change, not on every save as the project does.
function useOpenTasks(project: Project, comments: Comment[]) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { dir } = project;
  useEffect(() => {
    let isLive = true;
    void openTasks(project)
      .then((found) => isLive && setTasks(found))
      .catch(() => undefined);
    return () => void (isLive = false);
  }, [dir, comments]);
  return tasks;
}

/** Every comment not yet resolved, in the whole book: the revision's to-do list. */
export function BookTasks(props: {
  project: Project;
  openSceneId: string;
  /** Changes when the open scene's comments do, so the list follows them. */
  comments: Comment[];
  onOpen: (sceneId: string) => void;
}) {
  const { project, comments } = props;
  const tasks = useOpenTasks(project, comments);
  const elsewhere = tasks.filter((task) => task.sceneId !== props.openSceneId);
  if (elsewhere.length === 0) return null;
  return (
    <section className="review-section" aria-label={t("Öppna uppgifter i boken")}>
      <span className="review-heading">{t("Öppna uppgifter i boken")}</span>
      {elsewhere.map(({ sceneId, comment }) => (
        <button
          key={comment.id}
          className="review-item book-task"
          onClick={() => props.onOpen(sceneId)}
        >
          <span className="kpi-sub">{placeOf(project, sceneId)}</span>
          <span>{comment.body}</span>
        </button>
      ))}
    </section>
  );
}
