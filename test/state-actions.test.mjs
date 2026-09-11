import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const StateActions = createRequire(import.meta.url)("../src/state-actions.cjs");

function empty() {
  return { lastFile: "", lastOpenedAt: 0, positions: {}, missingFiles: {}, favorites: [], readLater: [], annotations: [], fileMeta: {} };
}
function apply(workspace, request) {
  const result = StateActions.applyAction(workspace, request);
  assert.equal(result.error, undefined, `unexpected error: ${result.error}`);
  return StateActions.mergeWorkspace(workspace, result.patch, 1);
}

// The server persists these to disk and the browser persists them to localStorage when
// Matn is opened without one. They have to be the same actions or a highlight made in
// the demo would not mean what a highlight made locally means.
test("highlights, favourites, and read-later toggle the same way for either store", () => {
  let workspace = apply(empty(), { action: "upsert-annotation", rel: "a.md", annotation: { id: "n1", quote: "نص", color: "green" } });
  assert.equal(workspace.annotations.length, 1);
  assert.equal(workspace.annotations[0].path, "a.md", "the caller's relative path must win over anything in the payload");

  // an upsert replaces by id rather than appending a duplicate
  workspace = apply(workspace, { action: "upsert-annotation", rel: "a.md", annotation: { id: "n1", quote: "نص", note: "تعليق" } });
  assert.equal(workspace.annotations.length, 1);
  assert.equal(workspace.annotations[0].note, "تعليق");

  workspace = apply(workspace, { action: "toggle-favorite", rel: "a.md", bookmark: { id: "f1", type: "selection" } });
  assert.equal(workspace.favorites.length, 1);
  workspace = apply(workspace, { action: "toggle-favorite", rel: "a.md", bookmark: { id: "f1", type: "selection" } });
  assert.equal(workspace.favorites.length, 0, "toggling the same favourite twice must remove it");

  workspace = apply(workspace, { action: "toggle-read-later", rel: "a.md" });
  assert.deepEqual(workspace.readLater.map((item) => item.id), ["later:a.md"]);
  workspace = apply(workspace, { action: "toggle-read-later", rel: "a.md" });
  assert.deepEqual(workspace.readLater, []);

  workspace = apply(workspace, { action: "delete-annotation", rel: "a.md", id: "n1" });
  assert.deepEqual(workspace.annotations, []);
});

test("a malformed request is named, not applied", () => {
  const workspace = empty();
  assert.equal(StateActions.applyAction(workspace, { action: "toggle-favorite", rel: "a.md" }).error, "invalid favorite");
  assert.equal(StateActions.applyAction(workspace, { action: "upsert-annotation", rel: "a.md", annotation: { id: "n1" } }).error, "invalid annotation");
  assert.equal(StateActions.applyAction(workspace, { action: "delete-annotation", rel: "a.md" }).error, "invalid annotation");
  assert.equal(StateActions.applyAction(workspace, { action: "nope", rel: "a.md" }).error, "unknown state action");
  // only a caller holding the file can fingerprint it; the browser cannot, and that is not an error
  assert.deepEqual(StateActions.applyAction(workspace, { action: "mark-read", rel: "a.md" }), { patch: {} });
});

test("merging keeps maps and replaces the arrays a patch already computed", () => {
  const previous = { ...empty(), positions: { "a.md": { heading: "x" } }, fileMeta: { "a.md": { size: 1 } }, annotations: [{ id: "keep" }] };
  const next = StateActions.mergeWorkspace(previous, { positions: { "b.md": { heading: "y" } }, fileMeta: { "b.md": { size: 2 } } }, 5);
  assert.deepEqual(Object.keys(next.positions).sort(), ["a.md", "b.md"], "positions must merge, not replace");
  assert.deepEqual(Object.keys(next.fileMeta).sort(), ["a.md", "b.md"]);
  assert.deepEqual(next.annotations, [{ id: "keep" }], "a patch without annotations must leave them alone");
  assert.equal(next.lastOpenedAt, 5);
  assert.deepEqual(StateActions.mergeWorkspace(previous, { annotations: [] }, 5).annotations, []);
});
