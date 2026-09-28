# Task Note Mechanics — Schema v2

Read this before creating or editing a note in `Tasks/`.

## Filename and title

The filename is the readable task title. Use `Prefix — Action phrase`, preserve the exact phrase in `title`, and replace filename-illegal characters. Common prefixes are `Arrive`, `Builder Platform`, `Tenderdesk`, `imeto`, `Decksmith`, `Fidelio`, `Research`, and `Personal`. The prefix decides `area`, and a known area decides `axis` (see Life axes).

## Frontmatter

```yaml
type: Task
schema_version: 2
id: "<UUID>"
title: <short title>
status: available | committed | done | dropped
created: YYYY-MM-DD        # may be blank on migrated history
area:                      # title prefix when it is a known area; set by Oek
axis: professional | personal   # blank until assigned
committed_at:              # required while committed
commitment_cycle:          # required while committed: YYYY-Www (Professional) or YYYY-MM (Personal)
commitment_until:          # optional
closed:                    # required for done/dropped
blocked:
repo:
links:
context:
outcome:
next_action:
acceptance:
```

Minimal capture is valid. `size`, `outcome`, and `next_action` are optional enrichment, not creation gates. `completed` and `review_after` are invalid legacy fields.

After cutover, create tasks only through the constrained CLI:

```bash
oek-task create-available --vault "$OEK_VAULT" --text "One sentence"
```

## Life axes

Oek sets `area` and a mapped `axis` when it creates or renames a task. `Arrive`, `Builder Platform`, `imeto`, `Decksmith`, `Tenderdesk` and `Fidelio` map to `professional`, and `Personal` maps to `personal`. The mapping lives in `axes.area_map` in the Oek config. `Research` and unprefixed tasks stay blank until Olle clicks the Axis chip in Oek. Jev may suggest an axis from the title, but the assistant never sets or changes `axis` by hand.

A commitment's cycle kind must match its axis: an ISO week such as `2026-W40` for Professional, and a calendar month such as `2026-10` for Personal. A mismatch is Revision required, which Olle settles in that axis's revision. The linter rejects any other cycle format and any other axis value.

## Status authority

| Status | Meaning | Who may move it there |
|---|---|---|
| `available` | captured and eligible, not committed | assistant may create via constrained CLI |
| `committed` | explicit current commitment | Olle only, in Oek |
| `done` | complete | Olle only, in Oek |
| `dropped` | intentionally abandoned | Olle only, in Oek; assistant may suggest |

The assistant may add context and clarify a task. It may not commit, release, close, or drop. Explore is non-committing. A worker result is evidence to review, never an implicit close.

Migrated tasks that lack trustworthy historical commitment or closure dates carry `revision_required: true`. The linter reports these as informational until Olle reviews them; dates are never invented. `blocked` is context, not a status.

Keep one parseable frontmatter block. Double-quote values containing `: `, a leading `#`/`[`/`{`, or wikilinks.
