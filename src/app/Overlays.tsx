import { ConflictDialog } from "./ConflictDialog.js";
import { CommandPalette } from "./palette/CommandPalette.js";
import type { usePalette } from "./palette/usePalette.js";
import {
  resolveConflict,
  type DiskConflict,
  type OpenScene,
  type SceneSession,
} from "./sceneSession.js";
import { SnapshotsLayer } from "./snapshots/SnapshotsDialog.js";
import type { useSnapshots } from "./snapshots/useSnapshots.js";
import { CrashDialog, SyncCopyDialog, type useSyncCopy } from "./SyncLayer.js";
import type { useEditorView } from "../editor/useEditorView.js";
import type { Project } from "./useProject.js";
import { MentionCard } from "./notes/MentionCard.js";
import type { Notes } from "./notes/useNotes.js";
import type { CardActions } from "./notes/cardActions.js";
import type { View } from "./useWritingMode.js";
import { ExportStatus } from "./exporting/ExportPanels.js";
import type { useExport } from "./exporting/useExport.js";
import type { WritingSettings } from "../editor/writingSettings.js";
import { SettingsLayer, type useSettingsDialog } from "./settings/SettingsDialog.js";
import { bookLanguage } from "../project/bookLanguage.js";
import { applySpellLanguage } from "./useSpellLanguage.js";
import type { useStartup } from "./useStartup.js";
import type { SettingsChange } from "./useWritingSettings.js";
import { useDriveSync, type DriveSync } from "./useDriveSync.js";

interface OverlayParts {
  project: Project | null;
  homes: Project[];
  scene: OpenScene | null;
  session: SceneSession;
  conflict: DiskConflict | null;
  editor: ReturnType<typeof useEditorView>;
  refresh: () => Promise<void>;
  series: Project | null;
  seriesState: { refreshSeries: () => Promise<void> };
  updateFields: (fields: Record<string, unknown>) => Promise<void>;
  syncCopy: ReturnType<typeof useSyncCopy>;
  snapshots: ReturnType<typeof useSnapshots>;
  palette: ReturnType<typeof usePalette>;
  notes: Notes;
  cards: CardActions;
  zip: ReturnType<typeof useExport>;
  startup: Pick<ReturnType<typeof useStartup>, "preferences" | "updatePreferences">;
  writingMode: {
    settings: WritingSettings;
    onChangeSettings: (change: SettingsChange) => void;
    settingsDialog: ReturnType<typeof useSettingsDialog>;
    setView: (view: View) => void;
    openSearchWith: (text: string) => void;
  };
}

function ConflictLayer(props: {
  conflict: DiskConflict | null;
  scene: OpenScene | null;
  session: SceneSession;
  refresh: () => Promise<void>;
}) {
  const { conflict, scene, session } = props;
  if (!conflict || !scene) return null;
  return (
    <ConflictDialog
      sceneTitle={scene.title}
      conflict={conflict}
      onChoose={(choice) => void resolveConflict(session, choice, conflict).then(props.refresh)}
    />
  );
}

function MentionLayer({ app }: { app: OverlayParts }) {
  const { notes, project } = app;
  if (!project) return null;
  const openNote = (id: string) => {
    notes.hideMention();
    app.cards.open(id);
  };
  return <MentionCard notes={notes} homes={app.homes} onOpenNote={openNote} />;
}

// The language is saved before the window may restart for its spelling dictionary.
function bookSettings(app: OverlayParts, drive: DriveSync) {
  if (!app.project) return null;
  return {
    language: bookLanguage(app.project.fields),
    onChangeLanguage: async (language: string) => {
      await app.updateFields({ language });
      await applySpellLanguage(app.session, language);
    },
    onExportZip: app.zip.backup,
    drive,
  };
}

function PaletteLayer({ app }: { app: OverlayParts }) {
  if (!app.palette.isOpen) return null;
  const search = (text: string) => {
    app.writingMode.setView("skriv");
    app.writingMode.openSearchWith(text);
  };
  return (
    <CommandPalette entries={app.palette.entries} onClose={app.palette.close} onSearch={search} />
  );
}

// The sync lives here, not in the dialog, so it runs while the dialog is closed.
function SettingsAndSync({ app }: { app: OverlayParts }) {
  const { preferences, updatePreferences } = app.startup;
  const dirs = [app.project?.dir, app.series?.dir].filter((dir) => dir !== undefined);
  const refresh = async () =>
    void (await Promise.all([app.refresh(), app.seriesState.refreshSeries()]));
  const drive = useDriveSync(dirs, preferences, updatePreferences, refresh);
  return (
    <SettingsLayer
      {...app.startup}
      {...app.writingMode}
      dialog={app.writingMode.settingsDialog}
      book={bookSettings(app, drive)}
    />
  );
}

export function Overlays({ app }: { app: OverlayParts }) {
  return (
    <>
      <ConflictLayer {...app} />
      {app.project && <SyncCopyDialog project={app.project} {...app.syncCopy} />}
      {app.project && <CrashDialog project={app.project} refresh={app.refresh} />}
      <SnapshotsLayer
        state={app.snapshots}
        sceneTitle={app.scene?.title ?? ""}
        doc={app.editor.editorState?.doc ?? null}
      />
      <SettingsAndSync app={app} />
      <MentionLayer app={app} />
      <PaletteLayer app={app} />
      <ExportStatus exporter={app.zip} onOpenScene={() => undefined} />
    </>
  );
}
