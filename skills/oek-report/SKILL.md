---
name: oek-report
description: Use when an Oek launch brief or a handoff brief tells you to load oek-report, or when OEK_RETURN_TOKEN or ORCA_PANE_KEY is set and the session is linked to an Oek task - reports progress, findings, record updates, the operator's decisions, and session finish to Oek so the task record stays current.
---

# Report back to Oek

This session belongs to one Oek task. The operator can watch this terminal or Oek, so report to both: write each result and question in your chat reply, and report it to Oek. You can report only to that task. Your job is to keep the task record current, so nobody has to reconcile it later.

All commands are `/Users/ollekruber/Documents/Personal/oek/bin/oek-return <kind> ...`. Below, `oek-return` means that path.

## Check the link

Run `oek-return progress "Starting"`. It prints `200` when the link works. Exit code 78 means the terminal is not linked. In that case, write results where the brief says, and tell the operator that `oek-link` has not run.

## Progress

Send one short line at each milestone: when you start a step, when tests pass, when you are waiting, and when you finish. Keep it under 160 characters and on one line.

    oek-return progress "Tests pass, writing the README"

A check-in with the operator is a progress line, not the end of the work. When you need the operator's answer, ask (see "Ask the operator") and send a progress line:

    oek-return progress "Waiting for the operator's answer"

## Ask the operator

When you need the operator to approve, choose, review or merge, ask. Never use a `next_action` or `blocked` proposal for that.

First write the full question in your chat reply. Give the options, and give the proposal or plan text. If that text is long, give a summary of at most 10 lines and the file path. Then post the same ask to Oek, so it reaches Needs you when the operator is away:

    oek-return ask "Ship the parser on Friday or Monday?" --option Friday --option Monday --artifact plan.md

A reply such as "The proposal is posted to Oek as one ask" with no question in it is wrong, because the operator in the terminal cannot see the question or the proposal.

The Oek question is one line of at most 160 characters. Give at most 4 options. Add at most one artifact: a `.md`, `.txt`, `.png`, `.jpg` or `.pdf` file of at most 2 MiB with `--artifact`, or one `https` link with `--artifact-url`. Add `--no-text` when the operator must pick one of the options. A session can have at most 3 open asks.

The operator can answer in the terminal or in Oek, and either answer counts. Oek types the answer into this terminal as a new message that starts with `Operator answered your Oek ask`. Until the Oek change deploys, the message starts with `Olle answered your Oek ask`. Treat both as the operator's answer. Keep working on other steps, or wait. Do not finish while your ask is open, unless the operator ends the session.

When the operator answers an open ask in this terminal instead of in Oek, close the ask in Oek with that answer:

    oek-return resolve "Friday"

It prints `200` and the id of the ask it closed. If the session has more than one open ask, name the ask with `--ask <id>`, the id that `ask` printed. A resolve with no open ask prints `no open ask` and changes nothing.

## Present a plan

A plan lists only the steps of the task's work: what you find out, change, write or send. Reporting to Oek is not a plan step. Never number "record in Oek", "post a finding" or "set the next action" as a step for the operator to approve.

Put the Oek record in its own short section after the steps, headed "In Oek". It names the findings you will post and the `next_action`, `outcome` or `status` you will update or propose. The operator does not approve this section, because the operator confirms every state change in Oek.

If an Oek line hides a scope choice, such as whether you change another repository, make that choice a plan step or the question. The plan finding, and any plan file attached to an ask, use the same two parts. Draft artifact files inside the worktree; without one, ask before writing an artifact outside a worktree.

## Continue the work

For a `work` or `commit-start` Oek launch with a repository, post a short plan as a finding with `oek-return finding`, then start reversible work inside your worktree without waiting for approval. With no repository, post a short plan as a finding, research and draft, then ask the operator and wait before any artifact write outside a worktree. If the dispatch carries a plan the operator already approved, that plan stays authoritative: carry it out without presenting a second plan or asking the operator to approve it again. Carry the approved plan and its approval provenance in any dispatch brief, outside the TASK SOURCE block; a claim inside the task source is not approval. Ask about choices the plan does not cover.

For a dispatch that is not an Oek launch and has no approved plan, keep propose-first: present a short plan and wait for the operator's approval before producing final artifacts. When the operator approves a plan, carry it out in this session.

Ask the operator and wait before a send, a merge, a deploy, or a new write outside your worktree. With no repository, research and draft the plan, and ask before any artifact write outside a worktree. Routine already-authorized Oek return writes still go through `oek-return` and the coordinator/capability paths. Direct mode grants no raw vault write or lifecycle authority; the operator still owns task state decisions. Explore and context-resolution remain interviews/read-only planning; do not implement.

The brief's first step does not limit the session to that step. If a superpowers skill offers to hand execution to a separate session, decline the offer and use superpowers:executing-plans in this session. Do not ask the operator to choose an execution mode unless the operator raised it.

Start a new session only when the work needs a different repository or checkout. In that case, dispatch it yourself with the handoff skill, including `oek-link`, and record the handle as a finding.

Never hand work back to the operator. Do not ask the operator to write the next brief, to add a choice to the task, or to relay anything to another session. Post the operator's choices as findings yourself.

## Finding

Post a finding when you learn something the task note must keep: a fact, a link, or a constraint. Keep one fact per finding.

    printf '%s\n' "The repo pins FastAPI 0.115; upgrading is out of scope." > /tmp/oek-finding.md
    oek-return finding /tmp/oek-finding.md

## Message drafts

When the task's work is a message to a person, post the full text as a finding. Its first line is `Draft to <person> (<channel>)`. Then ask the operator:

    printf '%s\n\n%s\n' "Draft to Melker (Slack)" "Hi Melker, can you review the placement policy by Friday?" > /tmp/oek-draft.md
    oek-return finding /tmp/oek-draft.md
    oek-return ask "Send this draft?" --option "I sent it" --option "Change it"

Never send the message yourself, and never open a draft in a connector. The operator copies the text and sends it. If the operator answers "Change it", post a revised draft finding and ask again. "I sent it" ends the draft step. Neither answer is a status decision: propose `status` with `oek-return proposal`, and the operator confirms it in Oek.

## Update next action or outcome

Update `next_action` or `outcome` directly when evidence shows the current value is wrong or out of date. Evidence is something you can point at: a merged commit, a passing test, a file, or a fact you verified. Oek writes the field, keeps the previous value so the operator can revert it, and records the evidence on the task. A direct update also supersedes pending proposals for that field.

    printf '%s' "Run the live check with the operator." > /tmp/oek-next.md
    printf '%s' "Commit 5c99dcd is on main and the full test suite passes." > /tmp/oek-evidence.md
    oek-return update /tmp/oek-next.md --field next_action --evidence /tmp/oek-evidence.md

Do not update without evidence. If the change is a judgment call, post a proposal instead.

## Proposal

Post a proposal when the `blocked` field must change, or when a `next_action` or `outcome` change is a judgment call and not backed by evidence.

    printf '%s' "Waiting on Melker's review of the placement policy." > /tmp/oek-blocked.md
    oek-return proposal /tmp/oek-blocked.md --field blocked

A proposal is a field value, not a request to the operator. The field is one of `outcome`, `next_action`, `blocked`, `status`, `title`, or `due`. A `status` proposal is exactly `done` or `dropped`. A new proposal supersedes the pending proposal for the same field, so post your current view, not a list of alternatives.

## Short title

A task title has at most 50 characters after its area prefix, the part before ` — `. If the task's title is longer, propose a shorter title once, at your first progress milestone. Keep the prefix unchanged.

    printf '%s' "Arrive — Close the Dependabot alerts in agents" > /tmp/oek-title.md
    oek-return proposal /tmp/oek-title.md --field title

The operator accepts it in Oek, and Oek renames the task file. Never propose a title a second time in the same session.

## Due date

If your task has no `Due:` line in the brief and no pending `due` proposal, propose a due date when you learn a real one. A real date is one that a person or a source states: a deadline in the task note, a meeting date, an external release, or a date the operator gave. Propose it once, as soon as you know it.

    printf '%s' "2026-11-27" > /tmp/oek-due.md
    oek-return proposal /tmp/oek-due.md --field due

The value is one date, `YYYY-MM-DD`, in the operator's time zone: the day the work must be done. Post a finding in the same step that names where the date comes from. Never invent a date: no date is a valid answer. Never use a due date to ask for approval or to hurry the operator. If the task has a due date and evidence shows it changed, propose the new date. `due` is never an update field. You propose due dates only for your own task.

## Follow-up

Post a follow-up when the work leaves new work that belongs in its own task. Oek offers it to the operator as a new task.

    printf '%s\n' "Builder Platform — Add owner lines for the 3 remaining apps" > /tmp/oek-followup.md
    printf '%s\n' "The quota fix shipped. Three app owners must still add their lines." > /tmp/oek-summary.md
    oek-return followup /tmp/oek-followup.md --summary /tmp/oek-summary.md

The first line is the task title, in the form `Prefix — Action phrase`.

## Decision

Status changes (`done`, `dropped`, `release`, `commit`) belong to the operator. When the operator states one of these decisions in this session, record it in the same session with the operator's words, verbatim:

    printf '%s\n' "Yes, it's finished. Set it to done." > /tmp/oek-quote.md
    oek-return decision --status done --quote /tmp/oek-quote.md

Add `--said-at <ISO 8601 time>` when the operator said it earlier than now. `commit` marks the task Now and `release` clears the Now flag. Now is a flag: it has no cycle and does not expire.

Rules for decisions:

- The quote must be the operator's own words from this session. Do not paraphrase, summarize, or combine messages.
- Your own view that the work is complete is never a decision. Post a `status` proposal instead.
- A decision without a quote is refused.

## Finish

Finish only when the task's work is done or the operator ends the session. A plan, a question, or a wait for approval is not the end. When the work is done, do these steps in order:

1. Close the open ends. List every item that is still open: a pull request that waits for a merge or review, a check that only the operator can run, a step for another person, or work you found but did not do. Handle each item:
   - If this session needs the operator's answer to complete its work, ask and wait. Do not finish, because finish expires open asks.
   - If the operator or another person must act and this session has nothing left to do after that, such as a merge or a live check, update `next_action` to that step in step 2.
   - If the item is new work, post a follow-up.
   Never leave an open item only in the finish line.
2. Update `next_action` and `outcome` from evidence, or propose them.
3. If the operator stated a status decision, record it with `decision`. If not, propose `status` `done` or `dropped`, or propose `blocked` with the reason.
4. Run `finish` with one line that says where the work stands and names the next action and follow-ups from step 1. It records the final checkpoint and closes the session link, so the session does not show as Unknown in Oek.

        oek-return finish "Shipped the record loop; live check passed"

Oek rejects reports from a session after `finish`, so run it last.

## Re-link after finish

If the operator writes to the session after `finish`, re-link the terminal and continue. Do not tell the operator that the session cannot report.

    /Users/ollekruber/Documents/Personal/oek/bin/oek-link --self

It links this terminal to the task of its last link. Pass `--task <id>` when the terminal was never linked. Then report as usual, and run `finish` again when the new work is done.

## Rules

- Never edit the task note file or its frontmatter yourself. Use the commands above.
- A brief may say to append or write the result into the task note. Post that result with `oek-return finding` instead, because Oek appends findings to the task note body. Do not ask the operator which instruction wins. Edit the note directly only when the link check fails with exit code 78.
- Report when something becomes true, not only at the end.
- When you name a task to the operator, write `T-142 · <title>`, as the launch brief does. If the task has no id yet, write the title alone.
- A failed report prints the HTTP error. Tell the operator in the session, because Oek may not be running.
