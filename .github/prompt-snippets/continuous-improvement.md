---
description: Continuous improvement guidelines for AI prompts and rules based on real-world usage
---

## Continuous Improvement Guidelines

- Capture Feedback
  - Use the “Prompt Feedback” issue template for successes, failures, and edge cases.
  - Link to artifacts (files in `source_files/` and `output/`) and the exact prompt used.

- Track and Label
  - Label issues with `ai-prompts`, `bug`, or `enhancement` as applicable.
  - Maintain a running summary in the PR description when iterating on prompts.

- Iterate Safely
  - Change one variable at a time (tone, structure, checklist) to see impact.
  - Prefer small, discrete edits with clear commit messages.
  - Align edits with `versioning-and-changelog.md`; record notable prompt changes in `CHANGELOG.md`.

- Evaluate
  - Define expected outcomes (e.g., fewer attorney escalations for non-risky messages, clearer exhibits, reduced rework).
  - Add or update tests and examples in prompt files to reflect new patterns.

- Cadence
  - Perform a monthly prompt review to triage feedback and apply improvements.
  - Escalate unclear tradeoffs to the attorney or owner for decision.

- Guardrails
  - Preserve legal and safety boundaries. Any relaxations require explicit approval.
  - If performance regresses (more confusion or escalations), revert to the previous stable prompt.


