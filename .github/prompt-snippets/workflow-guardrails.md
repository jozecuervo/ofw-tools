---
description: Guardrails for assistant workflow in this repo
---

## Commit/Push Confirmation

- Before committing changes: summarize edits and ask the user for explicit approval.
- Before pushing changes: confirm again with the user.
- When proposing to commit/push, output the exact commands that will be run.
- Default to making changes via edits only; do not run `git commit` or `git push` without confirmation.


