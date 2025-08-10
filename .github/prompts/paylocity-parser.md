---
description: Guidance for parsing Paylocity paycheck PDFs and building tests/CLIs
---

## Paylocity Parser Guidance

Goal: Extract robust paycheck fields from Paylocity PDFs (or normalized text) and emit one CSV row per paycheck.

Key fields
- Pay Date: support both numeric (MM/DD/YYYY) and month-name dates (e.g., "August 1, 2025").
- Pay Period: handle either a single range line ("Pay Period: start - end") or separate labels: "Period Beginning", "Period Ending".
- Monetary summary: Gross Pay, Net Pay, Total Taxes, Total Deductions.
- Tax components: Federal (FIT/FITW/FITWS), State (SIT/CA variants), Social Security (SS/OASDI), Medicare (MED).

Money parsing rules
- Accept optional leading $ and thousands separators (commas).
- Negative values can be leading '-' or wrapped in parentheses.

Heuristics
- Label placement varies. Try:
  - Same-line value: `Label: $1,234.56`
  - Value on next line after label
  - Amount-first compact lines: second currency token corresponds to current-period amount (e.g., `FITWS 7,757.30 1,445.55`).
- Normalize text: replace em/en dashes with hyphen, collapse repeated spaces, preserve newlines.

CLI usage (paylocity.js)
- `node paylocity.js <source-folder> [--out <file.csv>] [--glob <pattern>] [--debug-text] [--use-txt]`
- `--debug-text`: write normalized text dumps to `<source>/_debug_text/` for troubleshooting.
- `--use-txt`: read `.txt` files instead of `.pdf` (useful for tests and fixtures).

Testing patterns (Jest)
- Mock `utils/pdf.parsePdf` for deterministic unit tests.
- Prefer round, fake numbers (no real income) and simple dates.
- CLI tests: use `spawnSync(process.execPath, [cliPath, srcDir, '--use-txt'])` and write synthetic `.txt` fixtures in a temp directory.
- Assert the CSV header plus at least one data row; allow integer or two-decimal outputs.

Privacy and safety
- Do not include real income values in tests, fixtures, or documentation. Use sanitized/round numbers.
- Keep parsing logic in small, testable functions; avoid coupling I/O to parsing.


