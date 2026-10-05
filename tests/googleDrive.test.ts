import { describe, expect, it } from "vitest";
import { DriveError, googleDrive } from "../src/sync/googleDrive";

type Call = { url: string; init: RequestInit };

// Answers each request with the next reply, and remembers what was asked.
function fakeFetch(replies: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const reply = replies.shift() ?? { body: {} };
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

const token = async () => "TOKEN";

describe("googleDrive", () => {
  it("lists a folder over every page, with the sign-in token, and tells folders from files", async () => {
    const { calls, fetcher } = fakeFetch([
      {
        body: {
          files: [{ id: "a", name: "scenes", mimeType: "application/vnd.google-apps.folder" }],
          nextPageToken: "p2",
        },
      },
      {
        body: {
          files: [
            { id: "b", name: "project.json", mimeType: "application/json", md5Checksum: "m1" },
          ],
        },
      },
    ]);

    const files = await googleDrive(token, fetcher).list("root1");

    expect(files).toEqual([
      { id: "a", name: "scenes", isFolder: true, version: "" },
      { id: "b", name: "project.json", isFolder: false, version: "m1" },
    ]);
    expect(decodeURIComponent(calls[0]?.url ?? "").replaceAll("+", " ")).toContain(
      "'root1' in parents and trashed=false",
    );
    expect(calls[1]?.url).toContain("pageToken=p2");
    expect(new Headers(calls[0]?.init.headers).get("Authorization")).toBe("Bearer TOKEN");
  });

  it("looks for a folder by name with quotes made safe", async () => {
    const { calls, fetcher } = fakeFetch([{ body: { files: [] } }]);

    const found = await googleDrive(token, fetcher).findFolder("Elins 'bok'", null);

    expect(found).toBeNull();
    expect(decodeURIComponent(calls[0]?.url ?? "").replaceAll("+", " ")).toContain(
      "name='Elins \\'bok\\'' and mimeType='application/vnd.google-apps.folder' and 'root' in parents",
    );
  });

  it("uploads a file into its folder and reads back its new version", async () => {
    const { calls, fetcher } = fakeFetch([
      { body: { id: "c", name: "S1.md", mimeType: "text/markdown", md5Checksum: "m2" } },
    ]);

    const sent = await googleDrive(token, fetcher).upload(
      "S1.md",
      "scenes1",
      new TextEncoder().encode("Text"),
    );

    expect(sent).toEqual({ id: "c", name: "S1.md", isFolder: false, version: "m2" });
    expect(calls[0]?.url).toContain("uploadType=multipart");
    expect(await new Response(calls[0]?.init.body).text()).toContain('"parents":["scenes1"]');
  });

  it("reports an ended sign-in as a DriveError with status 401", async () => {
    const { fetcher } = fakeFetch([{ status: 401, body: { error: "expired" } }]);

    const failure = googleDrive(token, fetcher).download("x");

    await expect(failure).rejects.toBeInstanceOf(DriveError);
    await expect(failure).rejects.toMatchObject({ status: 401 });
  });
});
