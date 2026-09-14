#!/usr/bin/env python3
"""Lint the OEK Vault: link graph, task-system integrity, structure drift.

Indexes the whole vault (dot-folders excluded), so wikilinks resolve against
root files, Wiki/Sources pages, .base files, and assets. Archive, Logs, and
docs are indexed as link targets, but their own broken links are informational
only: they are frozen traces, not live content.

Exits 1 on hard issues only: broken links in live areas, task-frontmatter
violations, and structure drift. Informational findings never fail the run.

Usage: python3 lint.py "/path/to/Oek Vault"
"""
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from difflib import SequenceMatcher

VAULT = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("OEK_VAULT", "")
if not VAULT or not os.path.isdir(VAULT):
    sys.exit('usage: lint.py "<vault-path>"  (or set OEK_VAULT)')

# Closures created before this date predate the required review_after rule:
# a blank date on them is history, on later notes it is a rule violation.
REVIEW_AFTER_SINCE = "2026-08-19"

EXPECTED_ROOT = {
    "Inbox.md", "Task Dashboard.base", "Task System Runbook.md",
    "Vault Workflow (START HERE).md", "AGENTS.md", "Reading Queue.md",
    "Meeting Transcription Runbook.md",
}
EXPECTED_TOP = {"Tasks", "Wiki", "Logs", "Archive", "docs", "pi", "Topics"}
HIST_AREAS = {"Archive", "Logs", "docs"}

STATUS = {"refine", "backlog", "this-week", "done", "dropped"}
OPEN = {"refine", "backlog", "this-week"}

LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
TYPE_RE = re.compile(r"#type/\w[\w-]*")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ILLEGAL_RE = re.compile(r'[:*?"<>|#^\[\]\\]')
FM_LINE_RE = re.compile(r"^([A-Za-z_][\w-]*):\s*(.*)$")


def area(rel):
    return rel.split("/")[0] if "/" in rel else "(root)"


def stem(rel):
    return os.path.basename(rel).rsplit(".", 1)[0]


def read_note(path):
    text = open(path, encoding="utf-8", errors="ignore").read()
    fm, body = {}, text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            body = text[end + 4:]
            for line in text[3:end].splitlines():
                m = FM_LINE_RE.match(line)
                if m:
                    fm[m.group(1)] = m.group(2).strip()
    return text, fm, body


def fmval(raw):
    return raw.strip().strip('"').strip("'") if raw else ""


# ---- index ----
files = {}
for root, dirs, names in os.walk(VAULT):
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for n in names:
        if n.startswith("."):
            continue
        rel = os.path.relpath(os.path.join(root, n), VAULT)
        files[rel] = os.path.join(root, n)

md = {r: p for r, p in files.items() if r.endswith(".md")}
by_stem = defaultdict(list)
for r in md:
    by_stem[stem(r)].append(r)
for r in files:
    if r.endswith(".base"):
        by_stem[stem(r)].append(r)


def resolve(target):
    t = target.strip()
    if t in by_stem:
        return by_stem[t]
    if t + ".md" in md:
        return [t + ".md"]
    hits = [r for r in files if r == t or r.endswith("/" + t)]
    return hits or None


# ---- link graph ----
targets_of = {}
edges_in = defaultdict(set)
live_broken = defaultdict(list)
hist_broken = defaultdict(list)
for r in sorted(md):
    text, _, _ = read_note(md[r])
    ts = set()
    for raw in LINK_RE.findall(text):
        t = raw.split("|")[0].split("#")[0].strip()
        if not t or t.startswith("<"):
            continue
        ts.add(t)
    targets_of[r] = ts
    for t in ts:
        res = resolve(t)
        if res is None:
            if area(r) in HIST_AREAS:
                hist_broken[r].append(t)
            else:
                live_broken[r].append(t)
        else:
            for hit in res:
                if hit.endswith(".md") and hit != r:
                    edges_in[hit].add(r)

hard, info = [], []


def show(title, items, cap=20):
    print(f"\n{title}: {len(items)}")
    for it in items[:cap]:
        print(f"  - {it}")
    if len(items) > cap:
        print(f"  ... +{len(items) - cap} more")


# ---- task-system integrity ----
today = date.today().isoformat()
status_counts = Counter()
young_never, stale_never = [], []
pre_rule_closed = 0
blocked_notes = []
for r in sorted(x for x in md if area(x) == "Tasks"):
    text, fm, _ = read_note(md[r])
    name = stem(r)
    ty = fmval(fm.get("type"))
    st = fmval(fm.get("status"))
    status_counts[st or "none"] += 1
    if ty != "Task":
        info.append(f"non-Task type in Tasks/: {name} (type={ty or 'none'})")
        continue
    comp = fmval(fm.get("completed"))
    created = fmval(fm.get("created"))
    ra = fmval(fm.get("review_after"))
    lr = fmval(fm.get("last_reviewed"))
    closed = fmval(fm.get("closed"))
    if st not in STATUS:
        hard.append(f"{name}: status '{st or 'none'}' not in vocabulary")
    if comp not in ("true", "false"):
        hard.append(f"{name}: completed '{comp or 'none'}' not boolean")
    if (comp == "true") != (st == "done"):
        hard.append(f"{name}: done/tick invariant (status={st}, completed={comp})")
    if not DATE_RE.match(created):
        hard.append(f"{name}: created '{created or 'none'}' not a date")
    if st in OPEN:
        if not DATE_RE.match(ra):
            hard.append(f"{name}: open without a valid review_after")
        if not lr:
            try:
                age = (date.today() - date.fromisoformat(created)).days
            except ValueError:
                age = 9999
            (young_never if age <= 14 else stale_never).append(name)
    else:
        if ra == "" and created >= REVIEW_AFTER_SINCE:
            hard.append(f"{name}: closed with review_after blanked (created {created})")
        elif ra == "":
            pre_rule_closed += 1
    if closed:
        if st not in ("done", "dropped"):
            hard.append(f"{name}: closed date set but status is {st}")
        elif not DATE_RE.match(closed):
            hard.append(f"{name}: closed '{closed}' not a date")
    if fmval(fm.get("size")) not in ("small", "bigger"):
        info.append(f"{name}: size '{fmval(fm.get('size')) or 'none'}' outside small|bigger")
    title = fmval(fm.get("title"))
    norm = ILLEGAL_RE.sub("", title.replace("/", "-"))
    if title and norm != name:
        info.append(f"{name}: title diverges from filename ({title!r})")
    if not title:
        info.append(f"{name}: empty title")
    if fmval(fm.get("blocked")):
        blocked_notes.append(f"{name} -> {fmval(fm.get('blocked'))[:70]}")
    if text.startswith("---"):
        end = text.find("\n---", 3)
        for line in text[3:end].splitlines():
            m = FM_LINE_RE.match(line)
            if m and m.group(2) and m.group(2)[0] not in "\"'[{":
                if ": " in m.group(2) or "[[" in m.group(2):
                    info.append(f"{name}: YAML-unsafe value: {line[:70]}")

# ---- structure ----
root_entries = {r for r in files if "/" not in r}
for s in sorted(root_entries - EXPECTED_ROOT):
    hard.append(f"unexpected root entry: {s}")
top_dirs = {area(r) for r in files if "/" in r}
for d in sorted(top_dirs - EXPECTED_TOP):
    hard.append(f"unexpected top-level folder: {d}/")
for r in sorted(x for x in md if stem(x).startswith("Untitled") and area(x) != "Archive"):
    hard.append(f"Untitled stray: {r}")
for r in sorted(x for x in md if os.path.getsize(md[x]) == 0):
    hard.append(f"empty file: {r}")
for r in sorted(x for x in files if x.startswith("Tasks/") and "/" in x[6:]):
    hard.append(f"non-note file inside Tasks/: {r}")
for s, paths in sorted(by_stem.items()):
    if len(paths) > 1 and not any(area(p) == "Archive" for p in paths):
        hard.append(f"ambiguous link target '{s}': {paths}")
    elif len(paths) > 1:
        info.append(f"archive-duplicate basename '{s}' x{len(paths)}")

# ---- wiki layer ----
content = {r for r in md
           if r.startswith("Wiki/") and "/" not in r[5:]
           and stem(r) not in ("index", "log")}
inbound_content = Counter()
untyped = []
taxonomy_gaps = []
for r in content:
    text, fm, _ = read_note(md[r])
    if not TYPE_RE.search(text):
        untyped.append(stem(r))
    missing = [k for k in ("Area", "Type", "Keyword")
               if k not in fm and f"#{k.lower()}/" not in text[:600]]
    if missing:
        taxonomy_gaps.append(f"{stem(r)}: missing {missing}")
    for t in targets_of.get(r, ()):
        for hit in resolve(t) or []:
            if hit in content and hit != r:
                inbound_content[hit] += 1
content_orphans = sorted(stem(r) for r in content if inbound_content[r] == 0)
vault_orphans = sorted(r for r in content if not edges_in[r])
wiki_hist_orphans = Counter(area(r) for r in md
                            if not edges_in[r] and area(r) in HIST_AREAS)
sources_orphans = sum(1 for r in md
                      if r.startswith("Wiki/Sources/") and not edges_in[r])
names = sorted(stem(r) for r in content)
dupes = [(a, b) for i, a in enumerate(names) for b in names[i + 1:]
         if SequenceMatcher(None, a.lower(), b.lower()).ratio() > 0.82]

# ---- report ----
open_count = sum(status_counts[s] for s in OPEN)
due = 0
stale7 = 0
week_ago = (date.today() - timedelta(days=7)).isoformat()
for r in md:
    if area(r) != "Tasks":
        continue
    _, fm, _ = read_note(md[r])
    if fmval(fm.get("status")) in OPEN:
        ra = fmval(fm.get("review_after"))
        if DATE_RE.match(ra):
            if ra <= today:
                due += 1
            if ra <= week_ago:
                stale7 += 1

print("== VAULT SUMMARY ==")
print(f"files indexed: {len(files)} ({len(md)} notes)")
print(f"tasks by status: {dict(status_counts)}")
print(f"open: {open_count}, due today: {due}, more than 7 days past: {stale7}")

print("\n== HARD ISSUES ==")
hard_all = list(hard)
for src in sorted(live_broken):
    for t in sorted(live_broken[src]):
        hard_all.append(f"{src} -> [[{t}]]")
show("HARD", hard_all)

print("\n== TASK INTEGRITY (info) ==")
info_task = [i for i in info if not i.startswith(("unexpected", "Untitled", "empty file", "non-note"))]
show("never reviewed, open, young (<=14d)", young_never)
show("never reviewed, open, stale", stale_never)
show("blocked flags (review for staleness)", blocked_notes)
show("other", [i for i in info_task if not any(i.startswith(p) for p in
              ("never reviewed",))][:20])
print(f"closed without review_after, created before {REVIEW_AFTER_SINCE} (history): {pre_rule_closed}")

print("\n== WIKI LAYER ==")
print(f"content pages: {len(content)}")
show("ORPHANS by content-page metric (Karpathy rule)", content_orphans)
show("ORPHANS vault-wide (0 inbound from anywhere)", vault_orphans)
show("UNTYPED (no #type/)", untyped)
show("TAXONOMY GAPS (curated pages)", taxonomy_gaps)
show("NEAR-DUPLICATE TITLES", [f"{a}  ~  {b}" for a, b in dupes])
print(f"info: sources pages with no inbound: {sources_orphans}; "
      f"historical-area orphans by folder: {dict(wiki_hist_orphans)}")

print("\n== BROKEN LINKS, HISTORICAL AREAS (informational) ==")
hist_list = [f"{src} -> [[{t}]]" for src in sorted(hist_broken)
             for t in sorted(hist_broken[src])]
print(f"total: {len(hist_list)}")

print(f"\nHARD ISSUES: {len(hard_all)}")
sys.exit(1 if hard_all else 0)
