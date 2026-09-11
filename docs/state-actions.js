// Pure reader-state actions. UMD: require() on the server, window.MatnStateActions in
// the page. One implementation, because the same highlight has to land the same way
// whether the server's state store persists it or the browser does — Matn opened from
// the static demo has no server behind it and still has to behave like a reader.
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MatnStateActions = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ACTIONS = ["toggle-favorite", "toggle-read-later", "upsert-annotation", "delete-annotation", "mark-read", "position"];

  function list(value) { return Array.isArray(value) ? value : []; }
  function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
  function nonEmptyString(value) { return typeof value === "string" && Boolean(value); }

  // Returns { patch } to apply, or { error } naming what was wrong with the request.
  // `rel` is the workspace-relative path the caller already resolved and trusts;
  // `fileMeta` is the caller's fingerprint for mark-read, which only the server can take.
  function applyAction(workspace, request) {
    var state = isObject(workspace) ? workspace : {};
    var options = isObject(request) ? request : {};
    var action = nonEmptyString(options.action) ? options.action : "position";
    var rel = typeof options.rel === "string" ? options.rel : "";
    var now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();

    if (action === "toggle-favorite") {
      var bookmark = isObject(options.bookmark) ? Object.assign({}, options.bookmark, { path: rel }) : null;
      if (!bookmark || !nonEmptyString(bookmark.id)) return { error: "invalid favorite" };
      var favorites = list(state.favorites);
      var hasFavorite = favorites.some(function (item) { return item && item.id === bookmark.id; });
      return { patch: { favorites: hasFavorite ? favorites.filter(function (item) { return !item || item.id !== bookmark.id; }) : favorites.concat(bookmark) } };
    }

    if (action === "toggle-read-later") {
      var laterId = "later:" + rel;
      var readLater = list(state.readLater);
      var hasLater = readLater.some(function (item) { return item && item.id === laterId; });
      return { patch: { readLater: hasLater ? readLater.filter(function (item) { return !item || item.id !== laterId; }) : readLater.concat({ id: laterId, type: "file", path: rel, createdAt: now }) } };
    }

    if (action === "upsert-annotation") {
      var annotation = isObject(options.annotation) ? Object.assign({}, options.annotation, { path: rel }) : null;
      if (!annotation || !nonEmptyString(annotation.id) || !nonEmptyString(annotation.quote)) return { error: "invalid annotation" };
      return { patch: { annotations: list(state.annotations).filter(function (item) { return !item || item.id !== annotation.id; }).concat(annotation) } };
    }

    if (action === "delete-annotation") {
      if (!nonEmptyString(options.id)) return { error: "invalid annotation" };
      return { patch: { annotations: list(state.annotations).filter(function (item) { return !item || item.id !== options.id; }) } };
    }

    if (action === "mark-read") {
      // only a caller with the file in hand can fingerprint it; without one there is
      // nothing to record, which is the browser's case and not an error
      if (!isObject(options.fileMeta)) return { patch: {} };
      var meta = {};
      meta[rel] = options.fileMeta;
      return { patch: { fileMeta: meta } };
    }

    if (action === "position") {
      var positions;
      if (isObject(options.position)) { positions = {}; positions[rel] = options.position; }
      return { patch: { lastFile: rel, positions: positions, lastOpenedAt: now } };
    }

    return { error: "unknown state action" };
  }

  // Maps merge key by key; arrays are replaced wholesale, because a patch that carries
  // an array has already computed the complete next value above.
  function mergeWorkspace(previous, patch, now) {
    var base = isObject(previous) ? previous : {};
    var next = isObject(patch) ? patch : {};
    var at = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    return Object.assign({}, base, next, {
      positions: Object.assign({}, base.positions, next.positions || {}),
      missingFiles: Object.assign({}, base.missingFiles, next.missingFiles || {}),
      fileMeta: Object.assign({}, base.fileMeta, next.fileMeta || {}),
      favorites: next.favorites === undefined ? list(base.favorites) : next.favorites,
      readLater: next.readLater === undefined ? list(base.readLater) : next.readLater,
      annotations: next.annotations === undefined ? list(base.annotations) : next.annotations,
      lastOpenedAt: next.lastOpenedAt === undefined || next.lastOpenedAt === null ? at : next.lastOpenedAt
    });
  }

  return { ACTIONS: ACTIONS, applyAction: applyAction, mergeWorkspace: mergeWorkspace };
});
