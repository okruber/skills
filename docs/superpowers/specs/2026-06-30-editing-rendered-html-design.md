# editing-rendered-html — Design Spec

**Date:** 2026-06-30
**Status:** Approved (design); ready for implementation planning
**Home:** `okruber/skills` → `skills/editing-rendered-html/` (publish-ready; Imeto org marketplace is a later hop)

## Problem

HTML is a great medium for generating presentations and visuals, but the agent gets them ~80% right. The final 20% is small spatial and copy changes — "move this a little left", "fix this word", "make that lighter" — which are **hard to communicate in words** and **too cumbersome to fix in code**. The user wants to fix that 20% by **direct manipulation of the rendered output**, while still **iterating with the agent** afterward — so hand-edits must survive the agent's regenerations, and the agent must become aware of what was changed.

A hard constraint from the user's own workflow: **minimal ceremony**. Workflows that depend on remembering slash commands fail (the user falls out of sync). The only manual action permitted is the one taken while looking at the render — editing plus one Save click.

## Core principle — *nudge*

The loop is **generate → nudge → read nudges → refine**. "Nudge" is the leading word: a hand correction to the rendered output, captured as data the agent reads. The user nudges; the agent inherits the nudges as an exact diff and builds on them instead of re-deriving from prose.

## Goal

A model-invoked skill that makes agent-generated HTML **editable-by-default** in the user's browser, captures hand-edits as a **regeneration-safe patch** the agent reads each turn, and **bakes** to a clean standalone file on finalize.

Non-goals: a full design tool (no multi-select, z-order, alignment guides, free typography); editing arbitrary third-party HTML the agent didn't author with `data-eid` tags (out of scope for v1); WYSIWYG of structural/logic changes (those stay the agent's job).

## Architecture

The overlay is a **serve-time concern, never baked into source** — mirroring how the brainstorm companion server injects `helper.js` into whatever HTML it serves. This keeps three states cleanly separated:

| State | File | Role | Mutability |
|---|---|---|---|
| **Source** | `deck.html` | Clean HTML the agent authors; only addition is semantic `data-eid` attributes | Agent-owned |
| **Patch** | `deck.patch.json` | The user's nudges as a diff keyed by `data-eid`; the only state the agent reads | User-owned (via browser) |
| **Baked** | `deck.final.html` | Patch flattened into markup, overlay stripped; the deliverable | Generated on finalize |

```
generate                 serve (inject overlay)        nudge          read patch          finalize
deck.html  ───────────▶  http://localhost:PORT  ──────▶ Save  ──────▶ deck.patch.json ──▶ deck.final.html
  ▲  clean markup           overlay.css + overlay.js      writes        agent folds          flatten + strip
  │  + data-eid             injected at serve time        sidecar       nudges into          overlay
  └──────────── regenerate (data-eids stable → patch reattaches) ◀──── source, regen
```

### Data flow

1. **Generate.** Agent writes `deck.html`: clean HTML, every editable element carries a stable `data-eid`. No overlay code in the file.
2. **Serve.** `serve.js` serves the file, injecting `overlay.css`/`overlay.js` at serve time and giving the user a `localhost` URL. Auto-started by the skill; no command for the user to remember.
3. **Nudge.** User edits in the browser (B-tier capabilities below), clicks **Save**. The overlay sends the patch over a WebSocket; `serve.js` writes `deck.patch.json` beside the source.
4. **Read.** On the agent's next turn it reads `deck.patch.json` — a small structured diff (`{"title":{"transform":{"x":50,"y":30}}}`) — so it sees *precisely* what was nudged, not a vague "something changed".
5. **Refine.** Agent folds the nudges into `deck.html` and regenerates. Because `data-eid`s are stable, any not-yet-folded patch entries reattach on reload.
6. **Bake.** On "finalize", the overlay serializes the live (patched) DOM in the browser minus all injected overlay chrome, and `serve.js` writes `deck.final.html` — a pristine, portable, self-contained file. (Bake runs browser-side, not as a server-side `bake.js`, because the okruber store is zero-dependency: server-side HTML flattening would need a DOM-parser dep. Same behavior, output written by the server.)

### Why clean-source + sidecar patch

- The agent can **regenerate freely** without fighting hand-edits — the patch is separate and reattaches by `data-eid`.
- The patch is a **readable diff**, the exact channel that makes the agent aware (verified in prototype: a title drag produced `{"title":{"transform":{"x":50,"y":30}}}` and round-tripped to the agent's session file).
- **Bake** guarantees a clean deliverable with zero overlay cruft.
- Works in **any browser** (the Save round-trip needs no File System Access API). Chromium direct-file-save is a deferred convenience layered on later, never the primary path.

## Components

```
skills/editing-rendered-html/
  SKILL.md       # model-invoked procedure: tag data-eids → serve → read patch → bake
  overlay.css    # edit-mode styling: move grips, resize handles, floating format bar, grid overlay
  overlay.js     # edit engine + patch capture + Save + in-browser bake (serialize patched DOM, strip overlay)
  serve.js       # serve any HTML, inject overlay, write sidecar patch.json + final.html over WS
```

### `overlay.js` — the edit engine (B-tier, all prototype-verified)

Toggle edit mode (button or **E**). Per editable element (`[data-eid]`):
- **Move** — a blue grip (✥) at the element's top-left; drag to reposition via CSS `transform`. Every element type is movable (headers, subtitles, eyebrow, badge, cards) — the prototype bug where static-positioned text had no grip anchor is fixed by giving each editable a positioning context on entering edit mode, and grips are always-visible in edit mode (discoverable, not hover-only).
- **Retype** — `contenteditable` on the text; edits captured into the text node only (handles excluded).
- **Resize** — corner handle on the selected element; sets width/min-height.
- **Format bar** — floating on selection: font-size (A-/A+), align (left/center/right), color (8-swatch **light** palette + free picker).
- **Grid snap** — toggleable (button or **G**), step 8/16/24/32px; when on, drags and resizes lock to the step and a grid overlay shows. Grid state is an **editor preference**, persisted per-browser, **not** part of the patch. (Grid visibility uses no opacity transition — transitions get throttled in background tabs.)
- **Save** — sends the pruned patch to the agent over the overlay's WebSocket channel.

Handles (`.grip`, `.rsz`) are `contenteditable=false` so they never catch the caret.

### Patch schema

Keyed by `data-eid`; only changed facets present; empty entries pruned before save:

```json
{
  "<eid>": {
    "text": "string",
    "transform": { "x": 0, "y": 0 },
    "size": { "w": 0, "h": 0 },
    "style": { "fontSize": "20px", "color": "#a5d6ff", "textAlign": "center" }
  }
}
```

### `serve.js`

Serves the target file with `overlay.css`/`overlay.js` injected at serve time; opens a WebSocket; on a patch message writes `<name>.patch.json` beside the source. Auto-started by the skill, auto-stopped on finalize. Models the brainstorm companion's inject-and-watch pattern but purpose-built: serves a real source file and writes a real sidecar.

### Bake (in-browser)

On finalize the overlay clones the live document, removes every injected node (marked `data-overlay`) and asset (marked `data-erh-asset`), drops `contenteditable` and the temporary positioning marker, and serializes the result. `serve.js` writes it to `<name>.final.html`. Hand-edits are already reflected in the DOM (text nodes + inline styles), so the baked markup is clean and self-contained. Absent edits → a clean copy. Browser-side avoids a server DOM-parser dependency.
### `SKILL.md` (model-invoked)

- **Description:** trigger phrasing on two branches — when the agent *generates* an HTML visual/slide/deck, and when the user asks to *edit / move things / nudge* a render. Leading word **nudge**. No workflow summary in the description (per `writing-skills` CSO).
- **Procedure:** (1) author clean HTML, tag editable elements with stable `data-eid`; (2) serve via `serve.js`, hand the user the URL; (3) on next turn read `<name>.patch.json`, fold nudges into source, regenerate; (4) on finalize the user clicks Finalize (overlay bakes, server writes `<name>.final.html`), stop the server, deliver it.
- Tool-agnostic wording (the repo's store is symlinked across Claude/Codex/Cursor).

## Invocation model

**Model-invoked**, deliberately — it resolves the minimal-ceremony constraint. HTML the agent generates through this skill is editable-by-default and already served; the user opens the URL, nudges, clicks Save. No slash command to forget, on either side.

## Error handling

- **Missing patch** — agent proceeds with source as-is; bake is a straight copy.
- **Stale `data-eid`** (element removed in a regen) — orphan patch entries are reported and ignored, never applied blindly.
- **Server already running / port in use** — reuse the existing instance for the file; otherwise pick a free port (companion-server pattern).
- **Standalone (overlay loaded without the server)** — Save degrades to "copy patch JSON to clipboard" so the loop still closes by paste.
- **Browser tab throttling** — no reliance on CSS transitions for state visibility (grid overlay toggles instantly).

## Testing (writing-skills = TDD for skills)

- **Engine:** overlay mechanics smoke-tested headless — move (incl. headers via grip), retype, resize, font-size, align, light color, grid-snap math (`37,19` → `72,48` at step 24), patch round-trip to the session file, and persistence across reload. Ship these as repeatable checks.
- **Bake:** unit checks on the pure helpers + a headless check that the baked file contains the edits and zero overlay artifacts. (Delegated to the Tester agent.)
- **Skill behavior:** RED baseline — an agent told "make this deck editable" without the skill fails to wire `data-eid`s + serve; GREEN — with the skill it follows the procedure. (Delegated to the Tester agent.)

## Packaging

Per `okruber/skills` conventions: add `./skills/editing-rendered-html` to `.claude-plugin/plugin.json`, run `bootstrap.sh` to symlink into `~/.agents/skills`, commit. Already shareable via `npx skills add okruber/skills`. Promotion to the Imeto org marketplace (via `marketplace-routing`) is a later, explicit step.

## Scope summary (locked)

B-tier: **move · retype · resize · font-size · align · light-color · grid-snap toggle.** Deferred: Chromium direct-file-save; full layout-editor features (multi-select, z-order, guides).
