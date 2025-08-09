---
description: Generate unit tests using Arrange-Act-Assert with Jest
applyTo: "**/__tests__/**/*.{js,ts}"
tools: ["jest"]
---

## Unit Testing (AAA)

1) Arrange inputs/mocks. 2) Act. 3) Assert.

Guidelines:
- One behavior per test; prefer pure functions; mock I/O and heavy libs (e.g., `pdf-parse`, `polarity`).
- For CLIs, test arg parsing and exit codes via `child_process.spawnSync`.


