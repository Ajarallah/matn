// Matn — HTTP server: serves the reader shell, vendored assets, and the file API
// with live-reload over SSE. No external dependencies.

import { createServer } from "node:http";
import { readFileSync, statSync, existsSync, watch, readdirSync } from "node:fs";
import { resolve, dirname, join, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, "..");
const VENDOR = join(PKG, "vendor");

const INDEX = readFileSync(join(HERE, "index.html"), "utf8");
const MARKED = readFileSync(join(VENDOR, "marked.min.js"), "utf8");
const HLJS = readFileSync(join(VENDOR, "highlight.min.js"), "utf8");

const isMd = (f) => /\.(md|markdown|mdown|mkd)$/i.test(f);

export function startServer({ port = 4711, host = "127.0.0.1", defaultArg = null } = {}) {
  const clients = new Set();
  const watched = new Map();

  function broadcast(absFile) {
    const data = "data: " + JSON.stringify({ type: "reload", path: absFile }) + "\n\n";
    for (const r of clients) r.write(data);
  }
  function ensureWatch(dir, recursive = false) {
    const key = dir + (recursive ? "|r" : "");
    if (watched.has(key)) return;
    try {
      watched.set(key, watch(dir, { recursive }, (_e, fname) => {
        if (fname && isMd(fname)) broadcast(resolve(dir, String(fname)));
      }));
    } catch {}
  }
  function safeMd(p) {
    if (!p) return null;
    const abs = resolve(p);
    try { if (!isMd(abs) || !existsSync(abs) || !statSync(abs).isFile()) return null; }
    catch { return null; }
    return abs;
  }
  function listMd(dir) {
    const out = [];
    (function walk(d) {
      let es = [];
      try { es = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of es) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (isMd(e.name)) out.push(p);
      }
    })(dir);
    return out.sort();
  }
  function defaultTarget() {
    if (!defaultArg || !existsSync(defaultArg)) return {};
    try {
      if (statSync(defaultArg).isDirectory()) return { dir: defaultArg };
      if (isMd(defaultArg)) return { path: defaultArg };
    } catch {}
    return {};
  }

  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    const send = (code, type, body, extra) =>
      { res.writeHead(code, Object.assign({ "content-type": type }, extra)); res.end(body); };

    if (u.pathname === "/") return send(200, "text/html; charset=utf-8", INDEX);
    if (u.pathname === "/marked.js") return send(200, "text/javascript; charset=utf-8", MARKED);
    if (u.pathname === "/highlight.js") return send(200, "text/javascript; charset=utf-8", HLJS);

    if (u.pathname.startsWith("/fonts/")) {
      const name = u.pathname.slice(7);
      if (!/^[a-z0-9._-]+\.woff2$/i.test(name)) return send(400, "text/plain", "bad");
      try { return send(200, "font/woff2", readFileSync(join(VENDOR, "fonts", name)), { "cache-control": "max-age=31536000" }); }
      catch { return send(404, "text/plain", "nf"); }
    }
    if (u.pathname === "/api/default") return send(200, "application/json", JSON.stringify(defaultTarget()));
    if (u.pathname === "/api/list") {
      const dir = u.searchParams.get("dir");
      if (!dir || !existsSync(dir)) return send(400, "application/json", "[]");
      const root = resolve(dir);
      ensureWatch(root, true);
      const files = listMd(root).map((p) => ({ path: p, rel: relative(root, p).split(sep).join("/") }));
      return send(200, "application/json", JSON.stringify(files));
    }
    if (u.pathname === "/api/raw") {
      const abs = safeMd(u.searchParams.get("path"));
      if (!abs) return send(400, "text/plain", "bad file");
      ensureWatch(dirname(abs));
      try { return send(200, "text/plain; charset=utf-8", readFileSync(abs, "utf8")); }
      catch { return send(404, "text/plain", "not found"); }
    }
    if (u.pathname === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write("retry: 2000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    send(404, "text/plain", "not found");
  });

  return new Promise((res) => server.listen(port, host, () => res(server)));
}
