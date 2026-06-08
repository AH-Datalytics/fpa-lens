/**
 * Microsoft Graph helpers for the FPA Lens data pipeline.
 *
 * Reads SharePoint app credentials from environment variables:
 *   SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET,
 *   SHAREPOINT_HOST, SHAREPOINT_SITE, SHAREPOINT_LIBRARY
 *
 * In GitHub Actions these come from repository secrets. For local runs, call
 * loadLocalEnv() first to hydrate them from .env.vercel-prod (gitignored).
 *
 * Read-only client-credentials flow. The app registration is scoped to read,
 * which is all this pipeline needs.
 */
import { readFileSync, existsSync, mkdirSync, createWriteStream } from "node:fs";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Hydrate process.env from a local dotenv file if the creds aren't already set. */
export function loadLocalEnv(path = ".env.vercel-prod") {
  if (process.env.SHAREPOINT_CLIENT_ID) return; // already provided (e.g. CI)
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    // Strip surrounding quotes and any stray trailing \n so values are usable
    // directly (e.g. ANTHROPIC_API_KEY read without further processing).
    process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/\\n$/g, "");
  }
}

/** Read a SharePoint env var, stripping surrounding quotes and the stray trailing \n. */
function env(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return raw
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "")
    .trim();
}

let _tokenCache = null;

/** Get (and cache) a Graph access token via client-credentials. */
export async function getToken() {
  if (_tokenCache && _tokenCache.expires > Date.now() + 60_000) {
    return _tokenCache.token;
  }
  const tenant = env("SHAREPOINT_TENANT_ID");
  const body = new URLSearchParams({
    client_id: env("SHAREPOINT_CLIENT_ID"),
    client_secret: env("SHAREPOINT_CLIENT_SECRET"),
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
  );
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Graph token request failed: ${res.status} ${JSON.stringify(json)}`);
  }
  _tokenCache = {
    token: json.access_token,
    expires: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return _tokenCache.token;
}

async function graph(path) {
  const token = await getToken();
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(`Graph GET ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

let _driveIdCache = null;

/** Resolve the document-library drive id for the configured site + library. */
export async function getDriveId() {
  if (_driveIdCache) return _driveIdCache;
  const host = env("SHAREPOINT_HOST");
  const site = env("SHAREPOINT_SITE");
  const library = env("SHAREPOINT_LIBRARY");
  const siteRes = await graph(`/sites/${host}:/sites/${site}`);
  const drives = await graph(`/sites/${siteRes.id}/drives`);
  const drive = drives.value.find((d) => d.name === library) || drives.value[0];
  if (!drive) throw new Error(`No drive found for library "${library}"`);
  _driveIdCache = drive.id;
  return drive.id;
}

/**
 * List the files (not folders) directly inside a folder given by its path
 * relative to the drive root, e.g. "FPA Lens Data/Finance/IDIQ".
 * Returns [] if the folder is empty or does not exist.
 */
export async function listFolderFiles(folderPath) {
  const driveId = await getDriveId();
  const encoded = folderPath.split("/").map(encodeURIComponent).join("/");
  let res;
  try {
    res = await graph(`/drives/${driveId}/root:/${encoded}:/children?$top=200`);
  } catch (e) {
    if (String(e.message).includes("404")) return [];
    throw e;
  }
  return res.value
    .filter((it) => it.file) // files only, skip subfolders
    .map((it) => ({
      name: it.name,
      size: it.size,
      lastModified: it.lastModifiedDateTime,
      downloadUrl: it["@microsoft.graph.downloadUrl"],
      id: it.id,
    }));
}

/** Download a listed item to a local path, creating parent dirs as needed. */
export async function downloadTo(item, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  const url = item.downloadUrl || (await freshDownloadUrl(item.id));
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed for ${item.name}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return destPath;
}

async function freshDownloadUrl(itemId) {
  const driveId = await getDriveId();
  const it = await graph(`/drives/${driveId}/items/${itemId}`);
  return it["@microsoft.graph.downloadUrl"];
}
