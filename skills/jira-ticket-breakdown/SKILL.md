---
name: jira-ticket-breakdown
description: Use when you have a design spec or implementation plan and want it in Jira — decomposing it into an epic/story/task/sub-task breakdown, proposing tickets for review, or creating them in the AIE project. Triggers include "break this down into Jira tickets", "create an epic and stories from this plan", "turn this spec into Jira issues", "file this into Jira".
---

# Jira Ticket Breakdown

## Overview

Turn a design spec and/or implementation plan into a **conservative** Jira issue hierarchy that the human reviews and owns. The markdown breakdown is the default deliverable; creating issues in Jira via the Atlassian MCP is an explicit, opt-in second step.

Core principle: propose the smallest hierarchy that faithfully captures the work, explain the shape, and never create issues until the human approves.

## When to use

- You have a spec (`…/specs/…-design.md`) or plan (`…/plans/…`) and want Jira tickets from it.
- You want an epic/story/sub-task proposal before filing anything.

Not this skill: rewriting one existing ticket's body → use `jira-ticket-rewrite`. This skill *decomposes*; that one *rewrites*.

## Input resolution

Accept a spec path, a plan path, both, or the current discussion. Detect type by location/shape:

- **Spec** → defines the container (usually a **Story**; an Epic only when it spans several independent deliverables or multiple specs/agents) + a first-cut child list.
- **Plan** → supplies the Task/Sub-task breakdown under the container.
- **Both** → spec drives the container + rationale; plan drives the tasks.
- **One only** → use it for both halves and flag the lower-fidelity half.

Target project: **AIE** by default; honor an explicit project key if the user gives one.

## Decomposition & conservative bundling

1. **Choose the shape by scope — and say why.** Default a single design spec to one **Story** (optionally with Sub-tasks); reserve an **Epic** for an initiative spanning several *independent* deliverables or multiple specs/agents. State the shape and the reason before listing tickets.
2. **Independence ≠ phasing.** Independent deliverables = different domains/owners/merge boundaries shipping in parallel → Epic + Stories. A v1/v2/v3 rollout of one cohesive subsystem is *phasing*: one Story, committed phase as Definition of Done, later phases as scope/roadmap (or Sub-tasks only if independently assignable). Phasing alone is never an Epic.
3. **Check the zoom level.** Ask whether the spec is the whole initiative or one track of a larger program. If a broader program exists (or the user names one), the Epic lives there and this spec becomes a Story/track under it.
4. **Bias toward fewer issues.** Fold related small steps into the parent's Definition of Done checklist instead of one Sub-task each. Promote a step to its own issue only when it is independently trackable or assignable (distinct owner, review, merge, or a real dependency boundary). When unsure, bundle — and state the choice so the human can split it later.

## Ticket template (lean, level-scaled)

Markdown bodies. Include only the sections the level calls for:

- **Epic:** `What` (1 sentence) · `Why` · `Scope` (in / out) · child-story list.
- **Story:** `What` · `Why` · `Definition of Done` (checklist).
- **Task / Sub-task:** `What` (1–2 lines) · `Definition of Done` (checklist).

Rules:

- `What` is one sentence, no bullets. `Definition of Done` items are measurable and checkable.
- `Scope` (in/out) and an optional one-line `Risks` appear only where the source warrants — not on every ticket.
- **Never** add estimates, labels, assignees, or any link/reference to the spec or plan files.
- Never invent facts. If the source lacks a section's content, omit the section — do not pad with `N/A`.

## Review → create workflow

1. **Propose.** Print the full tree as markdown — for each node: issue type, summary, body (per the template), and parent. Stop here by default.
2. **Create only on an explicit instruction** (e.g. "create these in AIE"):
   - Confirm the Atlassian MCP is connected and list its tools; resolve the create/search/metadata tool names (commonly `createJiraIssue`, `searchJiraIssuesUsingJql`, `getJiraProjectIssueTypesMetadata`).
   - **Search before create:** for each issue, JQL-search the project for an open issue with the same summary, e.g. `project = AIE AND summary ~ "<summary>" AND statusCategory != Done`. If found, skip it and report `already exists (AIE-xxx)`.
   - Ask for **one bulk confirmation**, then create in order: Epic → capture its key → Stories linked to the Epic → Sub-tasks with parent = the owning Story. Send bodies with `contentFormat: markdown`.
   - Report created and skipped keys. If writes are denied, say so and output the copy-paste markdown instead.

## Common mistakes

- **Over-splitting** — a Sub-task per micro-step floods the board. Bundle into Definition of Done checklists.
- **Forcing an Epic** — on a small single-change spec, on a phased rollout (v1/v2/v3 of one subsystem → one Story with phased DoD), or on a spec that is really one track under a broader program Epic. Story-root by default.
- **Inventing facts** to fill a section. Omit the section.
- **Referencing the spec/plan files** in ticket bodies. Tickets must stand alone.
- **Creating without the review + bulk confirmation.** Propose first, every time.
