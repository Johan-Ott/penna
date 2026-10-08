import { withNodeFields } from "../../project/contents.js";
import { earlyMentions, secretsKnownBy, secretsOf, type Secret } from "../../project/secrets.js";
import {
  CHARACTERS_ID,
  manuscriptSceneIds,
  sceneIdsIn,
  type TreeNode,
} from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import type { Notes } from "./useNotes.js";
import { t } from "../../i18n/i18n.js";

interface SecretProps {
  book: Project;
  noteId: string;
  notes: Notes;
  onOpen: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
}

function sceneName(book: Project, sceneId: string) {
  const chapter = chapterOf(book.tree, sceneId);
  const title = book.summaries[sceneId]?.title ?? "";
  return chapter ? `${chapter.number}. ${chapter.title} · ${title}` : title;
}

function ScenePicker(props: {
  book: Project;
  label: string;
  value: string;
  onPick: (sceneId: string) => void;
}) {
  return (
    <select
      className="secret-scene"
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onPick(event.target.value)}
    >
      <option value="">{t("Inte bestämt")}</option>
      {manuscriptSceneIds(props.book.tree).map((id) => (
        <option key={id} value={id}>
          {sceneName(props.book, id)}
        </option>
      ))}
    </select>
  );
}

type SaveKnown = (knownBy: Record<string, string>) => void;

function PersonRow(props: { book: Project; secret: Secret; personId: string; save: SaveKnown }) {
  const { book, secret, personId } = props;
  const name = book.summaries[personId]?.title ?? "";
  const pick = (sceneId: string) =>
    props.save(
      sceneId ? { ...secret.knownBy, [personId]: sceneId } : omit(secret.knownBy, personId),
    );
  return (
    <div className="secret-row">
      <span className="secret-person">{name}</span>
      <ScenePicker
        book={book}
        label={t("När {name} får veta", { name })}
        value={secret.knownBy[personId] ?? ""}
        onPick={pick}
      />
    </div>
  );
}

// Someone new learns it where the reader does, until the writer picks another scene.
function AddPerson(props: { book: Project; secret: Secret; save: SaveKnown }) {
  const { book, secret } = props;
  const unknowing = sceneIdsIn(book.tree, CHARACTERS_ID).filter((id) => !secret.knownBy[id]);
  if (unknowing.length === 0) return null;
  const start = secret.reveal ?? manuscriptSceneIds(book.tree)[0] ?? "";
  return (
    <select
      className="secret-add"
      aria-label={t("Lägg till en person som får veta")}
      value=""
      onChange={(event) => props.save({ ...secret.knownBy, [event.target.value]: start })}
    >
      <option value="">{t("+ Person som får veta")}</option>
      {unknowing.map((id) => (
        <option key={id} value={id}>
          {book.summaries[id]?.title ?? ""}
        </option>
      ))}
    </select>
  );
}

function WhoKnows({ props, secret }: { props: SecretProps; secret: Secret }) {
  const { book } = props;
  const save: SaveKnown = (knownBy) =>
    props.onChangeTree(
      withNodeFields(book.tree, secret.id, {
        knownBy: Object.keys(knownBy).length > 0 ? knownBy : undefined,
      }),
    );
  return (
    <div className="secret-people">
      {Object.keys(secret.knownBy).map((personId) => (
        <PersonRow key={personId} book={book} secret={secret} personId={personId} save={save} />
      ))}
      <AddPerson book={book} secret={secret} save={save} />
    </div>
  );
}

const omit = (record: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([each]) => each !== key));

function EarlyWarning({ props, secret }: { props: SecretProps; secret: Secret }) {
  const early = earlyMentions(
    props.book.tree,
    secret,
    props.notes.mentions.get(secret.id)?.sceneIds ?? [],
  );
  if (early.length === 0) return null;
  return (
    <div className="secret-warning" role="note">
      <span>{t("Nämns före avslöjandet:")}</span>
      {early.map((sceneId) => (
        <button key={sceneId} className="link-button" onClick={() => props.onOpen(sceneId)}>
          {sceneName(props.book, sceneId)}
        </button>
      ))}
    </div>
  );
}

/** A secret's page: where the reader learns it, who learns it when, and where it slips out early. */
export function SecretPanel(props: SecretProps) {
  const secret = secretsOf(props.book.tree, props.book.summaries).find(
    (each) => each.id === props.noteId,
  );
  if (!secret) return null;
  const reveal = (sceneId: string) =>
    props.onChangeTree(
      withNodeFields(props.book.tree, secret.id, { reveal: sceneId || undefined }),
    );
  return (
    <section className="secret-panel" aria-label={t("Vem vet vad")}>
      <label className="secret-row">
        <span className="secret-person">{t("Läsaren får veta i")}</span>
        <ScenePicker
          book={props.book}
          label={t("Läsaren får veta i")}
          value={secret.reveal ?? ""}
          onPick={reveal}
        />
      </label>
      <WhoKnows props={props} secret={secret} />
      <EarlyWarning props={props} secret={secret} />
    </section>
  );
}

/** A person's page: the secrets they learn, and from which scene. */
export function PersonSecrets(props: SecretProps) {
  const known = secretsKnownBy(
    props.book.tree,
    secretsOf(props.book.tree, props.book.summaries),
    props.noteId,
  );
  if (known.length === 0) return null;
  return (
    <section className="secret-panel" aria-label={t("Vet om")}>
      <span className="note-mentions-heading">{t("Vet om")}</span>
      {known.map(({ secret, from }) => (
        <button key={secret.id} className="note-mention" onClick={() => props.onOpen(secret.id)}>
          <span className="note-mention-place">
            {t("från {scene}", { scene: sceneName(props.book, from) })}
          </span>
          <span className="note-mention-text">{secret.name}</span>
        </button>
      ))}
    </section>
  );
}
