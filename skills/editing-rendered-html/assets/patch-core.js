// Pure, runtime-agnostic patch logic. No DOM, no Node APIs.
// Shared by the browser overlay and node --test.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // node
  if (typeof window !== 'undefined') window.PatchCore = api;                 // browser
})(this, function () {
  'use strict';

  // Round a delta. When grid is on, lock to the nearest multiple of step.
  function snap(v, gridOn, step) {
    return gridOn ? Math.round(v / step) * step : Math.round(v);
  }

  // Drop patch entries that carry no facets.
  function prune(patch) {
    const out = {};
    for (const k in patch) {
      if (patch[k] && Object.keys(patch[k]).length) out[k] = patch[k];
    }
    return out;
  }

  // Convert a single patch entry into a map of CSS properties to apply.
  function entryToStyle(entry) {
    const css = {};
    if (entry.transform) {
      css.transform = 'translate(' + entry.transform.x + 'px,' + entry.transform.y + 'px)';
    }
    if (entry.size) {
      if (entry.size.w != null) css.width = entry.size.w + 'px';
      if (entry.size.h != null) css.minHeight = entry.size.h + 'px';
    }
    if (entry.style) {
      if (entry.style.fontSize) css.fontSize = entry.style.fontSize;
      if (entry.style.color) css.color = entry.style.color;
      if (entry.style.textAlign) css.textAlign = entry.style.textAlign;
    }
    return css;
  }

  // Normalize any stored patch (v1 flat map or v2 doc) to working state.
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.entries || typeof raw.entries !== 'object') {
      return { flat: prune(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}), hist: {} };
    }
    const flat = {}, hist = {};
    for (const eid in raw.entries) {
      const e = raw.entries[eid] || {};
      const f = prune(e.final && typeof e.final === 'object' ? e.final : {});
      if (Object.keys(f).length) flat[eid] = f;
      if (Array.isArray(e.history) && e.history.length) hist[eid] = e.history;
    }
    return { flat, hist };
  }

  // Build a v2 document from working state. Entries with neither facets nor history are dropped.
  function toDoc(flat, hist) {
    const entries = {};
    for (const eid in flat) {
      if (!flat[eid] || !Object.keys(flat[eid]).length) continue;
      entries[eid] = { final: flat[eid], history: (hist && hist[eid]) || [] };
    }
    return { version: 2, entries };
  }

  // A timestamped history operation.
  function op(kind, fields) {
    return Object.assign({ t: new Date().toISOString(), kind: kind }, fields);
  }

  return { snap, prune, entryToStyle, normalize, toDoc, op };
});
