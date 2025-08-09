---
description: Perform code reviews focusing on security, performance, and maintainability
applyTo: "**/*"
---

## Code Review Checklist

- Security: no secrets; sanitize inputs; avoid eval/exec.
- Performance: prefer maps/streaming; incremental parsing for large files.
- Reliability: helpful errors; handle empty/malformed inputs and encodings.
- Maintainability: clear names; shallow nesting; tests for tricky logic.

### Repo-Specific

- Ensure SemVer bump in `package.json` and a `CHANGELOG.md` entry for user-facing changes.
- Prefer small, discrete commits.

Provide actionable bullets with suggested diffs or function names.


