---
description: Guidelines for general code generation and best practices in this repo
applyTo: "**/*.{js,json,md}"
tools: ["jest"]
---

## General Coding Guidelines

- Prefer vanilla JS and Node built-ins; keep functions small and pure where possible.
- Validate inputs (CLI args, paths); fail fast with clear errors and non-zero exits.
- Use early returns; avoid deep nesting; keep modules single-purpose.
- Stream or chunk large files to bound memory; log concise, actionable errors.

### Style & Tests

- Names: functions as verbs; values as nouns; avoid abbreviations.
- Tests: deterministic Jest tests; mock heavy libs and I/O when practical.

### Repo Rules

- Bump `package.json` (SemVer) and update `CHANGELOG.md` for user-visible changes.
- Keep commits discrete: one functional change per commit when feasible.


