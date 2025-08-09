# Contributing

Thank you for contributing to `ofw-tools`!

## Development

- Use Node via `nvm` (`source ~/.nvm/nvm.sh && nvm use`).
- Install deps with `npm install` (no yarn.lock present).
- Run tests with `npm test`.

## AI Prompt Contributions

- Place task-specific prompts in `.github/prompts/` and reusable snippets in `.github/prompt-snippets/`.
- Use Markdown with YAML front matter including `description` and, optionally, `applyTo` globs.
- Test prompts with at least two AI models when possible.
- Submit PRs targeting the `ai-tooling-setup` branch or a dedicated feature branch.

Example front matter:

```yaml
---
description: Generate unit tests using Arrange-Act-Assert with Jest
applyTo: "**/__tests__/**/*.{js,ts}"
---
```

## Versioning & Changelog

- Always bump `package.json` version (SemVer) for releases that change behavior or outputs.
- Always add a corresponding `CHANGELOG.md` entry (version, date, bullets).
- Keep commits small and scoped to a single functional change.

## Workflow Guardrails

- Ask the repository owner for approval before committing and before pushing.
- Provide a summary of edits and the exact commands you intend to run.

## Continuous Improvement of Prompts

- Use the "Prompt Feedback" issue template to capture outcomes and ideas.
- Follow `.github/prompt-snippets/continuous-improvement.md` for cadence and safety.


