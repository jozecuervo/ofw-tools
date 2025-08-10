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

### CLI testing conventions
- Spawn with Node directly: `spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' })`.
- Use temp directories via `fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'))` and write minimal fixtures.
- Mock heavy I/O (PDF, network). For Paylocity CLI, pass `--use-txt` and create `.txt` fixtures with normalized content.
- Assert headers and a minimal data row; allow integer or two-decimal numeric formatting.

### Paylocity parsing tests
- Use round, fake amounts only; avoid real income data.
- Cover month-name and numeric date formats; separate and range period labels.
- Include compact tax lines where the second currency is the current-period value (FIT/SS/MED).


