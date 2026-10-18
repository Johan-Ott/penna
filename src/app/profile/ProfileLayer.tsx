import { earnedOf, wornFlair } from "../../project/flair.js";
import { dayKey } from "../../project/stats.js";
import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { Avatar } from "./Avatar.js";
import { bookBadgesHeld } from "../../project/bookBadges.js";
import { ProfileDialog, type ProfileForm } from "./ProfileDialog.js";
import { useMenuButton, type MenuItem } from "@llkit/Menu.js";
import { recordFailure } from "@llkit/errorLog.js";
import { checkForUpdates } from "@llkit/updates.js";
import { signIn, signOut } from "../googleAccount.js";
import { platform } from "../platform.js";
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

type ProfileButtonApp = Pick<AppState, "profile" | "startup" | "journey">;

// Where a writer looks for the account, as in any app: the profile, signing in or out, updates.
function googleItems(app: ProfileButtonApp): MenuItem[] {
  const { preferences, updatePreferences } = app.startup;
  if (!platform.googleSignIn) return [];
  if (preferences.isDriveSyncOn)
    return [{ label: t("Logga ut från Google"), onSelect: () => void signOut(updatePreferences) }];
  const start = () => void signIn(updatePreferences).catch(recordFailure("Inloggning med Google"));
  return [{ label: t("Logga in med Google…"), onSelect: start }];
}

function accountItems(app: ProfileButtonApp): MenuItem[] {
  const google = googleItems(app);
  return [
    { label: t("Din profil…"), onSelect: app.profile.open },
    ...google.map((item, index) => ({ ...item, separatorBefore: index === 0 })),
    {
      label: t("Sök efter uppdateringar…"),
      separatorBefore: true,
      onSelect: () => void checkForUpdates(true),
    },
  ];
}

/** The writer's picture in the top bar, with the title the writer wears; it opens their menu. */
export function ProfileButton({ app }: { app: ProfileButtonApp }) {
  const menu = useMenuButton(t("Din profil"), accountItems(app));
  const name = app.startup.preferences.authorName;
  const earned = earnedOf(app.journey.journey, dayKey(Date.now()));
  const frame = wornFlair(app.profile.profile.frame, earned)?.id ?? "";
  const title = wornFlair(app.profile.profile.title, earned)?.name;
  return (
    <>
      <button
        className={
          title ? "topbar-button profile-button with-title" : "topbar-button profile-button"
        }
        aria-label={t("Din profil")}
        title={name || t("Din profil")}
        onClick={menu.open}
      >
        <Avatar name={name} picture={app.profile.profile.picture} size={22} frame={frame} />
        {title && <span className="profile-button-title">{title}</span>}
      </button>
      {menu.menu}
    </>
  );
}
