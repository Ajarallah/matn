import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
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
  for (const [path, type] of [["/katex.js", /javascript/], ["/katex.css", /css/], ["/marked-footnote.js", /javascript/]]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get("content-type"), type, path);
  }
});
