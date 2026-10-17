import { Choice } from "@llkit/controls.js";
import { useState } from "react";
import { earnedOf } from "../../project/flair.js";
import type { Journey } from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { Dialog } from "@llkit/controls.js";
import { ProfileHead } from "./ProfileHead.js";
import { Badges } from "./Badges.js";
import { FlairPicker } from "./FlairPicker.js";
import type { Profile } from "./useProfile.js";
import { t } from "../../i18n/i18n.js";

interface Form extends Profile {
  name: string;
  bookAuthor: string;
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="profile-field">
      <span className="field-label">{props.label}</span>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function AboutField(props: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="profile-field">
      <span className="field-label">{t("Om författaren")}</span>
      <textarea
        value={props.value}
        placeholder={t("Några meningar om dig. De står under kapitel du skickar som nyhetsbrev.")}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

// The pen name belongs to a book, so it is asked only while one is open.
const PenName = (props: { form: Form; bookName: string; set: (change: Partial<Form>) => void }) => (
  <Field
    label={t("Författarnamn för {book}", { book: props.bookName })}
    value={props.form.bookAuthor}
    placeholder={t("Pseudonym, valfritt")}
    onChange={(bookAuthor) => props.set({ bookAuthor })}
  />
);

function ProfileFields({
  form,
  bookName,
  set,
}: {
  form: Form;
  bookName: string | null;
  set: (change: Partial<Form>) => void;
}) {
  return (
    <>
      <div className="profile-pair">
        <Field label={t("Namn")} value={form.name} onChange={(name) => set({ name })} />
        {bookName !== null && <PenName form={form} bookName={bookName} set={set} />}
      </div>
      <AboutField value={form.about} onChange={(about) => set({ about })} />
      <Field
        label={t("Länk till din sida eller ditt nyhetsbrev")}
        value={form.link}
        placeholder="https://"
        onChange={(link) => set({ link })}
      />
    </>
  );
}

function ProfileFoot({ onDone }: { onDone: () => void }) {
  return (
    <div className="profile-foot">
      <span className="setting-hint">
        {t(
          "Profilen sparas i din Penna-mapp. Loggar du in med Google följer den med till dina andra enheter.",
        )}
      </span>
      <button className="button primary" onClick={onDone}>
        {t("Klar")}
      </button>
    </div>
  );
}

type Part = "om" | "stil" | "utmarkelser";
const PARTS: [Part, string][] = [
  ["om", t("Om dig")],
  ["stil", t("Stil")],
  ["utmarkelser", t("Utmärkelser")],
];

function ProfilePart(props: {
  part: Part;
  form: Form;
  set: (change: Partial<Form>) => void;
  journey: Journey;
  book: { name: string; held: Record<string, string> } | null;
}) {
  const { form, set } = props;
  if (props.part === "om")
    return <ProfileFields form={form} bookName={props.book?.name ?? null} set={set} />;
  if (props.part === "utmarkelser") return <Badges journey={props.journey} book={props.book} />;
  const earned = earnedOf(props.journey, dayKey(Date.now()));
  return <FlairPicker earned={earned} frame={form.frame} title={form.title} onChange={set} />;
}

/** Författarprofil: who writes, kept in the Penna folder; no account, no sign-in. */
export function ProfileDialog(props: {
  initial: Form;
  journey: Journey;
  /** The open book, with its badges by the day each was reached; none on the shelf. */
  book: { name: string; held: Record<string, string> } | null;
  onSave: (form: Form) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(props.initial);
  const set = (change: Partial<Form>) => setForm((current) => ({ ...current, ...change }));
  const [part, setPart] = useState<Part>("om");
  const done = () => (props.onSave(form), props.onClose());
  return (
    <Dialog label={t("Författarprofil")} className="profile-dialog" onClose={done}>
      <ProfileHead form={form} journey={props.journey} onPicture={(picture) => set({ picture })} />
      <Choice label={t("Visa")} value={part} options={PARTS} onSelect={setPart} />
      <ProfilePart part={part} form={form} set={set} journey={props.journey} book={props.book} />
      <ProfileFoot onDone={done} />
    </Dialog>
  );
}

export type ProfileForm = Form;
