import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { chmod, mkdtemp, mkdir, readFile, readdir, rename, symlink, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { startServer } from "../src/server.mjs";

test("file API only serves markdown under the configured root", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-root-"));
  const outside = join(tmpdir(), `matn-outside-${Date.now()}.md`);
  const outsideImage = join(tmpdir(), `matn-outside-${Date.now()}.png`);
  await mkdir(join(root, "notes"));
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "notes", "a.md"), "# داخل\n", "utf8");
  await writeFile(join(root, "assets", "pixel.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(outside, "# خارج\n", "utf8");
  await writeFile(outsideImage, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
    await rm(outside, { force: true });
    await rm(outsideImage, { force: true });
  });

  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const enc = encodeURIComponent;

  const allowed = await fetch(`${base}/api/raw?path=${enc(join(root, "notes", "a.md"))}`);
  assert.equal(allowed.status, 200);
  assert.equal(await allowed.text(), "# داخل\n");

  const denied = await fetch(`${base}/api/raw?path=${enc(outside)}`);
  assert.equal(denied.status, 400);

  const deniedList = await fetch(`${base}/api/list?dir=${enc(tmpdir())}`);
  assert.equal(deniedList.status, 400);

  const image = await fetch(`${base}/assets/pixel.png`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");

  const deniedImage = await fetch(`${base}/%2e%2e/${basename(outsideImage)}`);
  assert.equal(deniedImage.status, 404);

  const listed = await fetch(`${base}/api/list?dir=${enc(root)}`);
  assert.equal(listed.status, 200);
  assert.deepEqual(await listed.json(), [{ path: join(root, "notes", "a.md"), rel: "notes/a.md" }]);
});

test("exposes its containment root and default target", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-root2-"));
  await writeFile(join(root, "x.md"), "# x\n", "utf8");
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const rootRes = await fetch(`${base}/api/root`);
  assert.equal(rootRes.status, 200);
  const { root: reported } = await rootRes.json();
  assert.equal(typeof reported, "string");
  assert.equal(basename(reported), basename(root)); // realpath may differ (/var vs /private/var)

  const def = await fetch(`${base}/api/default`);
  assert.deepEqual(await def.json(), { dir: root });
});

test("serves the vendored Mermaid bundle", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-root3-"));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(`${base}/mermaid.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /javascript/);
  const body = await res.arrayBuffer();
  assert.ok(body.byteLength > 100000, "mermaid bundle should be large");
});

test("serves KaTeX and footnote assets", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-root4-"));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, type] of [["/katex.js", /javascript/], ["/katex.css", /css/], ["/marked-footnote.js", /javascript/], ["/render-core.js", /javascript/]]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get("content-type"), type, path);
    if (path === "/render-core.js") assert.match(await res.text(), /MatnCore/);
  }
});

test("an unreadable image returns 404 without crashing the server", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-images-"));
  const assets = join(root, "assets");
  const ok = join(assets, "ok.png");
  const locked = join(assets, "locked.png");
  await mkdir(assets);
  await writeFile(ok, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(locked, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await chmod(locked, 0o600).catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/assets/ok.png`)).status, 200);

  if (process.platform === "win32" || (process.getuid?.() ?? 1) === 0) {
    t.diagnostic("unreadable-file assertion skipped: permissions are not deterministic on this platform/user");
    return;
  }

  await chmod(locked, 0o000);
  assert.equal((await fetch(`${base}/assets/locked.png`)).status, 404);
  assert.equal((await fetch(`${base}/assets/ok.png`)).status, 200);
});

test("rejects forged Host headers and emits browser security headers", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-host-"));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const ok = await fetch(base);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(ok.headers.get("content-security-policy"), /object-src 'none'/);
  assert.match(ok.headers.get("content-security-policy"), /base-uri 'none'/);
  assert.match(ok.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(ok.headers.get("content-security-policy"), /connect-src 'self'/);
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");

  const rootApi = await fetch(`${base}/api/root`);
  assert.match(rootApi.headers.get("content-security-policy"), /frame-ancestors 'none'/);

  const forgedStatus = await new Promise((resolve, reject) => {
    const req = request({
      hostname: "127.0.0.1",
      port: server.address().port,
      path: "/",
      headers: { host: "evil.example" }
    }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); });
    req.on("error", reject);
    req.end();
  });
  assert.equal(forgedStatus, 421);
  assert.equal((await fetch(base, { method: "POST" })).status, 405);
});

test("Host validation rejects malformed authorities and accepts loopback names", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-host-cases-"));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const port = server.address().port;
  const statusFor = (hostHeader) => new Promise((resolve, reject) => {
    const headers = hostHeader == null ? {} : { host: hostHeader };
    const req = request({ hostname: "127.0.0.1", port, path: "/", setHost: false, headers }, (res) => {
      res.resume();res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);req.end();
  });

  assert.equal(await statusFor(`127.0.0.1:${port}`), 200);
  assert.equal(await statusFor(`localhost:${port}`), 200);
  assert.equal(await statusFor(`[::1]:${port}`), 200);
  assert.ok([400, 421].includes(await statusFor(null)), "missing Host must be rejected by Node or Matn");
  assert.equal(await statusFor("evil@127.0.0.1"), 421);
  assert.equal(await statusFor("not a host"), 421);
});

test("startServer rejects when its port is already in use", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-listen-"));
  const first = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => first.close(resolve));
    await rm(root, { recursive: true, force: true });
  });

  await assert.rejects(
    startServer({ port: first.address().port, host: "127.0.0.1", defaultArg: root }),
    (error) => error && error.code === "EADDRINUSE"
  );
});

test("server.close ends active SSE clients and releases the server", async () => {
  const root = await mkdtemp(join(tmpdir(), "matn-sse-close-"));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  const req = request({ hostname: "127.0.0.1", port: server.address().port, path: "/api/events" });
  const response = await new Promise((resolve, reject) => {
    req.on("response", resolve);req.on("error", reject);req.end();
  });
  assert.match(response.headers["content-security-policy"], /connect-src 'self'/);

  await Promise.race([
    new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    new Promise((_, reject) => setTimeout(() => reject(new Error("server.close timed out with an SSE client")), 500))
  ]);
  await rm(root, { recursive: true, force: true });
});

test("workspace search indexes a folder and finds normalized Arabic content", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-search-"));
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "README.md"), "---\ntitle: البداية\naliases: [الرئيسية]\n---\n# أهلًا\nمقدمة عامة", "utf8");
  await writeFile(join(root, "docs", "guide.md"), "# دليل\nهذه التَّجربة تشرح البحث العربي.", "utf8");
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/api/list?dir=${encodeURIComponent(root)}`);

  let payload;
  for (let attempt = 0; attempt < 50; attempt++) {
    const response = await fetch(`${base}/api/search?q=${encodeURIComponent("التجربة")}&mode=all`);
    assert.equal(response.status, 200);
    payload = await response.json();
    if (!payload.indexing) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(payload.indexing, false);
  assert.equal(payload.results[0].rel, "docs/guide.md");
  assert.match(payload.results[0].snippet, /التَّجربة/);

  const alias = await fetch(`${base}/api/search?q=${encodeURIComponent("الرئيسية")}&mode=files`);
  assert.equal((await alias.json()).results[0].rel, "README.md");

  await new Promise((resolve) => setTimeout(resolve, 5));
  await writeFile(join(root, "docs", "guide.md"), "# دليل\nمحتوى مُحدَّث بعد الفهرسة.", "utf8");
  const updated = await fetch(`${base}/api/search?q=${encodeURIComponent("محدث")}&mode=all`);
  assert.equal((await updated.json()).results[0].rel, "docs/guide.md");
});

test("switching indexed folders never leaks results from the previous folder", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-search-switch-"));
  const first = join(root, "first"), second = join(root, "second");
  await mkdir(first);await mkdir(second);
  await writeFile(join(first, "secret.md"), "# سر\nعبارة سرية فريدة", "utf8");
  await writeFile(join(second, "public.md"), "# عام\nمحتوى متاح", "utf8");
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/api/list?dir=${encodeURIComponent(first)}`);
  for (let attempt = 0; attempt < 50; attempt++) {
    const payload = await (await fetch(`${base}/api/search?q=${encodeURIComponent("سرية")}`)).json();
    if (!payload.indexing) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  await fetch(`${base}/api/list?dir=${encodeURIComponent(second)}`);
  const afterSwitch = await (await fetch(`${base}/api/search?q=${encodeURIComponent("سرية")}`)).json();
  assert.deepEqual(afterSwitch.results, []);
});

test("cross-site browser requests cannot trigger folder indexing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-search-fetch-site-"));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/list?dir=${encodeURIComponent(root)}`, { headers: { "sec-fetch-site": "cross-site" } });
  assert.equal(response.status, 403);
});

test("reader state requires a same-origin session token and persists outside the workspace", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-state-root-"));
  const dataDir = await mkdtemp(join(tmpdir(), "matn-state-data-"));
  const file = join(root, "README.md");
  await writeFile(file, "# البداية\n", "utf8");
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root, dataDir });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(base)).text();
  const token = /<meta name="matn-session" content="([a-f0-9]{64})">/.exec(html)?.[1];
  assert.ok(token, "server page should contain a per-process session token");

  const body = JSON.stringify({ currentFile: file, position: { heading: "البداية", sectionRatio: 0.4, overallRatio: 0.25 } });
  assert.equal((await fetch(`${base}/api/state`, { method: "PUT", body })).status, 403);
  assert.equal((await fetch(`${base}/api/state`, {
    method: "PUT",
    headers: { origin: "http://evil.example", "x-matn-session": token, "content-type": "application/json" },
    body
  })).status, 403);

  const saved = await fetch(`${base}/api/state`, {
    method: "PUT",
    headers: { origin: base, "x-matn-session": token, "content-type": "application/json" },
    body
  });
  assert.equal(saved.status, 200);
  const payload = await saved.json();
  assert.equal(payload.workspace.lastFile, file);
  assert.equal(payload.workspace.positions["README.md"].overallRatio, 0.25);

  const favoriteBody = { action: "toggle-favorite", currentFile: file, bookmark: { id: "file:README.md", type: "file" } };
  const favorite = await (await fetch(`${base}/api/state`, { method: "PUT", headers: { origin: base, "x-matn-session": token, "content-type": "application/json" }, body: JSON.stringify(favoriteBody) })).json();
  assert.equal(favorite.workspace.favorites[0].path, "README.md");
  const annotation = { id: "note-1", quote: "البداية", prefix: "", suffix: "", heading: "البداية", note: "ملاحظة", color: "green" };
  const noted = await (await fetch(`${base}/api/state`, { method: "PUT", headers: { origin: base, "x-matn-session": token, "content-type": "application/json" }, body: JSON.stringify({ action: "upsert-annotation", currentFile: file, annotation }) })).json();
  assert.equal(noted.workspace.annotations[0].note, "ملاحظة");
  const later = await (await fetch(`${base}/api/state`, { method: "PUT", headers: { origin: base, "x-matn-session": token, "content-type": "application/json" }, body: JSON.stringify({ action: "toggle-read-later", currentFile: file }) })).json();
  assert.equal(later.workspace.readLater[0].path, "README.md");
  const deleted = await (await fetch(`${base}/api/state`, { method: "PUT", headers: { origin: base, "x-matn-session": token, "content-type": "application/json" }, body: JSON.stringify({ action: "delete-annotation", currentFile: file, id: "note-1" }) })).json();
  assert.deepEqual(deleted.workspace.annotations, []);
  await fetch(`${base}/api/state`, { method: "PUT", headers: { origin: base, "x-matn-session": token, "content-type": "application/json" }, body: JSON.stringify({ action: "mark-read", currentFile: file }) });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await writeFile(file, "# البداية\n", "utf8");
  assert.deepEqual((await (await fetch(`${base}/api/changes`)).json()).changed, [], "mtime-only changes with identical content are ignored");
  await new Promise((resolve) => setTimeout(resolve, 5));
  await writeFile(file, "# البداية\nمحتوى جديد\n", "utf8");
  assert.deepEqual((await (await fetch(`${base}/api/changes`)).json()).changed, ["README.md"]);
  assert.equal((await (await fetch(`${base}/api/file-info?path=${encodeURIComponent(file)}`)).json()).changed, true);

  const disk = JSON.parse(await readFile(join(dataDir, "state.json"), "utf8"));
  assert.equal(disk.workspaces[payload.workspace.root].lastFile, "README.md");
  assert.deepEqual(await readdir(root), ["README.md"], "state must not create sidecar files in the workspace");
});

test("reader state rejects oversized, invalid, and out-of-root updates", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-state-validation-"));
  const dataDir = await mkdtemp(join(tmpdir(), "matn-state-validation-data-"));
  const outside = join(tmpdir(), `matn-state-outside-${Date.now()}.md`);
  await writeFile(join(root, "inside.md"), "# ok\n", "utf8");
  await writeFile(outside, "# no\n", "utf8");
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root, dataDir });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
    await rm(outside, { force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = /content="([a-f0-9]{64})"/.exec(await (await fetch(base)).text())?.[1];
  const headers = { origin: base, "x-matn-session": token, "content-type": "application/json" };
  assert.equal((await fetch(`${base}/api/state`, { method: "PUT", headers, body: "{" })).status, 400);
  assert.equal((await fetch(`${base}/api/state`, { method: "PUT", headers, body: JSON.stringify({ currentFile: outside }) })).status, 400);
  assert.equal((await fetch(`${base}/api/state`, { method: "PUT", headers, body: JSON.stringify({ currentFile: join(root, "inside.md"), padding: "x".repeat(270000) }) })).status, 413);
});

test("workspace links resolve by relative path and alias and expose backlinks", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-links-"));
  await mkdir(join(root, "docs"));
  await mkdir(join(root, "assets"));
  const readme = join(root, "README.md"), guide = join(root, "docs", "guide.md");
  await writeFile(readme, "# البداية\nراجع [[دليل]] و[التثبيت](docs/guide.md#التثبيت).\n[عنوان مفقود](docs/guide.md#غير-موجود)\n[ملف مفقود](docs/no.md)\n![غلاف](assets/غلاف.png)\n[خارجي](https://example.com)\n[خارج الجذر](../secret.pdf)\n", "utf8");
  await writeFile(guide, "---\ntitle: الدليل\naliases: [دليل]\n---\n# مقدمة\n## التثبيت\nخطوات مفيدة.\n", "utf8");
  await writeFile(join(root, "assets", "غلاف.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/api/list?dir=${encodeURIComponent(root)}`);
  for (let attempt = 0; attempt < 50; attempt++) {
    const status = await (await fetch(`${base}/api/search?q=&mode=files`)).json();
    if (!status.indexing) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  const alias = await fetch(`${base}/api/resolve?from=${encodeURIComponent(readme)}&target=${encodeURIComponent("دليل")}`);
  assert.equal(alias.status, 200);
  assert.equal((await alias.json()).path, guide);
  const relative = await fetch(`${base}/api/resolve?from=${encodeURIComponent(readme)}&target=${encodeURIComponent("docs/guide.md#التثبيت")}`);
  const resolved = await relative.json();
  assert.equal(resolved.heading.text, "التثبيت");
  assert.match(resolved.snippet, /خطوات مفيدة/);

  const context = await (await fetch(`${base}/api/context?path=${encodeURIComponent(guide)}`)).json();
  assert.equal(context.backlinks.length, 3);
  assert.equal(context.backlinks[0].path, readme);
  assert.equal((await fetch(`${base}/api/context?path=${encodeURIComponent(join(tmpdir(), "outside.md"))}`)).status, 400);

  const health = await (await fetch(`${base}/api/health?path=${encodeURIComponent(readme)}`)).json();
  assert.equal(health.issueCount, 3);
  assert.equal(health.counts.ok, 3);
  assert.equal(health.counts["missing-heading"], 1);
  assert.equal(health.counts.missing, 1);
  assert.equal(health.counts["outside-root"], 1);
  assert.equal(health.counts["external-unchecked"], 1);
  assert.equal(health.items.find((item) => item.kind === "image").resolved.rel, "assets/غلاف.png");
});

test("file actions are session-protected and trash only through the injected OS adapter", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-actions-"));
  const dataDir = await mkdtemp(join(tmpdir(), "matn-actions-data-"));
  const trashDir = await mkdtemp(join(tmpdir(), "matn-actions-trash-"));
  const file = join(root, "remove.md"), trashed = join(trashDir, "remove.md");
  await writeFile(file, "# مؤقت\n", "utf8");
  const calls = [];
  const platformActions = {
    trash: async (path) => { calls.push(["trash", path]); await rename(path, trashed); },
    reveal: async (path) => { calls.push(["reveal", path]); },
    openEditor: async (path) => { calls.push(["editor", path]); }
  };
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root, dataDir, editor: "/editor", allowFileActions: true, platformActions });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
    await rm(trashDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = /content="([a-f0-9]{64})"/.exec(await (await fetch(base)).text())?.[1];
  const headers = { origin: base, "x-matn-session": token, "content-type": "application/json" };
  const body = JSON.stringify({ path: file });
  await fetch(`${base}/api/state`, { method: "PUT", headers, body: JSON.stringify({ currentFile: file, position: { overallRatio: 0.7 } }) });
  assert.equal((await fetch(`${base}/api/trash`, { method: "POST", body })).status, 403);
  const info = await (await fetch(`${base}/api/file-info?path=${encodeURIComponent(file)}`)).json();
  assert.equal(info.allowTrash, true);
  assert.equal(info.canOpenEditor, true);
  assert.equal((await fetch(`${base}/api/reveal`, { method: "POST", headers, body })).status, 200);
  assert.equal((await fetch(`${base}/api/open-editor`, { method: "POST", headers, body })).status, 200);
  assert.equal((await fetch(`${base}/api/trash`, { method: "POST", headers, body })).status, 200);
  assert.deepEqual(calls.map((call) => call[0]), ["reveal", "editor", "trash"]);
  assert.equal(await readFile(trashed, "utf8"), "# مؤقت\n");
  assert.equal((await fetch(`${base}/api/raw?path=${encodeURIComponent(file)}`)).status, 400);
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.workspace.positions["remove.md"].overallRatio, 0.7, "reading history must survive trashing");
  assert.equal(state.workspace.missingFiles["remove.md"].reason, "trash");
});

test("book API resolves SUMMARY.md chapters without modifying the workspace", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-book-"));
  await mkdir(join(root, "docs"));
  const summary = join(root, "SUMMARY.md");
  const source = "# Summary\n\n- [البداية](README.md)\n  - [التثبيت](docs/guide.md#التثبيت)\n- [خارجي](https://example.com)\n- [مفقود](missing.md)\n";
  await writeFile(summary, source, "utf8");
  await writeFile(join(root, "README.md"), "# البداية\n", "utf8");
  await writeFile(join(root, "docs", "guide.md"), "# الدليل\n## التثبيت\n", "utf8");
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/api/list?dir=${encodeURIComponent(root)}`);
  let book = { indexing: true };
  for (let attempt = 0; attempt < 50 && book.indexing; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    book = await (await fetch(`${base}/api/book`)).json();
  }
  assert.deepEqual(book.chapters.map(({ title, rel, anchor, depth }) => ({ title, rel, anchor, depth })), [
    { title: "البداية", rel: "README.md", anchor: "", depth: 0 },
    { title: "التثبيت", rel: "docs/guide.md", anchor: "التثبيت-1", depth: 1 },
  ]);
  assert.equal(await readFile(summary, "utf8"), source);
});

test("trash is disabled by default and rejects symlink file actions", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-actions-disabled-"));
  const dataDir = await mkdtemp(join(tmpdir(), "matn-actions-disabled-data-"));
  const file = join(root, "real.md"), link = join(root, "link.md");
  await writeFile(file, "# باقٍ\n", "utf8");
  await symlink(file, link);
  let called = false;
  const actions = { trash: async () => { called = true; }, reveal: async () => {}, openEditor: async () => {} };
  const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root, dataDir, platformActions: actions });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = /content="([a-f0-9]{64})"/.exec(await (await fetch(base)).text())?.[1];
  const headers = { origin: base, "x-matn-session": token, "content-type": "application/json" };
  assert.equal((await fetch(`${base}/api/trash`, { method: "POST", headers, body: JSON.stringify({ path: file }) })).status, 403);
  assert.equal((await fetch(`${base}/api/reveal`, { method: "POST", headers, body: JSON.stringify({ path: link }) })).status, 400);
  assert.equal(called, false);
  assert.equal(await readFile(file, "utf8"), "# باقٍ\n");
});
