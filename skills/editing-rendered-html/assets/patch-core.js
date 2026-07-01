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

  return { snap, prune, entryToStyle };
});
