# Design: Obsidian Vault — Self-Maintaining LLM Wiki + Subtractive Agenda

**Date:** 2026-06-27
**Status:** Approved (design) → next: implementation plan
**Owner:** Olle
**Governs:** the `obsidian-vault-assistant` skill — relocating to omp at `~/.agents/skills/obsidian-vault-assistant/SKILL.md` (see §13) — and the structure of the OEK Vault at
`/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault/`

---

## 1. Problem

Two subsystems of the personal-assistant vault are failing, and they fail for the **same reason**.

### Measured baseline (2026-06-27)

**Knowledge base — 43 notes, all untouched ~1 month:**
- 53 outbound wikilinks total (~1.2/note); 22 notes have **zero** outbound links.
- **21 of 43 notes (49%) are orphans** — nothing links to them; unreachable by navigation.
- 13 notes are fully isolated (0 in + 0 out).
- 16 broken links point to notes that do not exist.
- No `index.md`. No raw/sources layer.
- 5 knowledge notes dumped at vault root, never filed (Decksmith 2.0 architecture, Decksmith evals, Tender, Vibe-Platform, State of golden.candidate).

**Agenda — a sink, not a plan:**
- 43 open items in "🔴 Active / This Week", 12 Waiting, 13 Backlog = 68 open.
- "Done This Week" holds 107 items — never swept.

**Rituals — abandoned:**
- 37 daily logs spanning 2026-03-04 → 2026-06-22, with a **37-day gap** in the middle.
- The `/start-day` `/sync-day` `/close-day` stamps barely appear; the ritual does not structurally hold.

**Schema drift:** SKILL.md references `6.Resources/` / `7.Archive/`; on disk they are `Resources/` / `Archive/`, both empty.

### Root cause

Both failures depend on **the human performing rituals** — remember to `/sync`, remember to wikilink, remember to file. That is exactly the maintenance burden that kills every human-maintained wiki (Karpathy: *"most personal knowledge systems die of maintenance, not of bad ideas"*). Capture should be append-only; a **plan and a wiki must be subtractive and self-maintaining**, and that maintenance must be done by the model as a side-effect of normal conversation — not by the human running commands.

---

## 2. Goals / Non-goals

**Goals**
- Knowledge base that **compounds**: sources are compiled once into a structured, interlinked wiki the model maintains.
- Capture works for **any source type** — articles, links, PDFs, images, transcripts — landing as immutable artifacts.
- Agenda that is **subtractive**: a hard ceiling on active load, automatic decay, forced triage.
- **No required rituals**: sync/close happen ambiently; the assistant initiates the only deliberate touchpoint (weekly review).

**Non-goals (this iteration)**
- No embedding/RAG search engine (Rule IV/IX). `grep` stays. Revisit only when the vault outgrows the index.
- No elaborate frontmatter schema or 20-rule config (Rule IX — start small).
- No background daemon / cron automation (fragile against iCloud multi-device sync).
- No rebuild of the vault from scratch; existing 43 notes are reconciled, not discarded.

---

## 3. Design principles

1. **Interaction-driven self-maintenance.** The system updates as a side-effect of you talking to the assistant. You curate sources and ask questions; the model files, links, summarizes, reconciles, and sweeps. (Fixes the ritual-abandonment root cause for *both* KB and agenda.)
2. **Compile, don't retrieve** (Karpathy Rule IV). Sources are compiled once into the wiki; answers are synthesized from the built artifact, not re-derived from raw chunks each query. Analogy: `Sources/` = source code, model = compiler, `Knowledge/` = executable, queries = runtime.
3. **The human owns judgment and the raw record; the model owns the bookkeeping** (Rule II/III). If you find yourself doing bookkeeping, the schema is underspecified — fix the schema, not the symptom.

---

## 4. Architecture — vault layout (after)

```
Oek Vault/
├── Sources/                  # NEW — raw, immutable (Karpathy raw/). Articles, transcripts, PDFs, pasted text
│   └── assets/               # NEW — binaries: PDFs, images, screenshots (Obsidian attachment path points here)
├── Knowledge/                # the wiki — model-owned
│   ├── index.md              # NEW — catalog: every page, one-line summary, grouped by category
│   ├── log.md                # NEW — KB timeline: "## [YYYY-MM-DD] ingest | <title>"
│   └── <pages>.md            # four page types (§5)
├── Inbox.md                  # capture: task bullets + source-drops
├── Agenda.md                 # the plan (restructured, §8)
├── Logs/                     # daily activity; swept Done items land here
├── Resources/                # templates / meta (existing, renamed from 6.Resources references)
├── Archive/                  # inactive notes (existing)
└── .pi/memory.md             # persistent context + "last swept" / "last review" stamps
```

**Three layers, three owners** (Rule II):
- `Sources/` — yours, immutable.
- `Knowledge/` — the model's, generated.
- `SKILL.md` — the schema; belongs to both. **Single source of truth for the schema** (no in-vault duplicate).

---

## 5. Wiki page types

Extend the existing `Type:` frontmatter; keep frontmatter minimal (Rule IX).

| Type | Purpose |
|---|---|
| `#type/source` | One summary per ingested source. Links back to the raw file in `Sources/` and out to every entity/concept it touched. |
| `#type/entity` | A person, company, product, or tool (e.g. Arrive, Gemini Enterprise, Decksmith, Apigee). |
| `#type/concept` | An idea or topic (e.g. RAG, evals, prompt injection, VPC-SC). Keeps the existing **"What it is / What it's good for"** convention. |
| `#type/synthesis` | Evolving thesis over a cluster (e.g. "GCP networking", "AI eval strategy"). The hub that links its neighborhood. |

**`index.md`** is content-oriented: every page with a link, a one-line summary, grouped by category. The model reads it first on every query (Rule VII) and updates it on every ingest.

**`log.md`** is chronological and append-only: `## [YYYY-MM-DD] ingest | <title>` (also `query` / `lint` entries). Greppable: `grep "^## \[" log.md | tail -5`.

### Frontmatter

Carry forward existing fields (`Area`, `Type`, `Keyword`, `Created`, `Updated`). Source pages add provenance (§6). Keyword taxonomy and auto-keyword rules from the current SKILL.md are retained.

---

## 6. Source capture

**Principle (Rule I — immutable sources):** a bare URL is a bookmark, not a source. Links rot; you cannot rebuild a wiki from dead bookmarks. Capture **materializes the content** into `Sources/` at ingest time. The URL is metadata; the saved snapshot is the immutable record. Sources are never edited after they land — if a source is wrong, add a correcting source, do not rewrite history.

### Two on-ramps

**A — You drop it (no assistant):**
- Obsidian **Web Clipper** → article as markdown straight into `Sources/`. Best on mobile / mid-read.
- Save a PDF / image / file into `Sources/` (binaries → `Sources/assets/`).
- Paste text → the assistant writes it to a `Sources/` file.

**B — You hand off a link (assistant fetches):**
- Paste a URL in `Inbox.md` or chat → assistant fetches it (`read` reader-mode for articles/PDFs/arXiv; `browser` for paywalled / JS / login pages), saves clean markdown + provenance to `Sources/`, then ingests.

### Per source type

| Source | Capture |
|---|---|
| Web article | `read` URL → markdown, or Web Clipper |
| PDF / paper | `read` extracts text → `Sources/`; original PDF → `Sources/assets/` |
| YouTube / podcast | assistant pulls transcript → `Sources/` |
| Image / screenshot / diagram | binary → `Sources/assets/`; companion `#type/source` note holds extracted text; assistant **views** the image during ingest for added context |
| Tweet / X thread | browser or paste → text |
| Plain text / voice memo | paste / transcript → `Sources/` |

### Provenance frontmatter (every source file)

```yaml
Type: #type/source
Title:
URL:
Author:
Published:
Captured: YYYY-MM-DD HH:mm
Via: web-clipper | assistant-fetch | paste
```

### Ingest trigger

Source-drops in `Inbox.md` are separated from tasks during the ambient sweep and parked as **pending ingest** — never auto-ingested in bulk (a batch dump produces a pile, not a wiki; Rules V + IX). Ingest stays deliberate, supervised, one-at-a-time. The assistant offers: *"you dropped 3 links; ingest the Karpathy piece now?"*

### Obsidian setting

Settings → Files & links → **Attachment folder path = `Sources/assets/`**, so Web Clipper image downloads land in the raw layer automatically.

---

## 7. KB operations (the new SKILL.md core)

These replace the current manual "Create a New Note — ask where it belongs" CRUD.

### Ingest (one source at a time — Rule V)
1. Source materialized into `Sources/` with provenance (§6).
2. Assistant reads it and discusses key takeaways with you.
3. Writes its `#type/source` summary page in `Knowledge/`.
4. **Updates 10–15 neighbor pages** — the model traces the new fact's implications across the graph, updating relevant entity / concept / synthesis pages.
5. Adds wikilinks **both directions** (Rule VI). An entity that appears in five pages but links to none is a sign of a lazy ingest.
6. Updates `index.md`; appends to `log.md`.
7. Flags contradictions with existing claims (a contradiction is information, not an error to paper over).

### Query
1. Assistant reads `index.md`, follows the few relevant pages, synthesizes (Rule VII) — does not load the whole vault.
2. Answers with citations to wiki pages / sources.
3. **Files good answers back** as a new page (+ index + log). Explorations compound instead of vanishing into chat.

### Lint (periodic / on request — Rule VIII)
Health-check the wiki like code:
- Orphans (no inbound links).
- Broken links.
- Contradictions between pages.
- Low-confidence claims.
- Entities that drifted into two spellings.
- Concepts mentioned but lacking their own page.
- Data gaps worth a new source/question.

Reports findings, proposes fixes, applies on approval.

### Founding lint (one-time migration)
First lint pass over the existing 43 notes + 5 loose root notes:
- Assign each a page type.
- Eliminate the 21 orphans by adding inbound links / merging.
- Fix the 16 broken links.
- File the 5 root notes into `Knowledge/` (wiki pages) or `Sources/` (raw material) as appropriate.
- Produce the initial `index.md` and seed `log.md`.

---

## 8. Agenda redesign (subtractive)

### Structure
```
## ⭐ Today (max 5)
## 🟡 Waiting / Blocked
## 📋 Backlog
```
The accumulating "🟢 Done This Week" section is removed.

### Mechanisms
- **WIP cap:** Today ≤ 5. The assistant will not add a 6th item without you finishing or demoting one — it asks. This ceiling is the primary lever against "fills faster than I check off."
- **Decay:** the assistant stamps items `(added MM-DD)` on promotion to Today/Backlog. A Today item stuck > 3 days auto-demotes to Backlog with a nudge. A Backlog item idle > 30 days is flagged for triage.
- **Forced triage:** every stale item surfaced is forced to a verb — **do / delegate / defer / drop / → note**. "→ note" routes the item into `Sources/` (much "task" debt is actually reference material).
- **Done sweep:** completed items move into that day's `Logs/` file, not an in-vault accumulating section.

### Capture vs plan
`Inbox.md` stays append-only (correct for capture). The sweep classifies each Inbox bullet: **task** → Agenda; **reference / link** → pending-ingest (§6); neither-actionable note → `Sources/` or `Knowledge/`.

---

## 9. Rituals → ambient

- **No commands required.** At the start of *any* vault conversation, the assistant checks the `.pi/memory.md` "last swept" stamp; if stale, it auto-files Inbox → Agenda, rolls over / decays Today, sweeps Done into `Logs/`, and updates the stamp. This is `/sync-day` + `/close-day` happening invisibly.
- **Weekly review** is the only deliberate touchpoint, and the **assistant initiates it** when ≥ 7 days since the last review (`.pi/memory.md` "last review" stamp): forced triage of Waiting + aging Backlog, set the week's intent. This subsumes `/start-day`.
- **No command files.** The four pi prompts (`start-day`, `sync-day`, `close-day`, `groom`) are **deleted, not migrated**. Their behavior is fully absorbed: the sweep is ambient (above); task dedup/triage (old `groom`) and the daily orient (old `start-day`) fold into the weekly review; any pass can also be invoked in plain language ("sweep my inbox", "tidy the agenda") since the assistant knows the operations from this skill. Slash commands are a pre-agentic dispatch affordance the skill no longer needs.
- **Scheduled automation is out of scope** (Rule IX). The sweep fires on engagement, not on a timer. Unattended headless runs (launchd/cron) would write to the vault without supervision, risk iCloud sync races, and burn model calls on quiet days. Revisit only if the ambient model proves insufficient.

---

## 10. Migration plan (high level — detailed in implementation plan)

0. **Relocate the skill from pi → omp** (§13): move the skill dir and this spec into `~/.agents/skills/obsidian-vault-assistant/`, and **delete** the four pi prompt files (their behavior lives in the rewritten SKILL.md). omp cannot load the skill until it lives under `~/.agents/skills/`.
1. Create `Sources/` + `Sources/assets/`; set Obsidian attachment path.
2. Create `Knowledge/index.md` + `Knowledge/log.md`.
3. Run the **founding lint** (§7) over the 43 + 5 root notes.
4. Restructure `Agenda.md` to the new sections; sweep the 107 Done items into `Logs/` history; stamp current Today/Backlog items.
5. Rewrite `SKILL.md`: replace manual CRUD with the Sources/Ingest/Query/Lint model, the agenda mechanics, and the ambient-sweep + weekly-review behavior. Fix the `6.Resources/` / `7.Archive/` drift.

---

## 11. Risks & open questions

- **Ambient sweep aggressiveness.** Auto-demotion/decay could move something you still wanted in Today. Mitigation: decay *flags and nudges* before demoting; never deletes; all moves are reversible and logged.
- **Assistant-fetch coverage.** Some links (X, paywalls, login walls) resist `read`; fall back to `browser` or a manual Web Clipper drop. Honest expectation: most articles/PDFs fetch clean; a minority need the manual on-ramp.
- **Decay stamp clutter.** Inline `(added MM-DD)` is visible in Obsidian; acceptable trade for cross-session robustness vs. tracking ages only in memory.
- **iCloud sync races.** Editing the vault from assistant + Obsidian simultaneously can conflict. Mitigation: assistant edits are additive and quick; avoid long-held writes.
- **Spec/plan home.** Neither `~/.pi` nor `~/.omp`/`~/.agents` is a git repo, so these artifacts live beside the skill at `~/.agents/skills/obsidian-vault-assistant/specs/` (post-migration) rather than a git-anchored `docs/superpowers/specs/`.

---

## 12. Acceptance criteria

- `Sources/` exists and holds at least one materialized source with provenance frontmatter.
- `Knowledge/index.md` and `Knowledge/log.md` exist and are populated by the founding lint.
- After founding lint: **0 orphans, 0 broken links** across `Knowledge/`; every note has a type. (Orphan = no inbound wikilink from another *content* page; `index.md`'s catalog links do **not** count as inbound edges, else the metric is trivially met.)
- A live **ingest** of one new source touches its summary page + ≥ 3 neighbor pages, updates index + log, and adds bidirectional links.
- `Agenda.md` has the new 3-section structure; Today never exceeds 5; "Done This Week" pile is cleared into `Logs/`.
- A new vault conversation performs the ambient sweep with **no slash command run**.
- `SKILL.md` reflects the new model with no references to retired folders (`6.Resources/`, `7.Archive/`).

---

## 13. Deployment home & pi → omp migration

The assistant now runs in **omp**, not pi. omp discovers user skills from `~/.agents/skills/` (the `agents` provider) and does **not** read pi's `~/.pi/agent/skills/` — which is exactly why this skill was never loaded by omp. Migration relocates every piece into omp's native directories.

| Piece | From (pi) | To (omp) |
|---|---|---|
| Skill | `~/.pi/agent/skills/obsidian-vault-assistant/` | `~/.agents/skills/obsidian-vault-assistant/` |
| Slash-command prompts | `~/.pi/agent/prompts/{start-day,sync-day,close-day,groom}.md` | **Deleted** — behavior absorbed into SKILL.md (see §9) |
| This spec | `~/.pi/agent/skills/obsidian-vault-assistant/specs/` | `~/.agents/skills/obsidian-vault-assistant/specs/` |

**Decisions:**
- **Move, not copy** — pi originals are removed after relocation. Deleting the live `SKILL.md` you authored needs your explicit OK.
- **No command files** — the four pi prompts are deleted, not migrated; `~/.agents/commands/` is not created. All behaviors run ambiently, fold into the weekly review, or are invoked in natural language (§9).
- **Vault `.pi/memory.md`** — kept as-is by default; it is a vault-internal folder, not part of the pi install. Optional cosmetic rename to `.omp/memory.md` for full consistency — flagged, not done unless you ask.

**Verification:** after the move, `skill://obsidian-vault-assistant` resolves and the skill appears in omp's discovered-skills list. No slash commands are created or expected.

---

## 14. Amendment (2026-06-27): clean-slate KB

**Decision (during execution):** Olle judged the 43 legacy notes to be of no particular value. Rather than carry the reconciled legacy graph forward, we took a **clean slate** — directly aligned with Rule IX (*"a small wiki you actually feed beats a beautiful architecture you abandon"*).

What changed vs §7/§12:
- All 55 reconciled notes were moved to `Archive/legacy-knowledge-2026-06-27/` (reversible; nothing deleted; tar backups in `/tmp`).
- `Knowledge/` reset to `index.md` (empty Synthesis/Concepts/Entities/Sources headings) + `log.md`. The wiki now grows only via real ingests.
- The founding lint's **durable output stands**: `tools/lint.py`, the 4 canonical page types, the index/log structure, and the proven green-graph workflow — all retained.
- The §12 "founding lint → 0 orphans over 43 notes" criterion is superseded by: lint exits 0 on the live wiki, demonstrated by the first real ingest (Karpathy "LLM Wiki" gist → 1 source page + 4 linked cluster pages, 0 orphans/broken/untyped).

---

## 15. Addition (2026-06-27): handoff / scoped execution

**Problem:** the agenda session conflated control (deciding what's next) with execution (doing it) in one linear context — inefficient, context-polluting, non-parallel. Fix: split the **control plane** (agenda/coordinator) from the **data plane** (scoped execution), joined by one artifact — a **scoped brief**.

**In-flight state (decision):** a handed-off task is a kind of `🟡 Waiting / Blocked` (awaiting external completion). It moves Today → Waiting with a `🚧 handed off (MM-DD)` suffix, which **frees the Today slot**. No new lane — reuses existing semantics; the weekly review already triages Waiting.

**The brief** (contract, written to `Logs/handoffs/YYYY-MM-DD-<slug>.md`): task · goal · acceptance · files/locations · source-of-truth (Jira/PR) · agenda back-reference · clears-when. Same artifact whether it feeds a subagent or a new session.

**Dispatch modes:** (a) `task` subagent — autonomous/parallel, reports back; (b) fresh `omp` session in the task's repo, seeded by the brief — deep/interactive/cross-project; (c) `/handoff [focus]` then `/resume` — same cwd, go deep then return.

**Completion:** subagent → reports back → mark item done. Scoped session → updates reality (Jira/PR/code) → Olle checks it off. Next sweep files it to `Logs/`.

**Automation model (honest):**
- *Fully automatic:* skill is ambient (never manually invoked); brief generation; `task`-subagent dispatch → report → agenda update.
- *Proactive but probabilistic:* the assistant raises the handoff itself when a multi-step task surfaces — a strong soft default from SKILL.md, not a hard gate. Mitigated by crisp triggers (repo edits / ≥ 3 tool steps / another project) and a sweep backstop that flags candidates.
- *Inherently manual (by design):* launching a separate interactive `omp` session in another repo (you choose when to context-switch); closing the loop on a scoped session (your checkbox — the coordinator can't observe another process).
- *Escalation path if the soft default slips:* an omp **hook** intercepting heavy tool use in vault sessions — deliberately out of scope for v1 (Rule IX).

**Implemented in `SKILL.md`:** §4 Operations → "Handoff (scope, don't execute inline)"; agenda mechanics `Handed off` bullet; ambient-sweep candidate flag; weekly-review `🚧`-chase (>5 days); natural-language trigger row. `Logs/handoffs/` created lazily on first handoff.

---

## 16. Amendment (2026-06-29): stamps as hidden Obsidian comments

**Problem:** the visible `(added MM-DD)` decay stamp added noise to every agenda line in Live Preview / Reading mode.

**Fix:** stamps move into Obsidian inline comments — `%%added MM-DD%%` (decay) and `🚧 handed off %%MM-DD%%`. Obsidian hides `%%…%%` in Live Preview / Reading mode, but it persists in the raw markdown, so the ambient sweep still parses item age. Function preserved, zero visual noise, no plugin dependency. Applied to `SKILL.md` (§4 Handoff, §5 mechanics) and retro-applied to the 91 existing `Agenda.md` stamps.

**Live Preview caveat:** Obsidian only fully hides `%%…%%` in Reading mode; in Live Preview it dims them grey. To hide them there too, the vault ships a CSS snippet `.obsidian/snippets/hide-decay-stamps.css` (`.markdown-source-view.mod-cm6 .cm-comment { display:none }`), enabled in `appearance.json`. Tags (`#added/MM-DD`) were rejected: they render as colored pills (noisier) and pollute the tag pane/graph.
