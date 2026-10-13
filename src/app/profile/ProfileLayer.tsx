import { earnedOf, wornFlair } from "../../project/flair.js";
import { dayKey } from "../../project/stats.js";
import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { Avatar } from "./Avatar.js";
import { bookBadgesHeld } from "../../project/bookBadges.js";
import { ProfileDialog, type ProfileForm } from "./ProfileDialog.js";
import { t } from "../../i18n/i18n.js";

/** What the profile needs of the app, on the shelf as in a book. */
type ProfileApp = Pick<AppState, "profile" | "startup" | "journey" | "updateFields">;

const textOf = (value: unknown) => (typeof value === "string" ? value : "");

function save(app: ProfileApp, project: Project | null, form: ProfileForm) {
  const { name, bookAuthor, ...profile } = form;
  app.profile.save(profile);
  if (name !== app.startup.preferences.authorName)
    app.startup.updatePreferences((current) => ({ ...current, authorName: name }));
  if (project && bookAuthor !== textOf(project.fields["author"]))
    void app.updateFields({ author: bookAuthor || undefined });
}

/** The profile dialog, from the top bar; on the shelf no book is open. */
export function ProfileLayer({ app, project }: { app: ProfileApp; project: Project | null }) {
  if (!app.profile.isOpen) return null;
  const initial = {
    ...app.profile.profile,
    name: app.startup.preferences.authorName,
    bookAuthor: textOf(project?.fields["author"]),
  };
  const book = project && { name: project.name, held: bookBadgesHeld(project.fields) ?? {} };
  return (
    <ProfileDialog
      initial={initial}
      journey={app.journey.journey}
      book={book}
      onSave={(form) => save(app, project, form)}
      onClose={app.profile.close}
    />
  );
}

/** At the top of the sidebar: who writes, and the way into the profile. */
/** The writer's picture in the top bar; it opens the profile. */
export function ProfileButton({ app }: { app: Pick<AppState, "profile" | "startup" | "journey"> }) {
  const name = app.startup.preferences.authorName;
  const earned = earnedOf(app.journey.journey, dayKey(Date.now()));
  const frame = wornFlair(app.profile.profile.frame, earned)?.id ?? "";
  return (
    <button
      className="topbar-button profile-button"
      aria-label={t("Din profil")}
      title={name || t("Din profil")}
      onClick={app.profile.open}
    >
      <Avatar name={name} picture={app.profile.profile.picture} size={22} frame={frame} />
    </button>
  );
}
