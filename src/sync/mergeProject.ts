// Merged rather than kept twice: a copy of project.json would show nowhere.

type Json = Record<string, unknown>;

function parse(text: string | null): Json | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Json)
      : null;
  } catch {
    return null;
  }
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

// A value this device left unchanged comes from Drive. Before the first sync this device wins.
function pick(base: Json | null, here: Json, drive: Json, key: string) {
  if (!base) return key in here ? here[key] : drive[key];
  return same(here[key], base[key]) ? drive[key] : here[key];
}

export function mergeProjectText(base: string | null, here: string, drive: string): string {
  const [baseJson, hereJson, driveJson] = [parse(base), parse(here), parse(drive)];
  if (!hereJson || !driveJson) return here;
  const merged: Json = {};
  for (const key of new Set([...Object.keys(hereJson), ...Object.keys(driveJson)])) {
    const value = pick(baseJson, hereJson, driveJson, key);
    if (value !== undefined) merged[key] = value;
  }
  return `${JSON.stringify(merged, null, 2)}\n`;
}
