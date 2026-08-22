---
name: editing-rendered-html
description: Use when generating an HTML visual, slide, deck, diagram, or page the user will want to fine-tune, or when the user asks to edit/move/resize/retype/nudge elements directly in a rendered HTML page instead of describing changes in prose. Triggers include "let me edit this", "move that to the left", "nudge the layout", "make this editable", "tweak the render".
---

# editing-rendered-html

## Output contract (read before folding)

After folding nudges in step 3 you MUST emit exactly one summary line before anything else about the fold:

```
fold: {n} nudges applied · {m} notes acted on · {k} orphans reported
```

Use `0` freely (`fold: nothing pending` when the patch is empty). This line is the verifiable anchor that the patch was actually read and folded; do not skip it, do not paraphrase it. Report every orphan eid by name rather than guessing at what it used to be.

## Overview

Make agent-authored HTML editable-by-default in the browser so the user fixes the last 20% — position, copy, size, color — by hand. Hand-edits ("**nudges**") and typed **notes** are captured as a regeneration-safe patch with a full edit history you read each turn; on finalize the page bakes to a clean standalone file.

Core principle: the source HTML stays clean; edits live in a sidecar patch keyed by `data-eid`; you fold facets into source, act on notes as instructions, and regenerate — the patch reattaches because the eids are stable.

## When to use

- You are generating an HTML visual/slide/deck/diagram/page the user will refine.
- The user wants to move/resize/retype/recolor elements directly in the render, or leave notes on elements for you to act on.
- You are generating a multi-slide deck: put the slides in one directory and serve the directory.

Not this skill: editing the agent's own structure/logic (that stays your job); editing third-party HTML you did not author with `data-eid` tags.

## Procedure

1. **Author clean + tag.** Write the HTML normally. First read this skill's `preferences.md` if it has entries, and apply any matching pattern at authoring time instead of waiting for nudges. Add a stable, semantic `data-eid="..."` to every element the user may want to nudge (headings, subheadings, captions, cards, images). Keep eids stable across regenerations — that is what makes patches survive. For decks, eids must be unique within each slide only.
2. **Serve.** Start the overlay server and give the user the URL:
   `node skills/editing-rendered-html/serve.js <path/to/file.html>`
   For a deck pass a directory: `node skills/editing-rendered-html/serve.js <dir-with-slides>`. It serves every `*.html` sorted (excluding `*.final.html`), one sidecar patch per slide. It prints a JSON line with `url`, `mode`, and paths. Tell the user the URL and the controls: **E** to edit, **G** for grid snap, drag the blue grip to move, click text to retype, drag the corner to resize, select for the format bar, **A** then click an element to leave a note for you, **Save**, and in decks **◄ ►** or arrow keys to switch slides (auto-saves first).
3. **Fold.** On your next turn read the sidecar `*.patch.json`. It is a v2 document: `{version: 2, entries: {eid: {final: {...facets}, history: [...]}}}`. `final` holds the styles/copy to apply; `history` is the timestamped op trail (`move`, `size`, `retype`, `style`, `note`) — read it for intent (repeated moves in one direction mean "further", a note overrides everything). Apply each `final` facet to its element, rewrite copy or structure wherever a `note` requires it, then **delete the notes you acted on from the patch file** (transforms stay until baked into source). Emit the fold line from the output contract. Report orphan eids (in the patch but no longer in source) rather than applying them blindly.
4. **Finalize + distill.** When the user is done, have them click **Finalize** (writes `*.final.html`), or keep iterating from step 2. Stop the server. Deliver `*.final.html` — clean markup, no overlay. Then update this skill's `preferences.md`: review the finished page's history plus existing entries, and append only patterns already seen three or more times (dated, concrete: "user raises body font ~10% on dense slides"). Keep the file under 30 lines; one-off tweaks never go in.

## Capabilities (what the user can do in the browser)

move · retype · resize · font-size · align · light-color · grid-snap toggle · **annotate** (A + click leaves a note for the agent) · deck slide switching (◄ ► / arrow keys, auto-save). Grid snap is an editor preference (per-browser), not part of the patch.

## Common mistakes

- **Unstable eids** — renaming/reordering eids on regen orphans the patch. Keep them stable and semantic.
- **Baking the overlay into source** — never paste overlay code into the HTML; it is injected at serve time only.
- **Applying orphan patch entries** — if an eid is gone from source, report it; do not guess.
- **Leaving acted-on notes in the patch** — a note you have handled must be removed, or you will act on it again next turn.
- **Skipping the fold line** — no fold summary means the fold cannot be verified; always emit it.
- **Telling the user to run slash commands** — there are none; serving is automatic on your side.
