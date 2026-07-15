import { chmod, lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const MATN_CODEX_SECTION = "[desktop.custom_file_handlers.matn]";
export const MATN_CODEX_LEGACY_SECTION = "[custom_file_handlers.matn]";
export const MATN_BUNDLE_ID = "com.ajarallah.matn";

function tableHeader(line) {
  const trimmed = line.trim().replace(/\s+#.*$/, "");
  return /^\[\[?[^\]]+\]\]?$/.test(trimmed) ? trimmed : null;
}

function withoutSection(source, section = MATN_CODEX_SECTION) {
  const output = [];
  let skipping = false;

  for (const line of source.split(/\r?\n/)) {
    const header = tableHeader(line);
    if (header != null) {
      skipping = header === section;
      if (skipping) continue;
    }
    if (!skipping) output.push(line);
  }

  while (output.length > 0 && output.at(-1).trim() === "") output.pop();
  return output.join("\n");
}

export function buildMatnCodexSection({ iconPath }) {
  if (typeof iconPath !== "string" || iconPath.length === 0) {
    throw new TypeError("iconPath must be a non-empty string");
  }

  return [
    MATN_CODEX_SECTION,
    'label = "Matn"',
    `icon = ${JSON.stringify(iconPath)}`,
    'command = "/usr/bin/open"',
    `args = ["-b", "${MATN_BUNDLE_ID}"]`,
    'input = "path"',
    "supports_ssh = false",
  ].join("\n");
}

export function upsertMatnCodexHandler(source, options) {
  const prefix = withoutSection(
    withoutSection(source, MATN_CODEX_LEGACY_SECTION),
    MATN_CODEX_SECTION,
  );
  const section = buildMatnCodexSection(options);
  return `${prefix}${prefix ? "\n\n" : ""}${section}\n`;
}

export function removeMatnCodexHandler(source) {
  const next = withoutSection(
    withoutSection(source, MATN_CODEX_LEGACY_SECTION),
    MATN_CODEX_SECTION,
  );
  return next ? `${next}\n` : "";
}

async function writableConfigPath(configPath) {
  try {
    const info = await lstat(configPath);
    return info.isSymbolicLink() ? await realpath(configPath) : configPath;
  } catch (error) {
    if (error?.code === "ENOENT") return configPath;
    throw error;
  }
}

export async function writeMatnCodexHandler({ configPath, iconPath, remove = false }) {
  const targetPath = await writableConfigPath(configPath);
  let source = "";
  let mode = 0o600;

  try {
    source = await readFile(targetPath, "utf8");
    mode = (await stat(targetPath)).mode & 0o777;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const next = remove
    ? removeMatnCodexHandler(source)
    : upsertMatnCodexHandler(source, { iconPath });
  if (next === source) return { changed: false, configPath: targetPath };

  await mkdir(dirname(targetPath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${targetPath}.matn-${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, next, { encoding: "utf8", mode });
    await chmod(temporaryPath, mode);
    await rename(temporaryPath, targetPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return { changed: true, configPath: targetPath };
}
