// Matn — HTTP server: serves the reader shell, vendored assets, and the file API
// with live-reload over SSE. No external dependencies.

import { createServer } from "node:http";
import { readFileSync, statSync, existsSync, watch, readdirSync, realpathSync } from "node:fs";
import { resolve, dirname, join, sep, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, "..");
const VENDOR = join(PKG, "vendor");

const INDEX = readFileSync(join(HERE, "index.html"), "utf8");
const MARKED = readFileSync(join(VENDOR, "marked.min.js"), "utf8");
const HLJS = readFileSync(join(VENDOR, "highlight.min.js"), "utf8");
let MERMAID = null; // large (~3.5 MB) — loaded on first request only

const isMd = (f) => /\.(md|markdown|mdown|mkd)$/i.test(f);
const imageTypes = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

export function startServer({ port = 4711, host = "127.0.0.1", defaultArg = process.cwd() } = {}) {
  const clients = new Set();
  const watched = new Map();
  const root = targetRoot(defaultArg);
  const rootReal = realpathSync(root);

  function broadcast(absFile) {
    const data = "data: " + JSON.stringify({ type: "reload", path: absFile }) + "\n\n";
    for (const r of clients) r.write(data);
  }
  function ensureWatch(dir, recursive = false) {
    if (!withinRoot(dir)) return;
    const key = dir + (recursive ? "|r" : "");
    if (watched.has(key)) return;
    try {
      watched.set(key, watch(dir, { recursive }, (_e, fname) => {
        if (fname && isMd(fname)) broadcast(resolve(dir, String(fname)));
      }));
    } catch {}
  }
  function targetRoot(target) {
    const abs = resolve(target || ".");
    try {
      if (statSync(abs).isDirectory()) return abs;
      return dirname(abs);
    } catch {
      return process.cwd();
    }
  }
  function withinRoot(p) {
    try {
      const real = realpathSync(resolve(p));
      return real === rootReal || real.startsWith(rootReal + sep);
    } catch {
      return false;
    }
  }
  function safeMd(p) {
    if (!p) return null;
    const abs = resolve(p);
    try { if (!withinRoot(abs) || !isMd(abs) || !existsSync(abs) || !statSync(abs).isFile()) return null; }
    catch { return null; }
    return abs;
  }
  function listMd(dir) {
    const out = [];
    (function walk(d) {
      if (!withinRoot(d)) return;
      let es = [];
      try { es = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of es) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (isMd(e.name) && withinRoot(p)) out.push(p);
      }
    })(dir);
    return out.sort();
  }
  function defaultTarget() {
    if (!defaultArg || !existsSync(defaultArg)) return {};
    try {
      if (statSync(defaultArg).isDirectory()) return { dir: defaultArg };
      if (isMd(defaultArg) && withinRoot(defaultArg)) return { path: defaultArg };
    } catch {}
    return {};
  }
  function safeImage(pathname) {
    let decoded = "";
    try { decoded = decodeURIComponent(pathname); } catch { return null; }
    const abs = resolve(root, "." + decoded);
    const type = imageTypes.get(extname(abs).toLowerCase());
    if (!type) return null;
    try { if (!withinRoot(abs) || !statSync(abs).isFile()) return null; }
    catch { return null; }
    return { abs, type };
  }

  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    const send = (code, type, body, extra) =>
      { res.writeHead(code, Object.assign({ "content-type": type }, extra)); res.end(body); };

    if (u.pathname === "/") return send(200, "text/html; charset=utf-8", INDEX);
    if (u.pathname === "/marked.js") return send(200, "text/javascript; charset=utf-8", MARKED);
    if (u.pathname === "/highlight.js") return send(200, "text/javascript; charset=utf-8", HLJS);
    if (u.pathname === "/mermaid.js") {
      try { if (!MERMAID) MERMAID = readFileSync(join(VENDOR, "mermaid.min.js")); }
      catch { return send(404, "text/plain", "nf"); }
      return send(200, "text/javascript; charset=utf-8", MERMAID, { "cache-control": "max-age=86400" });
    }
    if (u.pathname === "/html-docx.js" || u.pathname === "/jszip.js") {
      const f = u.pathname === "/jszip.js" ? "jszip.min.js" : "html-docx.min.js";
      try { return send(200, "text/javascript; charset=utf-8", readFileSync(join(VENDOR, f)), { "cache-control": "max-age=86400" }); }
      catch { return send(404, "text/plain", "nf"); }
    }
    {
      const jsmap = { "/katex.js": "katex.min.js", "/katex-auto.js": "katex-auto.min.js", "/marked-footnote.js": "marked-footnote.umd.js" };
      if (jsmap[u.pathname]) {
        try { return send(200, "text/javascript; charset=utf-8", readFileSync(join(VENDOR, jsmap[u.pathname])), { "cache-control": "max-age=86400" }); }
        catch { return send(404, "text/plain", "nf"); }
      }
      if (u.pathname === "/katex.css") {
        try { return send(200, "text/css; charset=utf-8", readFileSync(join(VENDOR, "katex.min.css")), { "cache-control": "max-age=86400" }); }
        catch { return send(404, "text/plain", "nf"); }
      }
    }
    // user-supplied fonts (e.g. Thmanyah — non-redistributable, lives outside git)
    if (u.pathname.startsWith("/fonts-local/")) {
      const name = u.pathname.slice(13);
      if (!/^[a-z0-9._ -]+\.(woff2?|otf|ttf)$/i.test(name)) return send(400, "text/plain", "bad");
      const type = /\.woff2$/i.test(name) ? "font/woff2" : /\.woff$/i.test(name) ? "font/woff" : /\.otf$/i.test(name) ? "font/otf" : "font/ttf";
      try { return send(200, type, readFileSync(join(VENDOR, "fonts-local", name)), { "cache-control": "max-age=3600" }); }
      catch { return send(404, "text/plain", "nf"); }
    }

    if (u.pathname.startsWith("/fonts/")) {
      const name = u.pathname.slice(7);
      if (!/^[a-z0-9._-]+\.woff2$/i.test(name)) return send(400, "text/plain", "bad");
      try { return send(200, "font/woff2", readFileSync(join(VENDOR, "fonts", name)), { "cache-control": "max-age=31536000" }); }
      catch { return send(404, "text/plain", "nf"); }
    }
    const image = safeImage(u.pathname);
    if (image) return send(200, image.type, readFileSync(image.abs), { "cache-control": "no-store" });
    if (u.pathname === "/api/root") return send(200, "application/json", JSON.stringify({ root: rootReal }));
    if (u.pathname === "/api/default") return send(200, "application/json", JSON.stringify(defaultTarget()));
    if (u.pathname === "/api/list") {
      const dir = u.searchParams.get("dir");
      if (!dir || !existsSync(dir) || !withinRoot(dir)) return send(400, "application/json", "[]");
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

  server.on("close", () => {
    for (const watcher of watched.values()) watcher.close();
    watched.clear();
    clients.clear();
  });

  return new Promise((res) => server.listen(port, host, () => res(server)));
}
