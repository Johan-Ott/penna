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
import type { WritingSettings } from "../editor/writingSettings.js";
import { SettingsLayer, type useSettingsDialog } from "./settings/SettingsDialog.js";
import type { useStartup } from "./useStartup.js";
import type { SettingsChange } from "./useWritingSettings.js";

interface OverlayParts {
  project: Project | null;
  scene: OpenScene | null;
  session: SceneSession;
  conflict: DiskConflict | null;
  editor: ReturnType<typeof useEditorView>;
  refresh: () => Promise<void>;
  syncCopy: ReturnType<typeof useSyncCopy>;
  snapshots: ReturnType<typeof useSnapshots>;
  palette: ReturnType<typeof usePalette>;
  startup: Pick<ReturnType<typeof useStartup>, "preferences" | "updatePreferences">;
  writingMode: {
    settings: WritingSettings;
    onChangeSettings: (change: SettingsChange) => void;
    settingsDialog: ReturnType<typeof useSettingsDialog>;
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

/** What opens over the writing: dialogs and the command palette. */
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
      <SettingsLayer
        {...app.startup}
        {...app.writingMode}
        dialog={app.writingMode.settingsDialog}
      />
      {app.palette.isOpen && (
        <CommandPalette entries={app.palette.entries} onClose={app.palette.close} />
      )}
    </>
  );
}
