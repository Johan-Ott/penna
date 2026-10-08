import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { Avatar } from "./Avatar.js";
import { ProfileDialog, type ProfileForm } from "./ProfileDialog.js";
import { t } from "../../i18n/i18n.js";

const textOf = (value: unknown) => (typeof value === "string" ? value : "");

function save(app: AppState, project: Project, form: ProfileForm) {
  const { name, bookAuthor, ...profile } = form;
  app.profile.save(profile);
  if (name !== app.startup.preferences.authorName)
    app.startup.updatePreferences((current) => ({ ...current, authorName: name }));
  if (bookAuthor !== textOf(project.fields["author"]))
    void app.updateFields({ author: bookAuthor || undefined });
}

/** The profile dialog, when the writer opened it from the sidebar. */
export function ProfileLayer({ app, project }: { app: AppState; project: Project }) {
  if (!app.profile.isOpen) return null;
  const initial = {
    ...app.profile.profile,
    name: app.startup.preferences.authorName,
    bookAuthor: textOf(project.fields["author"]),
  };
  return (
    <ProfileDialog
      initial={initial}
      bookName={project.name}
      journey={app.journey.journey}
      onSave={(form) => save(app, project, form)}
      onClose={app.profile.close}
    />
  );
}

/** At the top of the sidebar: who writes, and the way into the profile. */
export function ProfileRow({ app }: { app: AppState }) {
  const name = app.startup.preferences.authorName;
  return (
    <button className="profile-row" onClick={app.profile.open}>
      <Avatar name={name} picture={app.profile.profile.picture} size={22} />
      <span className="profile-row-name">{name || t("Din profil")}</span>
    </button>
  );
}
