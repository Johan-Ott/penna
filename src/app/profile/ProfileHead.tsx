import { earnedOf, wornFlair } from "../../project/flair.js";
import { journeySummary } from "../../project/inkwell.js";
import type { Journey } from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { platform } from "../platform.js";
import { Avatar } from "./Avatar.js";
import type { Profile } from "./useProfile.js";
import { t, formatNumber } from "../../i18n/i18n.js";

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

function factsOf(journey: Journey) {
  const summary = journeySummary(journey, dayKey(Date.now()));
  const days = Object.values(journey.words).filter((words) => words > 0).length;
  return [
    summary.level.name,
    summary.rank.name,
    t("{count} ord", { count: formatNumber(summary.words) }),
    days === 1 ? t("1 skrivdag") : t("{count} skrivdagar", { count: days }),
  ].join(" · ");
}

export function ProfileHead(props: {
  form: Pick<Profile, "picture" | "frame" | "title"> & { name: string };
  journey: Journey;
  onPicture: (picture: string) => void;
}) {
  const pick = async () => {
    const picked = await platform.pickFile(PICTURE);
    if (picked) props.onPicture(await smallPicture(picked.bytes));
  };
  const earned = earnedOf(props.journey, dayKey(Date.now()));
  const frame = wornFlair(props.form.frame, earned)?.id ?? "";
  const title = wornFlair(props.form.title, earned)?.name;
  return (
    <div className="profile-head">
      <Avatar name={props.form.name} picture={props.form.picture} size={64} frame={frame} />
      <span className="profile-who">
        <span className="profile-name">{props.form.name || t("Ditt namn")}</span>
        {title && <span className="profile-title">{title}</span>}
        <span className="insight-muted">{factsOf(props.journey)}</span>
      </span>
      <button className="button secondary small" onClick={() => void pick()}>
        {t("Byt bild")}
      </button>
    </div>
  );
}
