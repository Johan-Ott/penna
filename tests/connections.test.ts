import { describe, expect, it } from "vitest";
import { connectionsOf, withConnection, withoutConnection } from "../src/project/connections";

describe("connections", () => {
  it("adds a connection seen from the note, and keeps the newest role for the same note", () => {
    const first = withConnection({}, "arvid", { id: "elin", role: "brorsdotter" });

    const second = withConnection(first, "arvid", { id: "elin", role: "systerdotter" });

    expect(connectionsOf(second, "arvid")).toEqual([{ id: "elin", role: "systerdotter" }]);
    expect(connectionsOf(second, "elin")).toEqual([]);
  });

  it("removes a connection and ignores what is not a connection", () => {
    const fields = {
      connections: { arvid: [{ id: "elin", role: "brorsdotter" }, { id: 5 }, "trasig"] },
    };

    const removed = withoutConnection(fields, "arvid", "elin");

    expect(connectionsOf(fields, "arvid")).toEqual([{ id: "elin", role: "brorsdotter" }]);
    expect(connectionsOf(removed, "arvid")).toEqual([]);
  });
});
