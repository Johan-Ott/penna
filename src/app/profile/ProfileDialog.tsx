import { useState } from "react";
import { journeySummary } from "../../project/inkwell.js";
import type { Journey } from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { Dialog } from "../controls.js";
import { platform } from "../platform.js";
import { Avatar } from "./Avatar.js";
import type { Profile } from "./useProfile.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const PICTURE = { name: t("Bild"), extensions: ["jpg", "jpeg", "png"] };
const SIDE = 192;

// Cut to a square from the middle and made small, so the profile file stays small.
async function smallPicture(bytes: Uint8Array) {
  const image = await createImageBitmap(new Blob([bytes.slice()]));
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIDE;
  const left = (image.width - side) / 2;
  const top = (image.height - side) / 2;
  canvas.getContext("2d")?.drawImage(image, left, top, side, side, 0, 0, SIDE, SIDE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

interface Form extends Profile {
  name: string;
  bookAuthor: string;
}

function factsOf(journey: Journey) {
  const summary = journeySummary(journey, dayKey(Date.now()));
  const days = Object.values(journey.words).filter((words) => words > 0).length;
  return [
    summary.level.name,
    t("{count} ord", { count: summary.words.toLocaleString(numberLocale()) }),
    days === 1 ? t("1 skrivdag") : t("{count} skrivdagar", { count: days }),
  ].join(" · ");
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

function ProfileHead(props: {
  form: Form;
  journey: Journey;
  onPicture: (picture: string) => void;
}) {
  const pick = async () => {
    const picked = await platform.pickFile(PICTURE);
    if (picked) props.onPicture(await smallPicture(picked.bytes));
  };
  return (
    <div className="profile-head">
      <Avatar name={props.form.name} picture={props.form.picture} size={64} />
      <span className="profile-who">
        <span className="profile-name">{props.form.name || t("Ditt namn")}</span>
        <span className="insight-muted">{factsOf(props.journey)}</span>
      </span>
      <button className="button secondary small" onClick={() => void pick()}>
        {t("Byt bild")}
      </button>
    </div>
  );
}

function AboutField(props: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="profile-field">
      <span className="field-label">{t("Om författaren")}</span>
      <textarea
        value={props.value}
        placeholder={t("Några meningar om dig. Används på delningskort.")}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function ProfileFields({
  form,
  bookName,
  set,
}: {
  form: Form;
  bookName: string;
  set: (change: Partial<Form>) => void;
}) {
  return (
    <>
      <div className="profile-pair">
        <Field label={t("Namn")} value={form.name} onChange={(name) => set({ name })} />
        <Field
          label={t("Författarnamn för {book}", { book: bookName })}
          value={form.bookAuthor}
          placeholder={t("Pseudonym, valfritt")}
          onChange={(bookAuthor) => set({ bookAuthor })}
        />
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

/** Författarprofil: who writes, kept in the Penna folder; no account, no sign-in. */
export function ProfileDialog(props: {
  initial: Form;
  bookName: string;
  journey: Journey;
  onSave: (form: Form) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(props.initial);
  const set = (change: Partial<Form>) => setForm((current) => ({ ...current, ...change }));
  const done = () => (props.onSave(form), props.onClose());
  return (
    <Dialog label={t("Författarprofil")} className="profile-dialog" onClose={done}>
      <ProfileHead form={form} journey={props.journey} onPicture={(picture) => set({ picture })} />
      <ProfileFields form={form} bookName={props.bookName} set={set} />
      <div className="profile-foot">
        <span className="setting-hint">
          {t(
            "Profilen sparas i din Penna-mapp och namnet i inställningarna. Inget konto, ingen inloggning.",
          )}
        </span>
        <button className="button primary" onClick={done}>
          {t("Klar")}
        </button>
      </div>
    </Dialog>
  );
}

export type ProfileForm = Form;
