export interface Connection {
  id: string;
  role: string;
}

type Fields = Record<string, unknown>;

const isConnection = (value: unknown): value is Connection => {
  const entry = value as Partial<Connection> | null;
  return typeof entry?.id === "string" && typeof entry.role === "string";
};

// Kept in project.json as { noteId: [{ id, role }] }, from the note's own point of view.
function allConnections(fields: Fields): Record<string, Connection[]> {
  const stored = fields["connections"];
  if (typeof stored !== "object" || stored === null) return {};
  return Object.fromEntries(
    Object.entries(stored as Record<string, unknown>).map(([id, list]) => [
      id,
      Array.isArray(list) ? list.filter(isConnection) : [],
    ]),
  );
}

export const connectionsOf = (fields: Fields, noteId: string) =>
  allConnections(fields)[noteId] ?? [];

/** The same note twice keeps the newest role. */
export function withConnection(fields: Fields, noteId: string, connection: Connection) {
  const all = allConnections(fields);
  const others = (all[noteId] ?? []).filter((entry) => entry.id !== connection.id);
  return { connections: { ...all, [noteId]: [...others, connection] } };
}

export function withoutConnection(fields: Fields, noteId: string, otherId: string) {
  const all = allConnections(fields);
  return {
    connections: { ...all, [noteId]: (all[noteId] ?? []).filter((entry) => entry.id !== otherId) },
  };
}
