// Matn — HTTP server: serves the reader shell, vendored assets, and the file API
// with live-reload over SSE. No external dependencies.

import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync, statSync, lstatSync, existsSync, watch, readdirSync, realpathSync } from "node:fs";
import { resolve, dirname, join, sep, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import SearchCore from "./search-core.cjs";
import LinkCore from "./link-core.cjs";
import { createStateStore } from "./state-store.mjs";
import { createPlatformActions, runCommand } from "./platform-actions.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, "..");
const VENDOR = join(PKG, "vendor");

const INDEX = readFileSync(join(HERE, "index.html"), "utf8");
const MARKED = readFileSync(join(VENDOR, "marked.min.js"), "utf8");
const RENDER_CORE = readFileSync(join(HERE, "render-core.cjs"), "utf8");
const ANNOTATION_CORE = readFileSync(join(HERE, "annotation-core.cjs"), "utf8");
const HLJS = readFileSync(join(VENDOR, "highlight.min.js"), "utf8");
const MAX_INDEX_BYTES = 2 * 1024 * 1024;
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

export function startServer({ port = 4711, host = "127.0.0.1", defaultArg = process.cwd(), dataDir, editor = process.env.MATN_EDITOR || "", allowFileActions = false, platformActions } = {}) {
  const clients = new Set();
  const watched = new Map();
  const workspaceRecords = new Map();
  let indexGeneration = 0;
  let indexing = false;
  let workspaceDir = null;
  const root = targetRoot(defaultArg);
  const rootReal = realpathSync(root);
  const sessionToken = randomBytes(32).toString("hex");
  const serverIndex = INDEX.replace("</head>", `<meta name="matn-session" content="${sessionToken}">\n</head>`);
  const stateStore = createStateStore({ dataDir });
  const actions = platformActions || createPlatformActions({ editor });

  function broadcast(absFile) {
    refreshIndexedFile(absFile);
    const data = "data: " + JSON.stringify({ type: "reload", path: absFile }) + "\n\n";
    for (const r of clients) { try { r.write(data); } catch { clients.delete(r); } }
  }
  function broadcastMessage(message) {
    const data = "data: " + JSON.stringify(message) + "\n\n";
    for (const r of clients) { try { r.write(data); } catch { clients.delete(r); } }
  }
  function ensureWatch(dir, recursive = false) {
    if (!withinRoot(dir)) return;
    const displayDir = resolve(dir);
    let realDir;
    try { realDir = realpathSync(dir); } catch { return; }
    for (const record of watched.values()) {
      if (record.recursive && (realDir === record.dir || realDir.startsWith(record.dir + sep))) return;
    }
    const key = realDir + (recursive ? "|r" : "");
    if (watched.has(key)) return;
    try {
      const handle = watch(realDir, { recursive }, (_e, fname) => {
        if (fname && isMd(fname)) broadcast(resolve(displayDir, String(fname)));
      });
      if (recursive) {
        for (const [oldKey, record] of watched) {
          if (!record.recursive && (record.dir === realDir || record.dir.startsWith(realDir + sep))) {
            record.handle.close();
            watched.delete(oldKey);
          }
        }
      }
      watched.set(key, { handle, dir: realDir, recursive });
      while (watched.size > 128) {
        const oldest = watched.entries().next().value;
        if (!oldest) break;
        oldest[1].handle.close();
        watched.delete(oldest[0]);
      }
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
  function makeSearchRecord(abs, rel) {
    const stat = statSync(abs);
    const content = stat.size <= MAX_INDEX_BYTES ? readFileSync(abs, "utf8") : "";
    return SearchCore.createRecord({ path: abs, rel, mtimeMs: stat.mtimeMs, content });
  }
  function fingerprint(abs) {
    const stat = statSync(abs);
    return { mtimeMs: stat.mtimeMs, size: stat.size, hash: stat.size <= MAX_INDEX_BYTES ? createHash("sha256").update(readFileSync(abs)).digest("hex") : "", readAt: Date.now() };
  }
  function fingerprintChanged(previous, current) {
    if (!previous) return false;
    if (previous.mtimeMs === current.mtimeMs && previous.size === current.size) return false;
    return !(previous.hash && current.hash && previous.hash === current.hash);
  }
  function refreshIndexedFile(absFile) {
    const abs = resolve(absFile), existing = workspaceRecords.get(abs);
    if (!workspaceDir || (abs !== workspaceDir && !abs.startsWith(workspaceDir + sep))) return;
    if (!safeMd(abs)) { workspaceRecords.delete(abs); return; }
    try { workspaceRecords.set(abs, makeSearchRecord(abs, existing ? existing.rel : relative(workspaceDir, abs).split(sep).join("/"))); }
    catch { workspaceRecords.delete(abs); }
  }
  function refreshStaleRecords() {
    for (const [path, record] of workspaceRecords) {
      try { if (statSync(path).mtimeMs !== record.mtimeMs) refreshIndexedFile(path); }
      catch { workspaceRecords.delete(path); }
    }
  }
  function resolvedPayload(resolved) {
    if (!resolved) return null;
    const record = workspaceRecords.get(resolved.path);
    const snippet = record ? record.bodyStart != null ? record.content.slice(record.bodyStart).replace(/\s+/g, " ").trim().slice(0, 240) : "" : "";
    return { ...resolved, snippet };
  }
  function scheduleIndex(files, dir) {
    const generation = ++indexGeneration;
    const next = new Map();
    let cursor = 0;
    workspaceDir = dir;
    workspaceRecords.clear();
    indexing = true;
    function chunk() {
      if (generation !== indexGeneration) return;
      const end = Math.min(cursor + 25, files.length);
      for (; cursor < end; cursor++) {
        const file = files[cursor];
        const abs = safeMd(file.path);
        if (!abs) continue;
        try { next.set(abs, makeSearchRecord(abs, file.rel)); } catch {}
      }
      if (cursor < files.length) return setImmediate(chunk);
      workspaceRecords.clear();
      for (const [path, record] of next) workspaceRecords.set(path, record);
      indexing = false;
    }
    setImmediate(chunk);
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
  function validHostHeader(value) {
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") return true;
    if (!value || /[\s/@\\]/.test(value)) return false;
    try {
      const parsed = new URL(`http://${value}`);
      if (parsed.username || parsed.password || parsed.pathname !== "/") return false;
      const name = parsed.hostname;
      return name === "127.0.0.1" || name === "localhost" || name === "[::1]" || name === "::1";
    } catch {
      return false;
    }
  }
  function validWriteRequest(req) {
    if (req.headers["x-matn-session"] !== sessionToken) return false;
    if (req.headers["sec-fetch-site"] === "cross-site") return false;
    const origin = req.headers.origin;
    if (!origin || !req.headers.host) return false;
    try {
      const parsed = new URL(origin);
      return parsed.protocol === "http:" && parsed.host === req.headers.host && parsed.pathname === "/";
    } catch {
      return false;
    }
  }
  async function readJson(req, maxBytes = 256 * 1024) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBytes) throw Object.assign(new Error("request too large"), { statusCode: 413 });
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
    catch { throw Object.assign(new Error("invalid json"), { statusCode: 400 }); }
  }
  function storedFile(rel) {
    if (!rel || typeof rel !== "string") return null;
    const abs = safeMd(join(root, rel));
    return abs || null;
  }
  async function clientState() {
    const snapshot = await stateStore.snapshot(rootReal);
    return {
      workspace: {
        root: rootReal,
        lastFile: storedFile(snapshot.workspace.lastFile),
        positions: snapshot.workspace.positions,
        missingFiles: snapshot.workspace.missingFiles,
        favorites: snapshot.workspace.favorites,
        readLater: snapshot.workspace.readLater,
        annotations: snapshot.workspace.annotations,
        fileMeta: snapshot.workspace.fileMeta,
        lastOpenedAt: snapshot.workspace.lastOpenedAt
      },
      recentWorkspaces: snapshot.recent.map((item) => ({
        root: item.root,
        name: item.root.split(sep).filter(Boolean).pop() || item.root,
        lastFile: item.root === rootReal ? storedFile(item.lastFile) : null,
        lastOpenedAt: item.lastOpenedAt
      }))
    };
  }
  async function fileInfo(abs) {
    const record = workspaceRecords.get(abs);
    const rel = record ? record.rel : relative(rootReal, realpathSync(abs)).split(sep).join("/");
    let tracked = false;
    try { await runCommand("git", ["-C", rootReal, "ls-files", "--error-unmatch", "--", rel]); tracked = true; } catch {}
    refreshStaleRecords();
    const context = LinkCore.context(Array.from(workspaceRecords.values()), abs);
    const snapshot = await stateStore.snapshot(rootReal), current = fingerprint(abs);
    return { path: abs, rel, tracked, backlinks: context.backlinks.length, changed: fingerprintChanged(snapshot.workspace.fileMeta[rel], current), allowTrash: Boolean(allowFileActions), canOpenEditor: Boolean(editor), canReveal: true };
  }

  const server = createServer(async (req, res) => {
    const u = new URL(req.url, "http://localhost");
    const securityHeaders = {
      "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    };
    const send = (code, type, body, extra) =>
      { res.writeHead(code, Object.assign({ "content-type": type }, securityHeaders, extra)); res.end(body); };

    if (!validHostHeader(req.headers.host || "")) return send(421, "text/plain", "misdirected request");
    const stateWrite = u.pathname === "/api/state" && req.method === "PUT";
    const actionWrite = ["/api/open-editor", "/api/reveal", "/api/trash"].includes(u.pathname) && req.method === "POST";
    if (req.method !== "GET" && req.method !== "HEAD" && !stateWrite && !actionWrite) return send(405, "text/plain", "method not allowed", { allow: "GET, HEAD, PUT, POST" });
    if ((stateWrite || actionWrite) && !validWriteRequest(req)) return send(403, "application/json", JSON.stringify({ error: "write request rejected" }));
    if (u.pathname === "/api/list" && req.headers["sec-fetch-site"] === "cross-site") return send(403, "text/plain", "cross-site request blocked");

    if (u.pathname === "/") return send(200, "text/html; charset=utf-8", serverIndex, { "cache-control": "no-store" });
    if (u.pathname === "/marked.js") return send(200, "text/javascript; charset=utf-8", MARKED);
    if (u.pathname === "/render-core.js") return send(200, "text/javascript; charset=utf-8", RENDER_CORE);
    if (u.pathname === "/annotation-core.js") return send(200, "text/javascript; charset=utf-8", ANNOTATION_CORE);
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
    if (image) {
      try { return send(200, image.type, readFileSync(image.abs), { "cache-control": "no-store" }); }
      catch { return send(404, "text/plain", "nf"); }
    }
    if (u.pathname === "/api/root") return send(200, "application/json", JSON.stringify({ root: rootReal }));
    if (u.pathname === "/api/default") return send(200, "application/json", JSON.stringify(defaultTarget()));
    if (u.pathname === "/api/state" && req.method === "GET") {
      try {
        await stateStore.updateWorkspace(rootReal, {});
        return send(200, "application/json", JSON.stringify(await clientState()), { "cache-control": "no-store" });
      } catch {
        return send(500, "application/json", JSON.stringify({ error: "state unavailable" }));
      }
    }
    if (stateWrite) {
      try {
        const body = await readJson(req);
        const abs = safeMd(body.currentFile);
        if (!abs) return send(400, "application/json", JSON.stringify({ error: "invalid markdown file" }));
        const rel = relative(rootReal, realpathSync(abs)).split(sep).join("/");
        const action = typeof body.action === "string" ? body.action : "position";
        if (action !== "position") {
          const snapshot = await stateStore.snapshot(rootReal);
          const workspace = snapshot.workspace;
          let patch = {};
          if (action === "toggle-favorite") {
            const bookmark = body.bookmark && typeof body.bookmark === "object" ? { ...body.bookmark, path: rel } : null;
            if (!bookmark || typeof bookmark.id !== "string" || !bookmark.id) return send(400, "application/json", JSON.stringify({ error: "invalid favorite" }));
            const exists = workspace.favorites.some((item) => item.id === bookmark.id);
            patch.favorites = exists ? workspace.favorites.filter((item) => item.id !== bookmark.id) : workspace.favorites.concat(bookmark);
          } else if (action === "toggle-read-later") {
            const id = "later:" + rel;
            const exists = workspace.readLater.some((item) => item.id === id);
            patch.readLater = exists ? workspace.readLater.filter((item) => item.id !== id) : workspace.readLater.concat({ id, type: "file", path: rel, createdAt: Date.now() });
          } else if (action === "upsert-annotation") {
            const annotation = body.annotation && typeof body.annotation === "object" ? { ...body.annotation, path: rel } : null;
            if (!annotation || typeof annotation.id !== "string" || !annotation.id || typeof annotation.quote !== "string" || !annotation.quote) return send(400, "application/json", JSON.stringify({ error: "invalid annotation" }));
            patch.annotations = workspace.annotations.filter((item) => item.id !== annotation.id).concat(annotation);
          } else if (action === "delete-annotation") {
            if (typeof body.id !== "string" || !body.id) return send(400, "application/json", JSON.stringify({ error: "invalid annotation" }));
            patch.annotations = workspace.annotations.filter((item) => item.id !== body.id);
          } else if (action === "mark-read") {
            patch.fileMeta = { [rel]: fingerprint(abs) };
          } else return send(400, "application/json", JSON.stringify({ error: "unknown state action" }));
          await stateStore.updateWorkspace(rootReal, patch);
          return send(200, "application/json", JSON.stringify(await clientState()), { "cache-control": "no-store" });
        }
        const ratio = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : 0;
        const position = body.position && typeof body.position === "object" ? {
          heading: typeof body.position.heading === "string" ? body.position.heading.slice(0, 240) : "",
          sectionRatio: ratio(body.position.sectionRatio),
          overallRatio: ratio(body.position.overallRatio),
          updatedAt: Date.now()
        } : null;
        await stateStore.updateWorkspace(rootReal, {
          lastFile: rel,
          positions: position ? { [rel]: position } : undefined,
          lastOpenedAt: Date.now()
        });
        return send(200, "application/json", JSON.stringify(await clientState()), { "cache-control": "no-store" });
      } catch (error) {
        const status = error && error.statusCode ? error.statusCode : 500;
        return send(status, "application/json", JSON.stringify({ error: status === 500 ? "state unavailable" : error.message }));
      }
    }
    if (u.pathname === "/api/list") {
      const dir = u.searchParams.get("dir");
      if (!dir || !existsSync(dir) || !withinRoot(dir)) return send(400, "application/json", "[]");
      const root = resolve(dir);
      ensureWatch(root, true);
      const files = listMd(root).map((p) => ({ path: p, rel: relative(root, p).split(sep).join("/") }));
      scheduleIndex(files, root);
      stateStore.updateWorkspace(rootReal, {}).catch(() => {});
      return send(200, "application/json", JSON.stringify(files));
    }
    if (u.pathname === "/api/search") {
      const query = (u.searchParams.get("q") || "").slice(0, 200);
      const mode = u.searchParams.get("mode") === "files" ? "files" : "all";
      const limit = Math.max(1, Math.min(100, Number(u.searchParams.get("limit")) || 30));
      refreshStaleRecords();
      const results = SearchCore.searchRecords(Array.from(workspaceRecords.values()), query, { mode, limit });
      return send(200, "application/json", JSON.stringify({ results, indexing, total: workspaceRecords.size }));
    }
    if (u.pathname === "/api/resolve") {
      const from = safeMd(u.searchParams.get("from"));
      const target = (u.searchParams.get("target") || "").slice(0, 2000);
      if (!from || !target) return send(400, "application/json", JSON.stringify({ error: "invalid link" }));
      refreshStaleRecords();
      const resolved = resolvedPayload(LinkCore.resolve(Array.from(workspaceRecords.values()), from, target));
      return resolved ? send(200, "application/json", JSON.stringify(resolved)) : send(404, "application/json", JSON.stringify({ error: "unresolved link", indexing }));
    }
    if (u.pathname === "/api/context") {
      const path = safeMd(u.searchParams.get("path"));
      if (!path) return send(400, "application/json", JSON.stringify({ error: "invalid markdown file" }));
      refreshStaleRecords();
      const context = LinkCore.context(Array.from(workspaceRecords.values()), path);
      return send(200, "application/json", JSON.stringify({ ...context, indexing }));
    }
    if (u.pathname === "/api/changes") {
      try {
        const snapshot = await stateStore.snapshot(rootReal), changed = [];
        for (const abs of listMd(root)) { const rel = relative(root, abs).split(sep).join("/"), previous = snapshot.workspace.fileMeta[rel]; if (previous && fingerprintChanged(previous, fingerprint(abs))) changed.push(rel); }
        return send(200, "application/json", JSON.stringify({ changed }));
      } catch { return send(500, "application/json", JSON.stringify({ error: "changes unavailable" })); }
    }
    if (u.pathname === "/api/file-info") {
      const path = safeMd(u.searchParams.get("path"));
      if (!path) return send(400, "application/json", JSON.stringify({ error: "invalid markdown file" }));
      try { return send(200, "application/json", JSON.stringify(await fileInfo(path))); }
      catch { return send(500, "application/json", JSON.stringify({ error: "file information unavailable" })); }
    }
    if (actionWrite) {
      try {
        const body = await readJson(req, 32 * 1024);
        const path = safeMd(body.path);
        if (!path || lstatSync(path).isSymbolicLink()) return send(400, "application/json", JSON.stringify({ error: "invalid markdown file" }));
        if (u.pathname === "/api/trash") {
          if (!allowFileActions) return send(403, "application/json", JSON.stringify({ error: "file actions are disabled" }));
          const rel = relative(rootReal, realpathSync(path)).split(sep).join("/");
          await actions.trash(path);
          await stateStore.updateWorkspace(rootReal, { missingFiles: { [rel]: { missingAt: Date.now(), reason: "trash" } } });
          workspaceRecords.delete(path);
          broadcastMessage({ type: "file-removed", path });
          return send(200, "application/json", JSON.stringify({ ok: true, path }));
        }
        if (u.pathname === "/api/reveal") await actions.reveal(path);
        else await actions.openEditor(path);
        return send(200, "application/json", JSON.stringify({ ok: true, path }));
      } catch (error) {
        const status = error && (error.code === "ENOENT" || error.code === "ENOEDITOR") ? 501 : error && error.statusCode ? error.statusCode : 500;
        return send(status, "application/json", JSON.stringify({ error: error && error.message ? error.message : "file action failed" }));
      }
    }
    if (u.pathname === "/api/raw") {
      const abs = safeMd(u.searchParams.get("path"));
      if (!abs) return send(400, "text/plain", "bad file");
      ensureWatch(dirname(abs));
      try { return send(200, "text/plain; charset=utf-8", readFileSync(abs, "utf8")); }
      catch { return send(404, "text/plain", "not found"); }
    }
    if (u.pathname === "/api/events") {
      res.writeHead(200, Object.assign({ "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" }, securityHeaders));
      res.write("retry: 2000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    send(404, "text/plain", "not found");
  });

  function cleanup() {
    for (const response of clients) { try { response.end(); } catch {} }
    clients.clear();
    for (const watcher of watched.values()) watcher.handle.close();
    watched.clear();
  }
  const close = server.close.bind(server);
  server.close = function (callback) {
    cleanup();
    return close(callback);
  };
  server.on("close", cleanup);

  return new Promise((resolveServer, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolveServer(server);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}
