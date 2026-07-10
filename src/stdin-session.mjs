import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { tmpdir } from "node:os";

export const MAX_STDIN_BYTES = 16 * 1024 * 1024;
export const SESSION_PREFIX = "matn-stdin-";

export async function readStdin(stream, maxBytes = MAX_STDIN_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > maxBytes) throw Object.assign(new Error(`stdin exceeds ${maxBytes} bytes`), { code: "ETOOBIG" });
    chunks.push(value);
  }
  if (!size) throw Object.assign(new Error("stdin is empty"), { code: "EEMPTY" });
  return Buffer.concat(chunks).toString("utf8");
}

export function safeSessionName(input) {
  let name = basename(String(input || "stdin.md")).replace(/[^\p{L}\p{N}._ -]+/gu, "-").replace(/^\.+/, "").trim();
  if (!name) name = "stdin.md";
  if (!/\.(md|markdown|mdown|mkd)$/i.test(extname(name))) name = name.replace(/\.[^.]*$/, "") + ".md";
  return name.slice(0, 120);
}

export async function createStdinSession(content, options = {}) {
  const tempRoot = options.tempRoot || tmpdir();
  const dir = await mkdtemp(join(tempRoot, SESSION_PREFIX));
  const file = join(dir, safeSessionName(options.name));
  await writeFile(file, String(content), { encoding: "utf8", mode: 0o600 });
  return { dir, file };
}

export async function cleanupStdinSessions(options = {}) {
  const tempRoot = options.tempRoot || tmpdir();
  const maxAgeMs = Number(options.maxAgeMs) || 24 * 60 * 60 * 1000;
  const now = Number(options.now) || Date.now();
  let entries = [];
  try { entries = await readdir(tempRoot, { withFileTypes: true }); } catch { return; }
  await Promise.all(entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(SESSION_PREFIX)).map(async (entry) => {
    const path = join(tempRoot, entry.name);
    try { if (now - (await stat(path)).mtimeMs > maxAgeMs) await rm(path, { recursive: true, force: true }); } catch {}
  }));
}
