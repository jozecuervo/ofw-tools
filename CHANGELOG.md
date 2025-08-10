## 1.2.0 - 2025-08-09

### Added
- AI prompt structure under `.github/prompts/` and `.github/prompt-snippets/` with core prompts:
  - `general-coding.md`, `unit-testing.md`, `code-review.md`, `js-cli-tools.md`, `ofw-parsing.md`
- Divorce Navigator persona (`divorce-navigator.md`) and supporting snippets:
  - `communication-templates.md`, `document-checklists.md`
- Legal review prompt (`legal-review.md`) and escalation checklist (`legal-escalation-checklist.md`)
- Workflow guardrails requiring owner approval before commit/push
- PR template and versioning/changelog snippet
- Prompt feedback issue template and continuous-improvement guidelines
- Capability Map in `.github/copilot-instructions.md`
- Front-matter validator script (`scripts/validate-prompts.js`) and `npm run prompts:validate`
- `PROMPTS_LICENSE.md` clarifying prompt content licensing

### Changed
- Streamlined and de-duplicated prompts to reduce verbosity and token cost
- Updated `README.md` with AI Tooling section and prompts license link
- Updated `CONTRIBUTING.md` and `copilot-instructions.md` to reflect repo rules and navigation

## [1.2.1] - 2025-08-10

### Changed
- Centralized shared date helpers into `utils/date.js`:
  - `weekdayNames`, `nameToOrdinal`, `daysInMonth`, `getNthOccurrenceDate`, `getFifthOccurrenceDate`
  - Visitation helpers: `getFirstAnchorOfMonth`, `getFirstWeekStart`
  - Formatters: `formatDateMMMddYYYY`, `formatDateMMDDYYYY`, `formatTimeHHMM`
  - OFW-specific helpers: `getWeekString` (Sun–Sat), `parseDate` (MM/DD/YYYY hh:mm AM/PM), `formatDate`
- Refactored consumers to use shared helpers:
  - `message-volume.js` now imports date formatters from `utils/date.js`
  - `nth-week.js` imports `daysInMonth`, `getFifthOccurrenceDate`, `weekdayNames`, `nameToOrdinal`
  - `visitation-cal.js` imports `weekdayNames`, `nameToOrdinal`, `getFirstAnchorOfMonth`, `getFirstWeekStart`
  - `utils.js` delegates `getWeekString`, `parseDate`, `formatDate` to `utils/date.js`
- Removed `moment` usage from code and dependency list in `package.json`

### Tests
- All affected unit tests run green: `nth-week`, `visitation-cal`, `imessage`, `moore-marsden`, and OFW parser boundary test.

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


## [0.9.0] - 2024-04-08

### Added
- Fifth-week utilities: tally months with a 5th occurrence of a weekday over a range.

### Changed
- Documentation improvements around fifth-week calculations and usage.

## [0.8.0] - 2024-04-03

### Added
- Visitation calendar calculator with ASCII rendering.

### Changed
- Output formatting and headers for clarity.

## [0.7.0] - 2024-02-14

### Added
- Formatted Markdown output containing all messages.
- Summary lines for totals/averages in Markdown output.

### Changed
- Message template cleanup; merged improvements from PRs #1 and #2.

## [0.6.1] - 2023-12-31

### Changed
- Revert Markdown view-time units back to minutes for consistency.

## [0.6.0] - 2023-11-26

### Added
- iMessage parser with sentiment (polarity), writing per-year JSON files.

### Changed
- Flattened sentiment scores into message objects; computed average sentiment.
- Output sentiment with consistent formatting.

## [0.5.0] - 2023-11-16

### Added
- Word count calculation for messages; included in Markdown table and CSV output.
- README with initial usage instructions.

### Changed
- Output both total and average view times in Markdown.
- Sort persons by name before output for stable ordering.

## [0.4.0] - 2023-11-04

### Fixed
- Message body parsing bug (page 2+ truncation and body joins).

### Changed
- Cleaned up Markdown table output and formatting.

## [0.3.0] - 2023-10-18

### Added
- CSV export enabled by default.
- CLI accepts input file path and derives output directory/name.

### Changed
- Added JSDoc and error handling to parsing functions.

## [0.1.0] - 2023-10-17

### Added
- Initial commit of `ofw-tools` with OFW message parsing basics.
- `.gitignore` and initial CSV/Markdown output pipeline.

