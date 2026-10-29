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

A check-in with Olle is a progress line, not the end of the work. When you need his answer, post an ask (see "Ask Olle") and send a progress line:

    oek-return progress "Waiting for Olle's answer"

## Ask Olle

When you need Olle to approve, choose, review or merge, post an ask. Never use a `next_action` or `blocked` proposal for that.

    oek-return ask "Ship the parser on Friday or Monday?" --option Friday --option Monday --artifact plan.md

The question is one line of at most 160 characters. Give at most 4 options. Add at most one artifact: a `.md`, `.txt`, `.png`, `.jpg` or `.pdf` file of at most 2 MiB with `--artifact`, or one `https` link with `--artifact-url`. Add `--no-text` when Olle must pick one of the options. A session can have at most 3 open asks.

Oek types Olle's answer into this terminal as a new message that starts with `Olle answered your Oek ask`. Keep working on other steps, or wait. Do not finish while your ask is open, unless Olle ends the session.

## Continue the work

When Olle approves a plan, carry it out in this session. The brief's first step does not limit the session to that step. If a superpowers skill offers to hand execution to a separate session, decline the offer and use superpowers:executing-plans in this session. Do not ask Olle to choose an execution mode unless he raised it.

Start a new session only when the work needs a different repository or checkout. In that case, dispatch it yourself with the handoff skill, including `oek-link`, and record the handle as a finding.

Never hand work back to Olle. Do not ask him to write the next brief, to add a choice to the task, or to relay anything to another session. Post his choices as findings yourself.

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

A proposal is a field value, not a request to Olle. The field is one of `outcome`, `next_action`, `blocked`, or `status`. A `status` proposal is exactly `done` or `dropped`. A new proposal supersedes the pending proposal for the same field, so post your current view, not a list of alternatives.

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

Finish only when the task's work is done or Olle ends the session. A plan, a question, or a wait for approval is not the end. When the work is done, do these steps in order:

1. Update `next_action` and `outcome` from evidence, or propose them.
2. If Olle stated a status decision, record it with `decision`. If he did not, propose `status` `done` or `dropped`, or propose `blocked` with the reason.
3. Run `finish` with one line that says where the work stands. It records the final checkpoint and closes the session link, so the session does not show as Unknown in Oek.

        oek-return finish "Shipped the record loop; live check passed"

Oek rejects reports from a session after `finish`, so run it last.

## Re-link after finish

If Olle writes to the session after `finish`, re-link the terminal and continue. Do not tell him the session cannot report.

    /Users/ollekruber/Documents/Personal/oek/bin/oek-link --self

It links this terminal to the task of its last link. Pass `--task <id>` when the terminal was never linked. Then report as usual, and run `finish` again when the new work is done.

## Rules

- Never edit the task note file or its frontmatter yourself. Use the commands above.
- A brief may say to append or write the result into the task note. Post that result with `oek-return finding` instead, because Oek appends findings to the task note body. Do not ask Olle which instruction wins. Edit the note directly only when the link check fails with exit code 78.
- Report when something becomes true, not only at the end.
- A failed report prints the HTTP error. Tell Olle in the session, because Oek may not be running.
