/** "0.10.0" is newer than "0.9.2"; a tag's leading v is left out. */
export function isNewer(candidate: string, installed: string) {
  const parts = (version: string) => version.replace(/^v/, "").split(".").map(Number);
  const [newer, older] = [parts(candidate), parts(installed)];
  for (let index = 0; index < Math.max(newer.length, older.length); index++) {
    const difference = (newer[index] ?? 0) - (older[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}
