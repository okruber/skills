---
name: jira-ticket-breakdown
description: Use when you have a design spec, implementation plan, notes, a PRD, or pasted content and want it turned into a Jira issue hierarchy — decomposing it into an epic/story/task/sub-task breakdown, proposing tickets for review, or creating them in Jira. Triggers include "break this down into Jira tickets", "create an epic and stories from this plan", "turn this spec into Jira issues", "file this into Jira", "turn these notes into tickets".
---

# Jira Ticket Breakdown

## Overview

Turn a design spec and/or implementation plan into a **conservative** Jira issue hierarchy that the human reviews and owns. The markdown breakdown is the default deliverable; creating issues in Jira via the Atlassian MCP is an explicit, opt-in second step.

Core principle: propose the smallest hierarchy that faithfully captures the work, explain the shape, and never create issues until the human approves.

## When to use

- You have a spec, plan, notes, a PRD, an existing ticket, or pasted content and want Jira tickets from it.
- You want an epic/story/sub-task proposal before filing anything.

Not this skill: rewriting one existing ticket's body → use `jira-ticket-rewrite`. This skill *decomposes*; that one *rewrites*.

## Input resolution

Accept a spec path, a plan path, pasted notes/PRD/ticket text, or the current discussion. Detect shape, not just file location — a design spec and a pasted PRD play the same role:

- **Spec-like** (design doc, PRD, notes describing what to build and why) → defines the container (usually a **Story**; an Epic only when it spans several independent deliverables or multiple specs/agents) + a first-cut child list.
- **Plan-like** (ordered implementation steps) → supplies the Task/Sub-task breakdown under the container.
- **Both** → spec-like drives the container + rationale; plan-like drives the tasks.
- **One only** → use it for both halves and flag the lower-fidelity half.
- **Existing ticket(s) pasted in** → treat as the container already decided; extract/refine children from its content.

Project/board key is a create-time concern, not a drafting one — the ticket template never references it. Don't ask for it until the create step (see below).

## Decomposition & conservative bundling

1. **Choose the shape by scope — and say why.** Default a single design spec to one **Story** (optionally with Sub-tasks); reserve an **Epic** for an initiative spanning several *independent* deliverables or multiple specs/agents. State the shape and the reason before listing tickets.
2. **Independence ≠ phasing.** Independent deliverables = different domains/owners/merge boundaries shipping in parallel → Epic + Stories. A v1/v2/v3 rollout of one cohesive subsystem is *phasing*: one Story, committed phase as the Definition of Done list, later phases as scope/roadmap (or Sub-tasks only if independently assignable). Phasing alone is never an Epic.
3. **Check the zoom level.** Ask whether the spec is the whole initiative or one track of a larger program. If a broader program exists (or the user names one), the Epic lives there and this spec becomes a Story/track under it.
4. **Bias toward fewer issues.** Fold related small steps into the parent's Definition of Done checklist instead of one Sub-task each. Promote a step to its own issue only when it is independently trackable or assignable (distinct owner, review, merge, or a real dependency boundary). When unsure, bundle — and state the choice so the human can split it later.

## Ticket template (lean, level-scaled)

Markdown bodies. Include only the sections the level calls for:

- **Epic:** `What` (1 sentence) · `Why` · `Scope` (in / out) · child-story list.
- **Story:** `What` · `Why` · `Definition of Done` (plain bullet list).
- **Task / Sub-task:** `What` (1–2 lines) · `Definition of Done` (plain bullet list).

Rules:

- `What` is one sentence, no bullets. `Definition of Done` items are plain `-` bullets (never `- [ ]` checkbox syntax) and each is measurable and checkable.
- `Scope` (in/out) and an optional one-line `Risks` appear only where the source warrants — not on every ticket.
- **Never** add estimates, labels, assignees, or any link/reference to the spec or plan files.
- Never invent facts. If the source lacks a section's content, omit the section — do not pad with `N/A`.

## Review → create workflow

1. **Propose.** Print the full tree as markdown — for each node: issue type, summary, body (per the template), and parent. Stop here by default.
2. **Create only on an explicit instruction** (e.g. "create these", "file this in Jira"):
   - **Check MCP availability first.** No Atlassian MCP tools resolve at all → say so plainly and stop; the markdown already proposed is the deliverable — the human copy-pastes it into whatever tool they have.
   - MCP available → confirm connection and list its tools; resolve the create/search/metadata tool names (commonly `createJiraIssue`, `searchJiraIssuesUsingJql`, `getJiraProjectIssueTypesMetadata`).
   - **Resolve the project/board key**: an explicit key given this turn > one already established earlier in this session > ask. Never assume a default — one Atlassian connection can front many boards.
   - **Search before create:** for each issue, JQL-search the project for an open issue with the same summary, e.g. `project = <PROJECT_KEY> AND summary ~ "<summary>" AND statusCategory != Done`. If found, skip it and report `already exists (<KEY>-xxx)`.
   - Ask for **one bulk confirmation**, then create in order: Epic → capture its key → Stories linked to the Epic → Sub-tasks with parent = the owning Story. Send bodies with `contentFormat: markdown`.
   - Report created and skipped keys. If writes are denied, say so and output the copy-paste markdown instead.

## Common mistakes

- **Over-splitting** — a Sub-task per micro-step floods the board. Bundle into the Definition of Done list.
- **Forcing an Epic** — on a small single-change spec, on a phased rollout (v1/v2/v3 of one subsystem → one Story with phased DoD), or on a spec that is really one track under a broader program Epic. Story-root by default.
- **Inventing facts** to fill a section. Omit the section.
- **Referencing the spec/plan files** in ticket bodies. Tickets must stand alone.
- **Creating without the review + bulk confirmation.** Propose first, every time.
- **Assuming a default project/board.** There isn't one — resolve it explicitly at create time, every time.
