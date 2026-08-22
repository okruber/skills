#!/usr/bin/env python3
"""Lint the OEK Vault wiki (Karpathy LLM-Wiki rules VI/VIII).

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

KN = os.path.join(VAULT, "Wiki")
TASKS = os.path.join(VAULT, "Tasks")
SPECIAL = {"index", "log"}
LINK_RE = re.compile(r"\[\[([^\]|#]+)")
TYPE_RE = re.compile(r"#type/\w[\w-]*")

notes = {}
for f in sorted(glob.glob(os.path.join(KN, "*.md"))):
    name = os.path.splitext(os.path.basename(f))[0]
    if name.lower() not in SPECIAL:
        notes[name] = f

# Tasks/ notes are valid wikilink targets but not Wiki content pages: they are
# excluded from orphan/untyped/dupe analysis, only used to resolve broken links.
task_notes = {}
for f in sorted(glob.glob(os.path.join(TASKS, "*.md"))):
    name = os.path.splitext(os.path.basename(f))[0]
    task_notes[name] = f

link_targets = set(notes) | set(task_notes)

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
        elif l not in link_targets:
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

print(f"Wiki notes (excl. index/log): {len(notes)}")
print(f"Total outbound wikilinks: {sum(len(v) for v in outbound.values())}")
show("ORPHANS (0 inbound from content pages)", orphans)
show("BROKEN LINKS", [f"{n} -> [[{l}]]" for n, l in broken])
show("UNTYPED (no #type/)", untyped)
show("ISOLATED (0 in + 0 out)", isolated)
show("NEAR-DUPLICATE TITLES (review for two-spelling entities)", [f"{a}  ~  {b}" for a, b in dupes])

hard = len(orphans) + len(broken) + len(untyped)
print(f"\nHARD ISSUES (orphans+broken+untyped): {hard}")
sys.exit(1 if hard else 0)
