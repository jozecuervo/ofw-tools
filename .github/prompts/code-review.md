---
description: Perform code reviews focusing on security, performance, and maintainability
applyTo: "**/*"
---

## Code Review Checklist

- Security
  - No hardcoded secrets or sensitive paths.
  - Validate and sanitize all input (CLI flags, file paths).
  - Avoid unsafe eval/exec; prefer explicit logic.
- Performance
  - Avoid O(n^2) operations on large datasets; consider maps and streaming.
  - For PDF and large text processing, ensure incremental processing to cap memory.
  - Do not block the main thread unnecessarily; prefer small synchronous steps or streaming.
- Reliability
  - Clear error messages and non-zero exit codes on failure.
  - Edge cases handled (empty files, malformed inputs, unexpected encodings).
- Maintainability
  - Descriptive names; minimal nesting; small modules.
  - Comments explain "why" when non-obvious.
  - Tests present for critical logic and tricky parsing rules.

### Repo-Specific Rules

- Versioning: ensure `package.json` version is bumped (SemVer) for user-facing changes.
- Changelog: ensure `CHANGELOG.md` has an entry for this change.
- Commits: prefer small, discrete commits scoped to one functional change.

Provide actionable feedback in bullets with suggested diffs or function names.


