# Obsidian LLM-Wiki + Subtractive Agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended here — many tasks need judgment + a user checkpoint) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the `obsidian-vault-assistant` skill from pi to omp, and rebuild the OEK Vault's knowledge base as a self-maintaining LLM wiki (Karpathy's 9 rules) with a subtractive agenda.

**Architecture:** Three layers — `Sources/` (raw, immutable), `Knowledge/` (model-owned wiki: source/entity/concept/synthesis pages + `index.md` + `log.md`), and the rewritten `SKILL.md` (schema). Operations: Ingest / Query / Lint. The agenda becomes Today≤5 + decay + forced triage, swept ambiently with no slash commands.

**Tech Stack:** Markdown, Obsidian, Python 3 (lint/analysis scripts via the `eval`/`bash` tools), the omp `agents` skill provider (`~/.agents/skills/`).

**Spec:** `~/.agents/skills/obsidian-vault-assistant/specs/2026-06-27-obsidian-llm-wiki-knowledge-base-design.md`

**No version control:** Neither `~/.agents` nor the iCloud vault is a git repo, so there are no `git commit` steps. Destructive phases are guarded by timestamped `tar` snapshots instead. (Git-init for the vault is a recommended future enhancement — Karpathy's tip — but is out of scope here.)

**Conventions used throughout:**
- Vault path (contains spaces — always quote): `/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault`
- Skill path (omp): `/Users/ollekruber/.agents/skills/obsidian-vault-assistant`
- "Approved decisions": move = delete pi originals; keep vault `.pi/memory.md` name; Today cap 5; decay Today>3d→Backlog, Backlog idle>30d→flag; weekly review 7d.

---

## File Structure

**Skill (omp):**
- Modify/Move: `~/.agents/skills/obsidian-vault-assistant/SKILL.md` — rewritten around Sources/Ingest/Query/Lint + agenda mechanics + ambient sweep.
- Create: `~/.agents/skills/obsidian-vault-assistant/tools/lint.py` — reusable wiki health-check (Rule VIII).
- Exists: `~/.agents/skills/obsidian-vault-assistant/specs/2026-06-27-...-design.md`, `plans/2026-06-27-...-implementation.md`.

**Vault:**
- Create: `Sources/`, `Sources/assets/`, `Knowledge/index.md`, `Knowledge/log.md`.
- Modify: all 43 `Knowledge/*.md` (typed, linked, broken-links fixed); `Agenda.md` (restructured); `.obsidian/app.json` (attachment path); `Logs/` (Done history).
- Move: 5 loose root notes → `Knowledge/` or `Sources/`.

**Deleted (pi):**
- `~/.pi/agent/skills/obsidian-vault-assistant/` (whole dir)
- `~/.pi/agent/prompts/{start-day,sync-day,close-day,groom}.md`

---

## Phase 0 — Relocate skill pi → omp

### Task 0.1: Move the skill into omp and delete pi originals

**Files:**
- Move: `~/.pi/agent/skills/obsidian-vault-assistant/SKILL.md` → `~/.agents/skills/obsidian-vault-assistant/SKILL.md`
- Delete: `~/.pi/agent/skills/obsidian-vault-assistant/`, `~/.pi/agent/prompts/{start-day,sync-day,close-day,groom}.md`

- [ ] **Step 1: Snapshot the pi skill before touching it**

```bash
mkdir -p ~/.agents/skills/obsidian-vault-assistant
tar -czf "/tmp/pi-obsidian-skill-backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C ~/.pi/agent skills/obsidian-vault-assistant prompts && echo "backup ok"
```
Expected: `backup ok`

- [ ] **Step 2: Copy the current SKILL.md into omp (rewrite happens in Phase 4)**

```bash
cp ~/.pi/agent/skills/obsidian-vault-assistant/SKILL.md ~/.agents/skills/obsidian-vault-assistant/SKILL.md && echo copied
```
Expected: `copied` (the `specs/` dir was already moved in the design step).

- [ ] **Step 3: Verify omp will discover it — valid layout + frontmatter**

Run (read tool): `read ~/.agents/skills/obsidian-vault-assistant/SKILL.md:1-12`
Expected: file present; frontmatter has `name:` and `description:` (required by the `agents`/native providers).

- [ ] **Step 4: Delete pi originals (approved clean move)**

```bash
rm -rf ~/.pi/agent/skills/obsidian-vault-assistant
rm -f ~/.pi/agent/prompts/start-day.md ~/.pi/agent/prompts/sync-day.md ~/.pi/agent/prompts/close-day.md ~/.pi/agent/prompts/groom.md
echo "pi originals removed"
```
Expected: `pi originals removed`

- [ ] **Step 5: Confirm removal**

Run (read tool): `read ~/.pi/agent/prompts` and `read ~/.pi/agent/skills`
Expected: the four prompt files gone; `obsidian-vault-assistant` no longer under pi skills. (A new omp session will now discover the skill from `~/.agents/skills/`.)

---

## Phase 1 — Vault scaffolding (raw + wiki infra)

### Task 1.1: Snapshot the vault (safety net for all later mutations)

**Files:** none modified.

- [ ] **Step 1: Tarball the mutable vault content**

```bash
VAULT="/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
tar -czf "/tmp/oek-vault-backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$VAULT" Knowledge Agenda.md Inbox.md Logs "Decksmith 2.0 architecture.md" "Decksmith evals.md" Tender.md Vibe-Platform.md "State of golden.candidate.md" 2>/dev/null && echo "vault backup ok"
```
Expected: `vault backup ok`

### Task 1.2: Create the raw `Sources/` layer

**Files:** Create `Sources/`, `Sources/assets/`.

- [ ] **Step 1: Make the directories with a `.gitkeep`-style marker**

```bash
VAULT="/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
mkdir -p "$VAULT/Sources/assets" && echo created
```
Expected: `created`

- [ ] **Step 2: Verify**

Run (read tool): `read "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"`
Expected: `Sources/` now listed.

### Task 1.3: Point Obsidian's attachment path at the raw layer

**Files:** Modify `.obsidian/app.json`.

- [ ] **Step 1: Read current app config**

Run (read tool): `read "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault/.obsidian/app.json"`
Expected: a JSON object (may or may not contain `attachmentFolderPath`).

- [ ] **Step 2: Set `attachmentFolderPath` to `Sources/assets`**

Use the `eval` tool (Python) to patch the JSON in place, preserving existing keys:

```python
import json, os
p = "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault/.obsidian/app.json"
cfg = json.load(open(p)) if os.path.exists(p) else {}
cfg["attachmentFolderPath"] = "Sources/assets"
json.dump(cfg, open(p, "w"), indent=2)
print("attachmentFolderPath =", cfg["attachmentFolderPath"])
```
Expected: `attachmentFolderPath = Sources/assets`
Note: takes effect on Obsidian's next launch/reload; Web Clipper image downloads then land in `Sources/assets/`.

### Task 1.4: Create `index.md` and `log.md`

**Files:** Create `Knowledge/index.md`, `Knowledge/log.md`. (Populated by the founding lint in Phase 2; created empty-but-structured here.)

- [ ] **Step 1: Write `Knowledge/index.md` skeleton**

Use the `write` tool to create `Knowledge/index.md`:

```markdown
---
Type: #type/index
Updated: 2026-06-27
---
# Knowledge Index

Catalog of every wiki page. The assistant reads this first on every query and updates it on every ingest.

## Synthesis
## Concepts
## Entities
## Sources
```

- [ ] **Step 2: Write `Knowledge/log.md` skeleton**

Use the `write` tool to create `Knowledge/log.md`:

```markdown
---
Type: #type/log
---
# Wiki Log

Append-only timeline. Format: `## [YYYY-MM-DD] <ingest|query|lint> | <title>`. Grep recent: `grep "^## \[" log.md | tail -5`.

## [2026-06-27] lint | founding lint — initial reconciliation (see plan)
```

- [ ] **Step 3: Verify both exist**

Run (read tool): `read` each file; confirm frontmatter + headings present.

---

## Phase 2 — Founding lint (reconcile the 43 + 5 notes)

### Task 2.1: Install the reusable lint tool

**Files:** Create `~/.agents/skills/obsidian-vault-assistant/tools/lint.py`.

- [ ] **Step 1: Write `tools/lint.py`**

Use the `write` tool to create `~/.agents/skills/obsidian-vault-assistant/tools/lint.py`:

```python
#!/usr/bin/env python3
"""Lint the OEK Vault Knowledge wiki (Karpathy LLM-Wiki rules VI/VIII).

Reports orphans, broken links, untyped notes, isolated notes, and near-duplicate
titles. Exits non-zero if any HARD issue (orphan / broken link / untyped) exists.
index.md / log.md are excluded as notes AND never count as inbound edges, so a
page linked only by the catalog still reads as an orphan (the metric stays honest).

Usage: python3 lint.py "/path/to/Oek Vault"
"""
import os, re, sys, glob
from difflib import SequenceMatcher

VAULT = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("OEK_VAULT", "")
if not VAULT or not os.path.isdir(VAULT):
    sys.exit('usage: lint.py "<vault-path>"  (or set OEK_VAULT)')

KN = os.path.join(VAULT, "Knowledge")
SPECIAL = {"index", "log"}
LINK_RE = re.compile(r"\[\[([^\]|#]+)")
TYPE_RE = re.compile(r"#type/\w[\w-]*")

notes = {}
for f in sorted(glob.glob(os.path.join(KN, "*.md"))):
    name = os.path.splitext(os.path.basename(f))[0]
    if name.lower() not in SPECIAL:
        notes[name] = f

outbound = {n: [] for n in notes}
inbound = {n: 0 for n in notes}
typed = {}
broken = []
for n, f in notes.items():
    txt = open(f, encoding="utf-8", errors="ignore").read()
    typed[n] = bool(TYPE_RE.search(txt))
    for raw in LINK_RE.findall(txt):
        l = raw.strip()
        outbound[n].append(l)
        if l in inbound:
            inbound[l] += 1
        elif l not in notes:
            broken.append((n, l))

orphans = [n for n in notes if inbound[n] == 0]
untyped = [n for n in notes if not typed[n]]
isolated = [n for n in notes if inbound[n] == 0 and not outbound[n]]
dupes = []
names = list(notes)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        if SequenceMatcher(None, names[i].lower(), names[j].lower()).ratio() > 0.82:
            dupes.append((names[i], names[j]))

def show(title, items):
    print(f"\n{title}: {len(items)}")
    for it in items:
        print(f"  - {it}")

print(f"Knowledge notes (excl. index/log): {len(notes)}")
print(f"Total outbound wikilinks: {sum(len(v) for v in outbound.values())}")
show("ORPHANS (0 inbound from content pages)", orphans)
show("BROKEN LINKS", [f"{n} -> [[{l}]]" for n, l in broken])
show("UNTYPED (no #type/)", untyped)
show("ISOLATED (0 in + 0 out)", isolated)
show("NEAR-DUPLICATE TITLES (review for two-spelling entities)", [f"{a}  ~  {b}" for a, b in dupes])

hard = len(orphans) + len(broken) + len(untyped)
print(f"\nHARD ISSUES (orphans+broken+untyped): {hard}")
sys.exit(1 if hard else 0)
```

- [ ] **Step 2: Run it to capture the baseline (expected to FAIL hard)**

```bash
python3 ~/.agents/skills/obsidian-vault-assistant/tools/lint.py "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"; echo "exit=$?"
```
Expected: ~21 orphans, ~16 broken links, ~22 untyped, `HARD ISSUES` > 0, `exit=1`. This is the founding-lint worklist.

### Task 2.2: File the 5 loose root notes

**Files:** Move from vault root → `Knowledge/` (wiki page) or `Sources/` (raw material).

- [ ] **Step 1: Read each to classify**

Run (read tool): read `Decksmith 2.0 architecture.md`, `Decksmith evals.md`, `Tender.md`, `Vibe-Platform.md`, `State of golden.candidate.md` (vault root). Decide per note: is it a wiki page (concept/entity/synthesis) or raw source material?

- [ ] **Step 2: Move each to its home**

For wiki pages (most of these — they are your own synthesized notes), move into `Knowledge/`:
```bash
VAULT="/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
mv "$VAULT/Decksmith 2.0 architecture.md" "$VAULT/Knowledge/" && echo moved
```
Repeat per note (route any that are raw captures to `$VAULT/Sources/` instead). `State of golden.candidate.md` and `Tender.md`: judge at execution — likely `Knowledge/` synthesis pages.

- [ ] **Step 3: Verify root is clear of knowledge notes**

Run (read tool): `read "$VAULT"` — only `Inbox.md`, `Agenda.md`, `Vault Workflow (START HERE).md`, `gcp_projects.txt` and the folders should remain at root.

### Task 2.3: Type every note

**Files:** Modify each `Knowledge/*.md` frontmatter to include a `#type/` tag.

- [ ] **Step 1: Assign a type per note**

For each note in the `UNTYPED` list (and any mistyped), add the correct tag to its `Type:` frontmatter line:
- `#type/source` — a summary of an external source.
- `#type/entity` — a person/company/product/tool (e.g. `Apigee`, `Gemini Enterprise`, `Vertex AI`, `Model Armor`, `Google Agentspace`).
- `#type/concept` — an idea/topic (e.g. `RAG ...`, `Prompt Injection`, `The Bitter Lesson`, `Agentic Workflows Spectrum`).
- `#type/synthesis` — an evolving multi-source thesis/hub (e.g. `Cloud Networking on GCP`, `Arrive AI Program`, `Framework - AI Enterprise Application`).

Edit each file's frontmatter with the `edit` tool. Keep existing `Area`/`Keyword`/`Created`; set/refresh `Updated: 2026-06-27`.

- [ ] **Step 2: Re-run lint — UNTYPED should reach 0**

```bash
python3 ~/.agents/skills/obsidian-vault-assistant/tools/lint.py "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault" 2>&1 | grep -A1 UNTYPED
```
Expected: `UNTYPED (no #type/): 0`

### Task 2.4: Fix the broken links

**Files:** Modify the source notes named in the `BROKEN LINKS` report.

- [ ] **Step 1: Resolve each broken `[[target]]`**

For each `note -> [[target]]`: either (a) the target exists under a slightly different name → fix the wikilink to the exact filename; (b) the target should exist → create the page (often a `#type/concept` or `#type/entity` stub with `## What it is` / `## What it's good for`) and link it; (c) the link is spurious → remove it.

- [ ] **Step 2: Re-run lint — BROKEN LINKS should reach 0**

```bash
python3 ~/.agents/skills/obsidian-vault-assistant/tools/lint.py "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault" 2>&1 | grep -A1 "BROKEN LINKS"
```
Expected: `BROKEN LINKS: 0`

### Task 2.5: Eliminate orphans (Rule VI — link everything)

**Files:** Modify orphaned notes and their natural neighbors to add real inbound links.

- [ ] **Step 1: For each orphan, find its cluster and wire it in**

Work the `ORPHANS` list. For each orphan, identify 1-3 related existing pages and add a `[[orphan]]` link from them (in body prose or their `## Links` section), and add outbound `## Links` from the orphan back. Where several orphans share a theme (e.g. GCP networking, evals, agents), create or use a `#type/synthesis` hub page that links the whole cluster — this kills many orphans at once and gives the graph real hubs.

- [ ] **Step 2: Check near-duplicate titles for two-spelling entities**

Review the `NEAR-DUPLICATE TITLES` report; merge any that are the same entity under two names (keep the clearer title, redirect links, archive the loser to `7.Archive`/`Archive`).

- [ ] **Step 3: Re-run lint — expect 0 HARD ISSUES**

```bash
python3 ~/.agents/skills/obsidian-vault-assistant/tools/lint.py "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"; echo "exit=$?"
```
Expected: `ORPHANS: 0`, `BROKEN LINKS: 0`, `UNTYPED: 0`, `HARD ISSUES ...: 0`, `exit=0`.

### Task 2.6: Populate `index.md` and seed `log.md`

**Files:** Modify `Knowledge/index.md`, `Knowledge/log.md`.

- [ ] **Step 1: Generate the catalog**

Use the `eval` tool to emit a categorized, linked list (by `#type/`) with each note's first `## What it is` line (or first body sentence) as the one-line summary, then paste/write it under the right headings in `index.md`:

```python
import os, re, glob
KN = "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault/Knowledge"
buckets = {"synthesis": [], "concept": [], "entity": [], "source": []}
for f in sorted(glob.glob(os.path.join(KN, "*.md"))):
    name = os.path.splitext(os.path.basename(f))[0]
    if name.lower() in {"index", "log"}: continue
    txt = open(f, encoding="utf-8", errors="ignore").read()
    m = re.search(r"#type/(\w[\w-]*)", txt)
    t = m.group(1) if m else "concept"
    wm = re.search(r"## What it is\s*\n+(.+)", txt)
    summ = (wm.group(1).strip() if wm else "").split(". ")[0][:90]
    buckets.setdefault(t, []).append(f"- [[{name}]] — {summ}")
for t in ["synthesis","concept","entity","source"]:
    print(f"\n### {t} ({len(buckets.get(t,[]))})")
    print("\n".join(sorted(buckets.get(t, []))))
```
Write the output into `index.md` under `## Synthesis / ## Concepts / ## Entities / ## Sources`. Set `Updated:`.

- [ ] **Step 2: Append the founding-lint log entry**

Edit `Knowledge/log.md` to record: notes reconciled, orphans/broken fixed, pages created. One line: `## [2026-06-27] lint | founding lint — N notes typed, 21 orphans + 16 broken resolved, index built`.

- [ ] **Step 3: Verify navigability**

Run (read tool): `read Knowledge/index.md` — every note appears under exactly one category with a summary. Spot-check 3 links resolve to real files.

---

## Phase 3 — Agenda restructure (subtractive)

### Task 3.1: Snapshot + read current agenda

**Files:** none modified.

- [ ] **Step 1: Read `Agenda.md` fully**

Run (read tool): `read "$VAULT/Agenda.md"`. Note the 43 Active, 12 Waiting, 13 Backlog, 107 Done items and the current section headers.

### Task 3.2: Sweep the 107 Done into Logs history

**Files:** Modify `Agenda.md` (remove Done section); create/modify `Logs/2026-W-done-archive.md` (or append to a dated log).

- [ ] **Step 1: Extract Done items and write them to a Logs archive**

Use the `eval` tool to pull every `- [x]` under `## 🟢 Done This Week` and write them to `Logs/done-archive-2026-06-27.md` with a heading, then remove that section from `Agenda.md`. (Do not lose the history — this is a move, not a delete.)

- [ ] **Step 2: Verify Done pile is gone from Agenda, preserved in Logs**

Run (read tool): confirm `Agenda.md` has no `## 🟢 Done This Week`; `Logs/done-archive-2026-06-27.md` holds the 107 items.

### Task 3.3: Rebuild Agenda into Today / Waiting / Backlog

**Files:** Modify `Agenda.md`.

- [ ] **Step 1: Write the new section skeleton**

`Agenda.md` body becomes:
```markdown
## ⭐ Today (max 5)
## 🟡 Waiting / Blocked
## 📋 Backlog
```
Keep frontmatter; bump `Updated:`.

- [ ] **Step 2: Triage the 43 Active + 13 Backlog (USER CHECKPOINT)**

Propose a split: ≤5 items for **Today** (ask the user which, or recommend by recency/importance), the rest to **Backlog**; keep the 12 Waiting items in **Waiting / Blocked**. Stamp each promoted item with `(added 06-27)`. Apply only after the user confirms the Today set. This is a forced-triage moment: offer do/delegate/defer/drop/→note on obviously stale items.

- [ ] **Step 3: Verify the cap and structure**

```bash
python3 - "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault/Agenda.md" <<'PY'
import re,sys
ag=open(sys.argv[1],encoding="utf-8").read()
import re
lines=ag.splitlines(); cur=None; c={}
for ln in lines:
    if ln.startswith("## "): cur=ln.strip(); c.setdefault(cur,0)
    elif re.match(r"^\s*-\s*\[ \]",ln) and cur: c[cur]+=1
print(c)
PY
```
Expected: `⭐ Today` count ≤ 5; no Done section; Waiting + Backlog hold the remainder.

---

## Phase 4 — Rewrite SKILL.md

### Task 4.1: Rewrite the skill around the new model

**Files:** Modify `~/.agents/skills/obsidian-vault-assistant/SKILL.md`.

- [ ] **Step 1: Rewrite the body**

Replace the current manual-CRUD SKILL.md with sections covering (keep the YAML frontmatter `name`/`description`, update the description to mention Sources/Ingest/Query/Lint + ambient sweep):
- **Layers & ownership** — `Sources/` (raw, immutable), `Knowledge/` (wiki), this `SKILL.md` (schema). Vault path. `.pi/memory.md` stays (kept by decision).
- **Page types** — source/entity/concept/synthesis; frontmatter fields; `## What it is` / `## What it's good for` for concept/entity; provenance frontmatter for sources.
- **Source capture** — two on-ramps (Web Clipper / drop; assistant-fetch via `read`, `browser` for paywalled/JS); per-type table; materialize-at-ingest (a link is not a source); pending-ingest queue; one-at-a-time.
- **Operations** — Ingest (touch 10-15 neighbors, bidirectional links, update index+log, flag contradictions), Query (read index → drill → cite → file good answers back), Lint (`tools/lint.py` + contradictions/dupes/gaps).
- **Agenda** — Today≤5, decay (>3d→Backlog, >30d flag), forced triage (do/delegate/defer/drop/→note), Done→Logs.
- **Ambient sweep** — on any vault conversation, check `.pi/memory.md` last-swept stamp; if new day: file Inbox→Agenda/pending-ingest, decay Today, sweep Done→Logs, update stamp. No commands.
- **Weekly review** — assistant-initiated at ≥7 days (last-review stamp): triage Waiting + aging Backlog, set week intent.
- **Natural-language triggers** — "sweep my inbox", "tidy the agenda", "ingest this", "lint the wiki".
- Remove all references to retired folders; fix `6.Resources/`→`Resources/`, `7.Archive/`→`Archive/`. Retain the keyword taxonomy + auto-keyword rules.

- [ ] **Step 2: Validate frontmatter + no stale folder refs**

```bash
S=~/.agents/skills/obsidian-vault-assistant/SKILL.md
head -5 "$S"
grep -nE "6\.Resources|7\.Archive|/start-day|/sync-day|/close-day|/groom" "$S" || echo "no stale refs"
```
Expected: frontmatter has `name:`+`description:`; `no stale refs`.

---

## Phase 5 — End-to-end verification

### Task 5.1: Live ingest of one real source

**Files:** Create one `Sources/<slug>.md` + one `Knowledge/<source-summary>.md`; modify ≥3 neighbors + `index.md` + `log.md`.

- [ ] **Step 1: Ingest a test source**

Pick a real link (e.g. the Karpathy gist already read this session). Materialize it to `Sources/2026-06-27-karpathy-llm-wiki.md` with provenance frontmatter; write a `#type/source` summary in `Knowledge/`; update ≥3 neighbor pages (e.g. `NotebookLM`, `RAG ...`, a new `Second Brain / PKM` synthesis page) with bidirectional links; add an `index.md` entry; append `log.md`.

- [ ] **Step 2: Lint stays clean after ingest**

```bash
python3 ~/.agents/skills/obsidian-vault-assistant/tools/lint.py "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"; echo "exit=$?"
```
Expected: `exit=0` (no new orphans/broken/untyped).

### Task 5.2: Acceptance-criteria checklist (from spec §12)

- [ ] **Step 1: Verify each criterion**

Confirm, with a command or read each:
- `Sources/` holds ≥1 materialized source with provenance frontmatter.
- `Knowledge/index.md` + `log.md` exist and are populated.
- `lint.py` → 0 orphans, 0 broken, 0 untyped (`exit=0`).
- The Phase 5.1 ingest touched summary + ≥3 neighbors + index + log, bidirectional links.
- `Agenda.md` has 3 sections; Today ≤ 5; no Done pile (history in `Logs/`).
- `SKILL.md` describes the new model; no retired-folder refs.
- pi originals gone; skill resolves at `~/.agents/skills/obsidian-vault-assistant/`.

- [ ] **Step 2: Note completion in `log.md`**

Append: `## [2026-06-27] lint | migration complete — KB + agenda live on omp`.

---

## Self-Review (author checklist — completed)

- **Spec coverage:** Phase 0 ↔ §13; Phase 1 ↔ §4/§6 (Sources, attachment path, index/log); Phase 2 ↔ §5/§7 founding lint; Phase 3 ↔ §8; Phase 4 ↔ §3-§9 SKILL.md; Phase 5 ↔ §12 acceptance. Source-capture model (§6) lands in SKILL.md (4.1) + exercised (5.1). Ambient sweep / weekly review / no-commands (§9) land in SKILL.md (4.1).
- **Placeholders:** none — scripts and commands are complete; judgment tasks (typing/linking/triage) name exact lists and the lint gate that proves them done.
- **Consistency:** `lint.py` path, vault path, and the orphan definition (index excluded) match the spec's tightened criterion throughout.
- **No-VCS note:** commits replaced by `tar` snapshots before each destructive phase (0.1, 1.1, 3.1).
