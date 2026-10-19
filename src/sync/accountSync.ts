import { appFolder, DriveChanged, type Drive, type RemoteFile } from "./drive.js";

// The writer's own profile and settings, in Skrivro/konto.json in their Drive. The newer side wins
// whole: both are small and written by hand, so a merge would only surprise.

export interface Account {
  /** When the writer last changed anything here, in milliseconds since 1970. */
  changedAt: number;
  profile: Record<string, string>;
  settings: { authorName: string; defaultDailyGoal: number; isAutoSnapshotOn: boolean };
}

export const ACCOUNT_FILE = "konto.json";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function accountFrom(bytes: Uint8Array): Account | null {
  try {
    const parsed = JSON.parse(decoder.decode(bytes)) as Account;
    return typeof parsed.changedAt === "number" && parsed.profile && parsed.settings
      ? parsed
      : null;
  } catch {
    return null;
  }
}

// Another device may write in between; the next round then reads what it wrote.
async function send(drive: Drive, appDir: string, file: RemoteFile | undefined, local: Account) {
  const bytes = encoder.encode(`${JSON.stringify(local, null, 2)}
`);
  try {
    await (file
      ? drive.update(file.id, bytes, file.version)
      : drive.upload(ACCOUNT_FILE, appDir, bytes));
  } catch (error) {
    if (!(error instanceof DriveChanged)) throw error;
  }
}

/** Drive's account when it is newer than this device's, to take; else this device's is sent. */
export async function syncAccount(drive: Drive, local: Account): Promise<Account | null> {
  const appDir = await appFolder(drive);
  const file = (await drive.list(appDir)).find((found) => found.name === ACCOUNT_FILE);
  const remote = file ? accountFrom(await drive.download(file.id)) : null;
  if (remote && remote.changedAt > local.changedAt) return remote;
  if (remote?.changedAt !== local.changedAt) await send(drive, appDir, file, local);
  return null;
}
