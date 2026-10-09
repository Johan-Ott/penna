import { badges, type Badge } from "../../project/badges.js";
import type { Journey } from "../../project/journey.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const dateOf = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(numberLocale(), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// A medal with the badge's first letter; dim and dashed until it is unlocked.
function Medal({ badge, day }: { badge: Badge; day: string | undefined }) {
  return (
    <li className={day ? "badge" : "badge locked"} title={badge.hint}>
      <span className="badge-medal" aria-hidden="true">
        {badge.name.charAt(0)}
      </span>
      <span className="badge-name">{badge.name}</span>
      <span className="badge-when">{day ? dateOf(day) : badge.hint}</span>
    </li>
  );
}

/** Första resan as steps to tick off, then every badge, unlocked or still to reach. */
export function Badges({ journey }: { journey: Journey }) {
  const all = badges();
  const steps = all.filter((badge) => badge.group === "resan");
  const done = steps.filter((badge) => journey.badges[badge.id]).length;
  const milestones = all.filter((badge) => badge.group === "milstolpe");
  const unlocked = milestones.filter((badge) => journey.badges[badge.id]).length;
  return (
    <section className="profile-badges">
      <span className="field-label">
        {t("Första resan")} · {t("{done} av {count}", { done, count: steps.length })}
      </span>
      <ol className="first-journey">
        {steps.map((badge) => (
          <li key={badge.id} className={journey.badges[badge.id] ? "done" : ""}>
            <span className="first-journey-check" aria-hidden="true" />
            <span>{journey.badges[badge.id] ? badge.name : badge.hint}</span>
          </li>
        ))}
      </ol>
      <span className="field-label">
        {t("Utmärkelser")} · {t("{done} av {count}", { done: unlocked, count: milestones.length })}
      </span>
      <ul className="badge-grid">
        {milestones.map((badge) => (
          <Medal key={badge.id} badge={badge} day={journey.badges[badge.id]} />
        ))}
      </ul>
    </section>
  );
}
