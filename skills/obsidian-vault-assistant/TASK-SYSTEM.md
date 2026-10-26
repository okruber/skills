# Task Note Mechanics — Schema v2

Read this before creating or editing a note in `Tasks/`.

## Filename and title

The filename is the readable task title. Use `Prefix — Action phrase` and preserve the exact phrase in `title`. The filename is the title with `/` replaced by `-` and the characters `: * ? " < > | # ^ [ ] \` removed. `oek-task create-available` and Oek apply this rule, and a title change in Oek renames the file. Common prefixes are `Arrive`, `Builder Platform`, `Tenderdesk`, `imeto`, `Decksmith`, `Fidelio`, `Research`, and `Personal`. The prefix decides `area`, and a known area decides `axis` (see Life axes).

## Frontmatter

```yaml
type: Task
schema_version: 2
id: "<UUID>"
title: <short title>
status: available | committed | done | dropped
created: YYYY-MM-DD        # may be blank on migrated history
area:                      # title prefix when it is a known area; set by Oek
axis: professional | personal   # hidden system field; blank until assigned
committed_at:              # required while the task is Now
closed:                    # required for done/dropped
next_action:               # the first concrete step
outcome:                   # what done looks like
due:                       # a hard date only
blocked:                   # who or what the task waits on
repo:                      # hidden system field
links:                     # hidden system field
```

## The five fields

Oek shows five fields on a task. Each field has one purpose:

| Field | Purpose |
|---|---|
| `next_action` | The first concrete step. A task with one can appear in Next up. |
| `outcome` | What done looks like. Agents check completion against it. |
| `due` | A hard date only. It orders Due soon. |
| `blocked` | Who or what the task waits on. A blocked task leaves Next up. |
| Notes | Decisions and findings in the note body. Oek shows them newest first. |

Put background and context in a `## Context` section of the note body, not in frontmatter.

Oek keeps three hidden system fields because code needs them:

- `axis` drives the Professional and Personal filter. Oek derives it from `area` when the area is mapped, and keeps it for areas such as `Research` that map to no axis.
- `repo` tells a launched session which repository the work belongs to.
- `links` keeps related notes linked in Obsidian.

Minimal capture is valid. `outcome` and `next_action` are optional enrichment, not creation gates. `completed` and `review_after` are invalid legacy fields. `acceptance`, `context`, `size`, `tags`, `last_reviewed`, `commitment_cycle` and `commitment_until` are removed fields. The linter reports any that remain.

After cutover, create tasks only through the constrained CLI:

```bash
oek-task create-available --vault "$OEK_VAULT" --text "One sentence"
```

## Life axes

Oek sets `area` and a mapped `axis` when it creates or renames a task. `Arrive`, `Builder Platform`, `imeto`, `Decksmith`, `Tenderdesk` and `Fidelio` map to `professional`, and `Personal` maps to `personal`. The mapping lives in `axes.area_map` in the Oek config. `Research` and unprefixed tasks stay blank, and they show under both filters. Jev may suggest an axis from the title, but the assistant never sets or changes `axis` by hand. The linter rejects any other axis value.

## The main list

Oek shows one list in three sections:

1. **Now**: the tasks with `status: committed`.
2. **Due soon**: available tasks due within 30 days, ordered by due date.
3. **Next up**: the 5 oldest available tasks that have a `next_action` and no `blocked` value.

Search finds every other open task. History holds the closed tasks.

## Status authority

| Status | Meaning | Who may move it there |
|---|---|---|
| `available` | captured and eligible, not Now | assistant may create via constrained CLI |
| `committed` | Now: Olle works on it now | Olle only |
| `done` | complete | Olle only |
| `dropped` | intentionally abandoned | Olle only; assistant may suggest |

Olle moves a status in Oek, or he states the decision in a working session. A stated decision counts only when the session records his words verbatim with `oek-return decision`. A worker's own completion claim is never authority.

Now is a flag, not a cycle. A task stays Now until Olle releases it, marks it done, or drops it. Nothing expires, and there is no weekly or monthly review.

The assistant may add context and clarify a task. It may not mark a task Now, release, close, or drop on its own judgment. Starting a session does not change the Now flag. A worker result is evidence to review, never an implicit close.

## Record updates from linked sessions

A session linked with `oek-link` keeps the task record current through `oek-return`:

- `update --field next_action|outcome` writes the field from evidence. Oek keeps the previous value for revert and records the evidence on the task.
- `proposal` asks Olle to accept a change. A new proposal supersedes the pending proposal for the same field.
- `decision` records Olle's stated status decision with his quote.
- `finish` records the final checkpoint and closes the session link.

Do not edit `next_action`, `outcome`, or `status` in the note by hand while Oek runs. Use these commands, or Oek's own controls.

Tasks closed before the 2026-09-21 cutover may have a blank `closed` date, because the real date is unknown, and the linter counts them in one line. A migrated Now task without a trustworthy `committed_at` carries `revision_required: true` until Olle reviews it. Dates are never invented. `blocked` is context, not a status.

Keep one parseable frontmatter block. Double-quote values containing `: `, a leading `#`/`[`/`{`, or wikilinks.
