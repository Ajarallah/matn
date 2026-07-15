#!/usr/bin/env node

import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeMatnCodexHandler } from "../src/codex-open-in-config.mjs";

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const configPath = optionValue(args, "--config") ?? join(homedir(), ".codex", "config.toml");
const appPath = optionValue(args, "--app") ?? join(homedir(), "Applications", "Matn.app");
const iconPath = join(appPath, "Contents", "Resources", "matn-app-icon.svg");

if (!remove) await access(iconPath);
const result = await writeMatnCodexHandler({ configPath, iconPath, remove });
const action = remove ? "removed from" : result.changed ? "installed in" : "already present in";
console.log(`[matn] Codex Open in integration ${action} ${result.configPath}`);
