---
description: Overarching instructions for AI assistance in this repo
---

# AI Assistance Guidelines

- Reference prompt files in `.github/prompts/` for task-specific guidance.
- Prioritize correctness, security, and efficiency.
- If unsure, ask for clarification and propose safe defaults.
- Integrate with repo tools: use existing npm scripts and Jest tests.
- For naming, see [`naming-conventions.md`](./prompt-snippets/naming-conventions.md).
- For divorce-related workflows, use [`divorce-navigator.md`](./prompts/divorce-navigator.md) and supporting snippets:
  - [`communication-templates.md`](./prompt-snippets/communication-templates.md)
  - [`document-checklists.md`](./prompt-snippets/document-checklists.md)
  - [`workflow-guardrails.md`](./prompt-snippets/workflow-guardrails.md)
  - Legal review: [`legal-review.md`](./prompts/legal-review.md), [`legal-escalation-checklist.md`](./prompt-snippets/legal-escalation-checklist.md)
- Continuous improvement: follow [`continuous-improvement.md`](./prompt-snippets/continuous-improvement.md) and use the "Prompt Feedback" issue template.

## Capability Map

- General coding: `prompts/general-coding.md`
- Testing (Jest, AAA): `prompts/unit-testing.md`
- Code review: `prompts/code-review.md`
- Node CLI patterns: `prompts/js-cli-tools.md`
- OFW parsing and clusters: `prompts/ofw-parsing.md`
- Divorce Navigator (persona, tone, I/O): `prompts/divorce-navigator.md`
- Legal review and escalation: `prompts/legal-review.md`, `prompt-snippets/legal-escalation-checklist.md`
- Reusable snippets: `prompt-snippets/*`


