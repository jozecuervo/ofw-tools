## 1.2.0 - 2025-08-09
- feat: add IDE-agnostic AI prompts, Divorce Navigator persona, templates, and checklists
- docs: add AI Tooling section, contributing rules for prompts, versioning, and changelog
## Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.1.1] - 2025-08-09

### OFW PDF Analyzer (`index.js`)
- Removed hard-coded recipient ignores; visibility is now controlled solely via `--exclude <csv>` patterns.
- Skips non-message placeholder rows (e.g., page banners) during aggregation to prevent entries like "OFW Report" from appearing in totals and weekly tables.

### Documentation
- Minor description/overview tweaks to clarify project scope.

## [1.1.0] - 2025-08-09

### OFW PDF Analyzer (`index.js`)
- Robust parser for both legacy “tail metadata” and new 2025 “head metadata (values on next line)” formats.
- Strict message boundary splitting on standalone lines `Message N of M` (ignores page banners like `|  Message ReportPage X of Y`).
- Body extraction excludes report banners and page footers; preserves full message count.
- CLI UX: `--no-markdown`, `--no-csv`, `--exclude <csv>` (hide names by substring, printed tables only). “To:” pseudo-rows are hidden in printouts by default.
- Sentiment/NaN handling: average sentiment prints `0.00` when no messages sent; guards against NaN/Infinity.
- Output tables improved and consistent; optional CSV/Markdown writes.
- Testability: exports limited internals for tests; CLI wrapped in `if (require.main === module)`.
- New unit test `__tests__/ofw-index.test.js` verifies strict boundary splitting and full message count.

### Fifth-Week Counter (`nth-week.js`)
- Court-style “5th week” definition clarified and documented.
- Defaults: start current year, end current year + 18; prints all dates and per-year counts by default.
- Flags: `--start`, `--end`, `--weekday`, `--anchor`, `--list`, `--per-year`.
- Analysis section with total months/years and avg/median/min/max per year.
- Performance: O(1) per-month 5th-occurrence computation via `getFifthOccurrenceDate`.
- Refactored into pure helpers and `runCli()` for testability; comprehensive JSDoc.
- Unit tests in `__tests__/nth-week.test.js` (leap years, tallies, ranges).

### Visitation Calendar (`visitation-cal.js`)
- Anchor-based Week 1 (`--anchor <weekday>`, default Friday); calendar grid showing V (weekend) and V/Z (Wed visit/Zoom).
- Monthly summaries of Wed visits/zooms and weekend visits with exact dates.
- Refactored pure functions, `runCli()`, and JSDoc.
- Unit tests in `__tests__/visitation-cal.test.js` (anchor and week alignment).

### iMessage Parser (`imessage.js`)
- Converted to CommonJS; CLI `--out-dir` (default `./output`), writes `imessage-export-<year>.json`.
- Clear CLI summary with per-year totals; JSDoc.
- Refactors: extracted `parseIMessageText`, added `summarizeGroupedMessages`, `runCli()`; exports for tests.
- Tests in `__tests__/imessage.test.js`, with `polarity` mocked for Jest compatibility.

### Message Cluster Analyzer (`message-volume.js`)
- CLI flags: `--sender`, `--threshold-min`, `--min-messages`.
- Clear headers and scaled gap visualization; improved output formatting.

### Moore/Marsden Worksheet (`moore-marsden.js`)
- Correct CP proportion formula: `CP principal / purchase price` (exclude interest/taxes/insurance).
- CLI: `--config <path>`, `--out-json <path>`, `--summary`, `--no-explain`.
- “Show your work” output with explicit formulas and SP/CP component breakdowns.
- Warnings when CP proportion exceeds 100%.
- Detailed JSDoc with legal citations (Moore, Marsden; Fam. Code §§ 760, 770, 2640).
- Unit tests `__tests__/moore-marsden.test.js` (examples and edge cases; neutral values).

### Apportionment Calculator (`apportionment-calc.js`)
- Centralized `computeApportionment` flow; neutral example defaults.
- Config-driven inputs: `--config <path>` (default `source_files/apportionment.config.json`, gitignored).
- Output: `--out-json <path>` writes detailed machine-readable results.
- JSDoc and README updates. (Further credits/equalization toggles proposed for future work.)

### Documentation & Tooling
- README massively expanded with per-tool sections, usage, defaults, and examples; notes on CP proportion and principal-only for Moore/Marsden.
- `package.json`: added per-tool npm scripts; `jest` configured; version bump.
- `.gitignore`: ignore `output/` and source config files.


## [1.0.0] - 2023-2024

### Added
- Initial toolset:
  - OFW PDF Analyzer (`index.js`) to parse OFW Message PDF exports into JSON and CSV with console Markdown summaries and basic sentiment metrics.
  - Utility helpers in `utils.js` (PDF parsing, date/format helpers, file writes).
  - Rapid-fire cluster visualizer (`message-volume.js`) over parsed JSON.
  - Visitation calendar helper (`visitation-cal.js`) listing week ranges and visit/Zoom/weekend markers.
  - Fifth-week counter (`nth-week.js`) to tally months containing a 5th occurrence of a weekday across a range.
  - Moore/Marsden worksheet calculator (`moore-marsden.js`).
  - Apportionment and buyout prototype (`apportionment-calc.js`) including Watts/Epstein/fees adjustments.
  - iMessage parser with sentiment analysis (`imessage.js`) – initial ESM version grouping messages by year.
- Project scaffolding: `package.json`, dependencies, and initial `README.md`.


