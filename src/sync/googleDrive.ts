import type { Drive, RemoteFile } from "./drive.js";

const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
const FIELDS = "id,name,mimeType,md5Checksum,version";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  version?: string;
}

/** `status` 401 means the sign-in has run out. */
export class DriveError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Call = (url: string, init?: RequestInit) => Promise<Response>;

const toRemote = (file: DriveFile): RemoteFile => ({
  id: file.id,
  name: file.name,
  isFolder: file.mimeType === FOLDER,
  version: file.md5Checksum ?? file.version ?? "",
});

// Names go inside single quotes in Drive's search language.
const quoted = (text: string) => `'${text.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

async function search(call: Call, query: string) {
  const files: DriveFile[] = [];
  let page = "";
  do {
    const params = new URLSearchParams({ fields: `nextPageToken,files(${FIELDS})` });
    params.set("q", query);
    params.set("pageSize", "1000");
    if (page) params.set("pageToken", page);
    const body = (await (await call(`${API}?${params}`)).json()) as {
      files: DriveFile[];
      nextPageToken?: string;
    };
    files.push(...body.files);
    page = body.nextPageToken ?? "";
  } while (page);
  return files;
}

// Drive answers with the file's new version, kept for the next sync.
async function sendFile(
  call: Call,
  url: string,
  send: { method: string; body: BodyInit; type: string },
) {
  const headers = { "Content-Type": send.type };
  const response = await call(url, { method: send.method, body: send.body, headers });
  return toRemote((await response.json()) as DriveFile);
}

// One multipart request with both the metadata and the content.
function upload(call: Call, name: string, parentId: string, bytes: Uint8Array) {
  const boundary = "penna-upload";
  const metadata = JSON.stringify({ name, parents: [parentId] });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    bytes as BlobPart,
    `\r\n--${boundary}--`,
  ]);
  const url = `${UPLOAD}?uploadType=multipart&fields=${FIELDS}`;
  return sendFile(call, url, {
    method: "POST",
    body,
    type: `multipart/related; boundary=${boundary}`,
  });
}

async function findFolder(call: Call, name: string, parentId: string | null) {
  const parent = quoted(parentId ?? "root");
  const query = `name=${quoted(name)} and mimeType='${FOLDER}' and ${parent} in parents`;
  return (await search(call, `${query} and trashed=false`))[0]?.id ?? null;
}

async function createFolder(call: Call, name: string, parentId: string | null) {
  const metadata = JSON.stringify({ name, mimeType: FOLDER, parents: [parentId ?? "root"] });
  const send = { method: "POST", body: metadata, type: "application/json" };
  return (await sendFile(call, `${API}?fields=${FIELDS}`, send)).id;
}

/** The drive.file scope: Penna only ever sees the files it made itself. */
export function googleDrive(token: () => Promise<string>, fetcher: typeof fetch = fetch): Drive {
  const call: Call = async (url, init = {}) => {
    const headers = { ...init.headers, Authorization: `Bearer ${await token()}` };
    const response = await fetcher(url, { ...init, headers });
    if (!response.ok) throw new DriveError(response.status, await response.text());
    return response;
  };
  return {
    list: async (folderId) =>
      (await search(call, `${quoted(folderId)} in parents and trashed=false`)).map(toRemote),
    findFolder: (name, parentId) => findFolder(call, name, parentId),
    createFolder: (name, parentId) => createFolder(call, name, parentId),
    upload: (name, parentId, bytes) => upload(call, name, parentId, bytes),
    update: (fileId, bytes) => {
      const url = `${UPLOAD}/${fileId}?uploadType=media&fields=${FIELDS}`;
      const body = new Blob([bytes as BlobPart]);
      return sendFile(call, url, { method: "PATCH", body, type: "application/octet-stream" });
    },
    download: async (fileId) =>
      new Uint8Array(await (await call(`${API}/${fileId}?alt=media`)).arrayBuffer()),
    trash: async (fileId) => {
      const body = JSON.stringify({ trashed: true });
      const headers = { "Content-Type": "application/json" };
      await call(`${API}/${fileId}`, { method: "PATCH", body, headers });
    },
  };
}
