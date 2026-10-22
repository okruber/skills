---
name: oek-report
description: Use when an Oek launch brief or a handoff brief tells you to load oek-report, or when OEK_RETURN_TOKEN or ORCA_PANE_KEY is set and the session is linked to an Oek task - reports progress, findings, record updates, Olle's decisions, and session finish to Oek so the task record stays current.
---

# Report back to Oek

This session belongs to one Oek task. Olle follows its progress in Oek, not in this terminal. You can report only to that task. Your job is to keep the task record current, so nobody has to reconcile it later.

All commands are `/Users/ollekruber/Documents/Personal/oek/bin/oek-return <kind> ...`. Below, `oek-return` means that path.

## Check the link

Run `oek-return progress "Starting"`. It prints `200` when the link works. Exit code 78 means the terminal is not linked. In that case, write results where the brief says, and tell Olle that `oek-link` has not run.

## Progress

Send one short line at each milestone: when you start a step, when tests pass, when you are waiting, and when you finish. Keep it under 160 characters and on one line.

    oek-return progress "Tests pass, writing the README"

## Finding

Post a finding when you learn something the task note must keep: a fact, a link, or a constraint. Keep one fact per finding.

    printf '%s\n' "The repo pins FastAPI 0.115; upgrading is out of scope." > /tmp/oek-finding.md
    oek-return finding /tmp/oek-finding.md

## Update next action or outcome

Update `next_action` or `outcome` directly when evidence shows the current value is wrong or out of date. Evidence is something you can point at: a merged commit, a passing test, a file, or a fact you verified. Oek writes the field, keeps the previous value so Olle can revert it, and records the evidence on the task. A direct update also supersedes pending proposals for that field.

    printf '%s' "Run the live check with Olle." > /tmp/oek-next.md
    printf '%s' "Commit 5c99dcd is on main and the full test suite passes." > /tmp/oek-evidence.md
    oek-return update /tmp/oek-next.md --field next_action --evidence /tmp/oek-evidence.md

Do not update without evidence. If the change is a judgment call, post a proposal instead.

## Proposal

Post a proposal when the `blocked` field must change, or when a `next_action` or `outcome` change is a judgment call and not backed by evidence.

    printf '%s' "Waiting on Melker's review of the placement policy." > /tmp/oek-blocked.md
    oek-return proposal /tmp/oek-blocked.md --field blocked

The field is one of `outcome`, `next_action`, `blocked`, or `status`. A `status` proposal is exactly `done` or `dropped`. A new proposal supersedes the pending proposal for the same field, so post your current view, not a list of alternatives.

## Decision

Status changes (`done`, `dropped`, `release`, `commit`) belong to Olle. When Olle states one of these decisions in this session, record it in the same session with his words, verbatim:

    printf '%s\n' "Yes, it's finished. Set it to done." > /tmp/oek-quote.md
    oek-return decision --status done --quote /tmp/oek-quote.md

Add `--said-at <ISO 8601 time>` when he said it earlier than now. `commit` marks the task Now and `release` clears the Now flag. Now is a flag: it has no cycle and does not expire.

Rules for decisions:

- The quote must be Olle's own words from this session. Do not paraphrase, summarize, or combine messages.
- Your own view that the work is complete is never a decision. Post a `status` proposal instead.
- A decision without a quote is refused.

## Finish

When your work ends, do these steps in order:

1. Update `next_action` and `outcome` from evidence, or propose them.
2. If Olle stated a status decision, record it with `decision`. If he did not, propose `status` `done` or `dropped`, or propose `blocked` with the reason.
3. Run `finish` with one line that says where the work stands. It records the final checkpoint and closes the session link, so the session does not show as Unknown in Oek.

        oek-return finish "Shipped the record loop; live check passed"

After `finish`, this session can no longer report. Run it last.

## Rules

- Never edit the task note file or its frontmatter yourself. Use the commands above.
- Report when something becomes true, not only at the end.
- A failed report prints the HTTP error. Tell Olle in the session, because Oek may not be running.
