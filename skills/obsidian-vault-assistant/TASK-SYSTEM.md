# Task Note Mechanics — Schema v2

Read this before creating or editing a note in `Tasks/`.

## Filename and title

The filename is the readable task title. Use `Prefix — Action phrase`, preserve the exact phrase in `title`, and replace filename-illegal characters. Common prefixes are `Arrive`, `Builder Platform`, `Tenderdesk`, `imeto`, `Decksmith`, `Research`, and `Personal`.

## Frontmatter

```yaml
type: Task
schema_version: 2
id: "<UUID>"
title: <short title>
status: available | committed | done | dropped
created: YYYY-MM-DD        # may be blank on migrated history
committed_at:              # required while committed
commitment_cycle:          # required while committed
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
