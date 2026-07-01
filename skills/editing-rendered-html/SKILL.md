---
name: editing-rendered-html
description: Use when generating an HTML visual, slide, deck, diagram, or page the user will want to fine-tune, or when the user asks to edit/move/resize/retype/nudge elements directly in a rendered HTML page instead of describing changes in prose. Triggers include "let me edit this", "move that to the left", "nudge the layout", "make this editable", "tweak the render".
---

# editing-rendered-html

## Overview

Make agent-authored HTML editable-by-default in the browser so the user fixes the last 20% — position, copy, size, color — by hand. Hand-edits ("**nudges**") are captured as a regeneration-safe patch you read each turn; on finalize the page bakes to a clean standalone file.

Core principle: the source HTML stays clean; nudges live in a sidecar patch keyed by `data-eid`; you fold nudges into source and regenerate, and the patch reattaches because the eids are stable.

## When to use

- You are generating an HTML visual/slide/deck/diagram/page the user will refine.
- The user wants to move/resize/retype/recolor elements directly in the render.

Not this skill: editing the agent's own structure/logic (that stays your job); editing third-party HTML you did not author with `data-eid` tags.

## Procedure

1. **Author clean + tag.** Write the HTML normally. Add a stable, semantic `data-eid="..."` to every element the user may want to nudge (headings, subheadings, captions, cards, images). Keep eids stable across regenerations — that is what makes nudges survive.
2. **Serve.** Start the overlay server and give the user the URL:
   `node skills/editing-rendered-html/serve.js <path/to/file.html>`
   It prints a JSON line with `url`, `patch`, and `final` paths. Tell the user the URL and that they can press **E** to edit, **G** for grid snap, drag the blue grip to move, click text to retype, drag the corner to resize, select for the format bar, then **Save**.
3. **Read nudges.** On your next turn read the sidecar `*.patch.json`. It is a diff keyed by `data-eid` (`{eid:{text,transform,size,style}}`). Fold each nudge into the source HTML, then regenerate. Report orphan eids (in the patch but no longer in source) rather than applying them blindly.
4. **Finalize.** When the user is done, have them click **Finalize** (writes `*.final.html`), or keep iterating from step 2. Stop the server. Deliver `*.final.html` — clean markup, no overlay.

## Capabilities (what the user can nudge)

move · retype · resize · font-size · align · light-color · grid-snap toggle. Grid snap is an editor preference (per-browser), not part of the patch.

## Common mistakes

- **Unstable eids** — renaming/reordering eids on regen orphans the patch. Keep them stable and semantic.
- **Baking the overlay into source** — never paste overlay code into the HTML; it is injected at serve time only.
- **Applying orphan patch entries** — if an eid is gone from source, report it; do not guess.
- **Telling the user to run slash commands** — there are none; serving is automatic on your side.
