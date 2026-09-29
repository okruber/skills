---
name: show-me
description: Explain the current topic, a code change, or a concept as one visual plus up to three takeaways.
disable-model-invocation: true
---

# Show me

Answer the current topic as a visual brief. The whole reply has these parts, in this order, and ends after the last one:

1. **Title.** One line naming the subject.
2. **Primary visual.** One code block, chosen from the table below. It carries the explanation. Label nodes with the real names of files, functions, commands, and states.
3. **Takeaways.** One to three bullets, each one sentence. A takeaway is a reason, a consequence, or an open decision for Olle. A fact already drawn in the visual is not a takeaway, so the first bullet starts from what the visual implies.
4. **State line.** Include it only when the subject is a change: `State: proposed | locally implemented | committed | pushed | merged | live`, plus what was verified.

## Choose the visual

| The subject is | Visual |
| --- | --- |
| Logic or an algorithm | Pseudocode |
| Runtime control flow | Call tree |
| A sequence across actors or systems | Mermaid `sequenceDiagram` or `flowchart` |
| UI structure | Component tree with file paths |
| File responsibilities or a broad refactor | Shallow file tree with `#` comments |
| A data shape or contract | Types |
| A change to any of the above | `diff` of that same visual, keeping unchanged neighbours as context |
| A new block the reader needs to copy | The whole block |

For a change, read the real diff, status, and test results first, and draw from them.

## HTML

Write one focused HTML file only when the subject is a visual UI or layout, or when it has more than about 12 connected nodes. Save it as `show-me-<topic>.html` next to the work, run `open` on it, and keep the primary visual in the reply as its summary.

## Example

````markdown
## Save path after the cache change

```diff
 on(save)
+  if content is unchanged
+    return cached result
   write content
+  invalidate cache
```

- Unchanged saves no longer touch disk, so the file watcher stops firing on them.
- The cache is per process, so a second editor still writes.

State: committed on `feat/save-cache`, unit tests pass, not merged.
````
