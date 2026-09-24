---
name: oek-report
description: Use when an Oek launch brief tells you to load oek-report, or when OEK_RETURN_TOKEN is set in your environment - returns findings and proposed task-field changes to Oek so Olle sees them on the task.
---

# Report back to Oek

Oek launched this session for one task. You can send two kinds of return to that task. You cannot send returns to any other task.

## Check the capability

Run `test -n "$OEK_RETURN_TOKEN" && echo ready`. If it prints nothing, the session was not launched by Oek. Do not try to report. Write results where the brief says instead.

## Finding

Post a finding when you learn something the task note should keep: a fact, a decision Olle made, a link, or a constraint.

    printf '%s\n' "The repo pins FastAPI 0.115; upgrading is out of scope." > /tmp/oek-finding.md
    /Users/ollekruber/orca/workspaces/oek/oek-control-tower/bin/oek-return finding /tmp/oek-finding.md

Keep one fact per finding. Keep it under a few sentences.

## Proposal

Post a proposal when the task's outcome, next action, or blocker should change.

    printf '%s' "Draft the placement policy and review it with Melker." > /tmp/oek-next.md
    /Users/ollekruber/orca/workspaces/oek/oek-control-tower/bin/oek-return proposal /tmp/oek-next.md --field next_action

The field is one of `outcome`, `next_action`, or `blocked`. Olle accepts, edits, or dismisses it in Oek.

## Rules

- Never report the task as done. Completion is Olle's decision.
- Report when a finding or proposal becomes true, not only at the end of the session.
- A failed report prints an HTTP error. Tell Olle in the session, because Oek may not be running.
