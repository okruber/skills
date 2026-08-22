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

  // Build a v2 document from working state. Entries need facets or history;
  // iterating flat keys alone would silently drop notes on never-nudged elements.
  function toDoc(flat, hist) {
    const eids = new Set(Object.keys(flat || {}).concat(Object.keys(hist || {})));
    const entries = {};
    eids.forEach(function (eid) {
      const f = flat[eid] && Object.keys(flat[eid]).length ? flat[eid] : {};
      const h = (hist && hist[eid]) || [];
      if (Object.keys(f).length || h.length) entries[eid] = { final: f, history: h };
    });
    return { version: 2, entries };
  }

  // A timestamped history operation.
  function op(kind, fields) {
    return Object.assign({ t: new Date().toISOString(), kind: kind }, fields);
  }

  // Most recent unacted note on an eid, or null.
  function lastNote(hist, eid) {
    const h = hist && hist[eid];
    if (!h) return null;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].kind === 'note') return h[i].note;
    return null;
  }

  // Drop every unacted note op for an eid; true when anything was removed.
  function removeNotes(hist, eid) {
    const h = hist && hist[eid];
    if (!h) return false;
    const kept = h.filter(function (o) { return o.kind !== 'note'; });
    if (kept.length === h.length) return false;
    if (kept.length) hist[eid] = kept; else delete hist[eid];
    return true;
  }

  return { snap, prune, entryToStyle, normalize, toDoc, op, lastNote, removeNotes };
});
