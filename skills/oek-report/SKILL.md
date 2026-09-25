---
name: oek-report
description: Use when an Oek launch brief or a handoff brief tells you to load oek-report, or when OEK_RETURN_TOKEN or ORCA_PANE_KEY is set and the session is linked to an Oek task - reports progress, findings, and proposed task changes to Oek so Olle sees them on the task.
---

# Report back to Oek

This session belongs to one Oek task. Olle follows its progress in Oek, not in this terminal. You can report only to that task.

## Check the link

Run `/Users/ollekruber/Documents/Personal/oek/bin/oek-return progress "Starting"`. It prints `200` when the link works. Exit code 78 means the terminal is not linked. In that case, write results where the brief says, and tell Olle that `oek-link` has not run.

## Progress

Send one short line at each milestone: when you start a step, when tests pass, when you are waiting, and when you finish. Keep it under 160 characters and on one line.

    /Users/ollekruber/Documents/Personal/oek/bin/oek-return progress "Tests pass, writing the README"

## Finding

Post a finding when you learn something the task note should keep: a fact, a decision Olle made, a link, or a constraint. Keep one fact per finding.

    printf '%s\n' "The repo pins FastAPI 0.115; upgrading is out of scope." > /tmp/oek-finding.md
    /Users/ollekruber/Documents/Personal/oek/bin/oek-return finding /tmp/oek-finding.md

## Proposal

Post a proposal when the task's outcome, next action, blocker, or state should change.

    printf '%s' "Draft the placement policy and review it with Melker." > /tmp/oek-next.md
    /Users/ollekruber/Documents/Personal/oek/bin/oek-return proposal /tmp/oek-next.md --field next_action

The field is one of `outcome`, `next_action`, `blocked`, or `status`. A `status` proposal is exactly `done` or `dropped`.

## Finish

When your work ends, send two proposals:

1. The state. Propose `status` `done` when the outcome is met, `status` `dropped` when the task should not continue, or `blocked` with the reason when it is waiting on someone.
2. The next action for whoever picks the task up.

Olle accepts or dismisses each proposal with one click in Oek. Nothing changes until he does.

## Rules

- Never change the task note or its state yourself. Propose instead.
- Report when something becomes true, not only at the end.
- A failed report prints the HTTP error. Tell Olle in the session, because Oek may not be running.
