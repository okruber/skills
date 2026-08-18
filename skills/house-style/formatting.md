# Formatting

Condensed from the Google developer documentation style guide. Fetch the linked
page for anything not covered here.

## Headings

Sentence case, always: "Set up the build cache", not "Set Up The Build Cache".

Use an imperative for a task heading ("Configure the proxy") and a noun phrase
for a concept heading ("Build cache behaviour"). Use a gerund only for a
conceptual overview ("Understanding retries").

Do not skip levels. Do not stack two headings with no text between them. Do not
put a colon at the end. Make the heading readable out of context, because
readers arrive from search and from screen readers jumping heading to heading.

## Lists

Numbered for sequences. Bulleted for sets where order does not matter.
Description lists for term-and-explanation pairs.

Introduce a list with a complete sentence, not a fragment the items complete.
End the introduction with a colon when the list follows immediately.

Keep items parallel in grammar and syntax. Start each item with a capital
letter. End each with a period, except when the item is a single word, has no
verb, is entirely code font, or is entirely link text.

For run-in headings use a colon and lowercase after it:

- **Big**: a short word
- **Gratuitous**: a long word

Never use a dash to separate an item from its description. Use a colon.

Never write a one-item list.

## Procedures

Number every step, even a single one, when the reader must act in order.

One action per step. Put the condition first: "If the cache is stale, run
`docker builder prune`." Put the location before the action: "In the settings
file, set `retries` to 3."

State the result when it is not obvious. Put a code block inside the step it
belongs to.

## Code and UI

Code font for anything the reader types or the machine reads: commands, flags,
filenames, paths, variables, values, class and method names, HTTP verbs, and
status codes. Do not use code font for product names.

Bold for UI elements the reader interacts with: **Save**, **Settings**.

In command-line syntax, wrap optional parts in `[]`, show alternatives with `|`,
and mark placeholders clearly. Do not include the shell prompt in a copyable
command.

## Links

Descriptive link text that makes sense on its own. Never "click here", "this
document", "this article", or a bare URL.

Use the standard introduction: "For more information, see [Page title]." Add an
"about" clause when the reason is not obvious: "For more information about
retries, see ...". Use *see*, not *refer to*. Use *about*, not *on*.

Do not force a link to open in a new tab. Do not add an external-link icon.
Put punctuation outside the link.

Prefer explaining the thing over linking to it.

## Tables

Use a table for structured data with two or more properties per item. Use a list
for a single sequence or a simple collection.

Give every column a heading. Keep cells short and parallel. Do not leave a cell
empty: write `N/A` or `None`.

## Notices

Use sparingly, and never stack two. Format as a bold label and one short
paragraph.

- **Note**: information the reader needs but that interrupts the flow.
- **Caution**: the reader can lose data or break something.
- **Warning**: the reader can cause harm or an irreversible loss.

Do not hide a required step inside a note. If it is required, it is a step.

## Images

Every image needs alt text describing its information, not its appearance. Skip
alt text only for a purely decorative image. Do not put information only in an
image, since it is unsearchable and untranslatable.
