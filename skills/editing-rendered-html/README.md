# editing-rendered-html

Makes agent-authored HTML editable in the browser so the human fixes the last 20% — position, copy, size, color — by hand, and leaves instructions as notes.

## How it works

```
slide.html            source (agent-authored, stays clean)
slide.patch.json      your edits + notes, keyed by data-eid   ← the handoff
slide.final.html      clean standalone export (Finalize)
```

1. **Agent** writes HTML with stable `data-eid` tags on editable elements, then runs `node serve.js <file.html | deck-dir>`.
2. **Server** injects an editing overlay at serve time and prints a URL. Decks: one patch per slide.
3. **You** edit in the browser. Edits accumulate in a v2 patch (`{entries: {eid: {final, history}}}`) with a timestamped op trail — nudges for styles, notes for instructions to the agent.
4. **Agent** folds on its next turn: applies facets, acts on notes (then deletes them), regenerates. Stable eids mean edits survive regeneration.

## Controls

**E** edit · **A** annotate (click element → note, Enter syncs instantly) · drag grip to move · corner to resize · click text to retype · format bar for font/align/color · **G** grid snap · **◄ ►** switch deck slides · **Save** flushes to disk · **✔ Finalize** exports a clean standalone page.

Green ✎ badges mark pending notes; click to edit or delete them.

## Files

- `serve.js` — static server + WebSocket + overlay injection
- `assets/overlay.js`, `patch-core.js`, `overlay.css` — browser overlay (injected, never baked into output)
- `preferences.md` — learned authoring patterns (3+ occurrences, dated, ≤30 lines)

Tests: `node --test "test/*.test.js"`; browser loop: `test/smoke.md`.
