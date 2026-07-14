// Explicit OS integrations. No action falls back to permanent deletion.

import { spawn } from "node:child_process";
import { dirname } from "node:path";

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let child;
    try { child = spawn(command, args, { ...options, shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] }); }
    catch (error) { reject(error); return; }
    const timer = setTimeout(() => { child.kill(); reject(Object.assign(new Error("action timed out"), { code: "ETIMEDOUT" })); }, 15000);
    child.stderr?.on("data", (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(Object.assign(new Error(stderr.trim() || `action exited with ${code}`), { code: "EACTION" }));
    });
  });
}

export function createPlatformActions({ platform = process.platform, run = runCommand, editor = "" } = {}) {
  async function trash(path) {
    if (platform === "darwin") {
      return run("osascript", [
        "-e", "on run argv",
        "-e", "tell application \"Finder\" to delete POSIX file (item 1 of argv)",
        "-e", "end run",
        "--", path
      ]);
    }
    if (platform === "win32") {
      const script = "$p=$env:MATN_TARGET; Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin')";
      return run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { env: { ...process.env, MATN_TARGET: path } });
    }
    return run("gio", ["trash", "--", path]);
  }

  async function reveal(path) {
    if (platform === "darwin") return run("open", ["-R", path]);
    if (platform === "win32") return run("explorer.exe", ["/select,", path]);
    return run("xdg-open", [dirname(path)]);
  }

  async function openEditor(path) {
    if (!editor) throw Object.assign(new Error("no external editor configured"), { code: "ENOEDITOR" });
    return run(editor, [path], { detached: true });
  }

  return { trash, reveal, openEditor };
}
