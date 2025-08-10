---
description: Patterns for Node.js CLIs that parse payroll PDFs/text and emit CSV
---

## JS CLI (Payroll) Patterns

Structure
- CommonJS modules (`require`, `module.exports`), Node version via `.nvmrc`.
- CLI entry guarded by `if (require.main === module)`.
- Functions small and pure where possible (parse vs I/O separated).

Flags
- `--out <file.csv>` destination; default derived from input.
- `--glob <pattern>` substring filter on filenames.
- `--debug-text` optional normalized text dumps for troubleshooting.
- `--use-txt` test mode to read `.txt` files instead of PDFs.

I/O
- Use `fs.readdirSync` with `Dirent` to filter files by extension.
- Ensure output directories with an `ensureDir` helper.
- Stable CSV header row; escape fields containing commas/quotes/newlines.

Parsing heuristics (Paylocity)
- Date normalization for numeric and month-name formats.
- Label variants (Pay Date/Check Date; Pay Period vs Period Beginning/Ending).
- Monetary parsing accepts `$`, commas, and parentheses negatives.
- Compact tax lines: second currency token = current-period amount (FIT/SS/MED).

Testing
- Mock PDF extraction; prefer `.txt` fixtures with `--use-txt` in CLI tests.
- Use round fake numbers; assert header and at least one data row.
- Verify exit code 0 and file written at expected path.


