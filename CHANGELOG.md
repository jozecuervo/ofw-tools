## Changelog

All notable changes to this project will be documented in this file.	

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.11.0] - 2025-08-15

PR: [#19](https://github.com/jozecuervo/ofw-tools/pull/19)

### Added
- Optional Ollama-based LLM sentiment post-processing for OFW analysis:
  - New flag `--ollama` on `ofw.js` to re-process the generated JSON with a local LLM
  - New module `ollama-sentiment.js` implementing context-aware sentiment with limited thread context (default 3 prior messages)
  - Outputs written alongside the original JSON in `./output/`:
    - `<report> - LLM processed.json` (adds `sentiment_ollama` per message)
    - `<report> - summary.md` (thread summaries with per-message sentiments and overall counts)
- NPM script: `ofw:analyze-ollama` → `node ofw.js --ollama`

### Changed
- CLI help updated to document `--ollama`
- CLI argument parsing made order-agnostic for input file (first non-flag token)

### Dependencies
- Added `ollama`, `fs-extra`, and `winston`

### Notes
- Requires a local Ollama server and model: `ollama pull llama3.1` and `ollama serve`
- CommonJS import uses the ESM default export: `const { default: ollama } = require('ollama')`

## [1.10.0] - 2025-08-15

### Added
- OFW threading and summaries:
  - Subject-based thread assignment with normalization (strips Re/Fwd, brackets) and participant keying
  - Inactivity-based splitting: start a new thread segment when gap > 30 days; `threadKey` gets `#<segment>` suffix
  - Per-message fields: `threadId`, `threadKey`, `threadIndex`
  - Thread statistics computed in aggregator and exposed as `threadStats` (global and per-week)
  - Weekly Markdown now includes a per-week summary row with “Threads” and “Avg Thread”
  - Totals Markdown includes an in-table totals row and an all-time thread summary (total threads, average length)
  - New Thread Tree Markdown output: `<report>.threads.md` with ASCII branch listing per message
  - New Threads CSV output: `<report>-threads.csv` (Thread ID, Key, Subject, Messages, First/Last Sent, Span Days, Participants, Words, Avg Sentiment, Tone)
    - Timestamps formatted as local `YYYY-MM-DD HH:MM`
    - CSV cells escaped per RFC 4180

### Changed
- Read-time units computed in hours at aggregation time
- Weekly senders CSV renamed to `<report>-senders.csv`
- Top2 comparison CSV renamed to `<report>-top2-comparison.csv`

### Tests
- Added unit tests for thread assignment, inactivity split, thread tree, and threads CSV

## [1.9.0] - 2025-08-12

PR: [#17](https://github.com/jozecuervo/ofw-tools/pull/13)

### Changed
- DRY and pipeline updates for OFW:
  - Moved week-range parsing and ISO helpers to `utils/date.js` (`parseWeekLabelToStartEnd`, `toISODate`).
  - CSV Top2 header standardized to start with `Week Start,Sent …`.
  - Removed duplicate message template in `ofw.js`; `writeMarkDownFile` now uses `formatMessageMarkdown`.
  - Introduced generic CSV writer `outputCsvWith()` used for weekly and Top2 outputs.
  - Centralized name filtering via `createNameFilter()` reused by totals/weekly Markdown.
  - Sentiment computation moved from parser to metrics; `computeDerivedMetrics` always computes from message body.

## [1.8.0] - 2025-08-11

PR: [#16](https://github.com/jozecuervo/ofw-tools/pull/16)

### Added
- `formatWeeklyTop2Csv` function to output CSV for the top 2 senders across all weeks.
- `computeTone` function to compute a normalized tone value between the two sentiment libraries.
- `formatWeeklyCsv` function to output all CSV data across all weeks.
- `formatWeeklyTop2Csv` function to output CSV for the top 2 senders across all weeks.

## [1.7.0] - 2025-08-10

PR: [#15](https://github.com/jozecuervo/ofw-tools/pull/15)

### Changed
- Paylocity tools now conform to repo conventions:
  - Default CSV outputs to `./output/` when `--out` is not provided
  - Monthly analysis file name is derived from the main CSV as `<name>_monthly.csv` (e.g., `paychecks_monthly.csv`)
  - Aggregates multiple records for the same pay date before analysis to prevent duplicate-period rows
  - Trailing 12-month average computed over a true 12-month window with small-entry filtering to avoid skew (e.g., reimbursements)
- Tests updated to reflect default output path and aggregation behavior

### Documentation
- README updated for Paylocity usage, defaults, and legal context
  - Notes tie monthly (26/12) conversion to FL-150 reporting practices
  - References to California Family Code §§ 4055, 4058, 4059 where relevant

## [1.6.0] - 2025-08-10

PR: [#13](https://github.com/jozecuervo/ofw-tools/pull/13)

### Added
- **DissoMaster Calculator**: Comprehensive California spousal support calculator with CLI interface (`dissomaster.js`)
  - Core spousal support calculation using DissoMaster methodology (40% of income gap minus 50% of child support)
  - Tax calculations: Federal and California state tax calculations using 2024 tax brackets and rates
  - Duration guidelines: Support duration recommendations based on California marriage length guidelines
  - Payment schedules: Generated payment schedules with step-down provisions for medium-term marriages
  - CLI options: `--config`, `--out-json`, `--summary`, `--no-explain`, `--duration`, `--schedule`
- **DissoMaster utilities**: Modular calculation engine in `utils/dissomaster/`
  - `calculator.js`: Core spousal support and net income calculations
  - `tax-calculator.js`: Federal/CA tax calculations with 2024 brackets
  - `duration-calculator.js`: Marriage length-based duration guidelines
  - `validation.js`: Comprehensive input validation
- **npm script**: `npm run dissomaster` for easy CLI access
- **Unit tests**: 12 comprehensive test cases in `__tests__/dissomaster.test.js` (all passing)

### Fixed
- **OFW output utilities**: Resolved missing `utils/output/markdown.js` and `utils/output/csv.js` files
  - `formatMessageMarkdown`: Formats individual messages for markdown output
  - `formatTotalsMarkdown`: Creates markdown tables for total statistics
  - `formatWeeklyMarkdown`: Creates markdown tables for weekly statistics
  - `formatWeeklyCsv`: Generates CSV output for weekly statistics
- **Test coverage**: Fixed failing tests in `__tests__/ofw-output.test.js` and `__tests__/ofw-index.test.js`

### Legal Compliance
- **Disclaimers**: Comprehensive legal disclaimers emphasizing educational use only
- **Professional guidance**: Clear warnings about need for certified DissoMaster software and legal counsel
- **Tax accuracy**: Simplified tax calculations with recommendations for professional tax advice

## [1.5.0] - 2025-08-10

PR: [#11](https://github.com/jozecuervo/ofw-tools/pull/11)

### Added
- Apportionment calculator: regime switch between Moore/Marsden and §2640 (joint title during marriage) via `acquisitionContext`.
- Separate Watts/Epstein ledgers applied after property interests; added FRV offsets and occupant handling.
- Integrity checks: warn when `Cp ≠ L0 − L1`, throw if `PP ≤ 0`, warn when baseline sum ≠ `FMV − L2`.

### Changed
- Moore/Marsden computation: orthodox per-PP appreciation allocation for each bucket (CP, Sy, Sh).
- §2640 branch: clamp negative CP equity to zero with warning; large SP reimbursements sanity warning.
- README updated with inputs (`acquisitionContext`, improvements), regime notes, and examples.

### Tests
- New unit tests for apportionment MM/credits and §2640 branch; all suites green.

## [1.4.1] - 2025-08-10

PR: [#10](https://github.com/jozecuervo/ofw-tools/pull/10)

### Changed
- Move OFW PDF Analyzer CLI from `index.js` to `ofw.js`.
- Add `runCli()` export for testability and reuse.
- Keep `index.js` as a thin wrapper delegating to `ofw.js` and re-exporting internals.
- No behavior changes; existing npm scripts and `main` continue to work. All tests green.

## [1.4.0] - 2025-08-10

PR: [#8](https://github.com/jozecuervo/ofw-tools/pull/8)

### Added
- Paylocity paychecks → CSV CLI (`paylocity.js`) and parser (`utils/paylocity/parser.js`): scan a folder of Paylocity paycheck PDFs and produce a single CSV (one row per paycheck).
- `--debug-text` flag: writes normalized PDF text to `<source>/_debug_text/` for troubleshooting.

### Changed
- Parser robustness: handles month-name dates (e.g., "August 1, 2025"), numeric dates anywhere in line, "Period Beginning/Ending" labels, negative/parentheses amounts, compact tax-line formats (FIT/SS/MED), and line-wrapped labels.
- README updated with usage and options for the new tool.

### Scripts
- `npm run paylocity` wired to `node paylocity.js`.

### Tests
- Existing suites remain green (no regressions).

## [1.3.0] - 2025-08-10

PR: [#7](https://github.com/jozecuervo/ofw-tools/pull/7)

### Added
- Utilities split for maintainability and testing:
  - `utils/pdf.js`: low-level PDF text extraction (`parsePdf`).
  - `utils/ofw/parser.js`: `parseMessage`, `processMessages`.
  - `utils/ofw/stats.js`: `accumulateStats` (weekly/totals aggregation).
  - `utils/ofw/clusters.js`: `analyzeRapidFireMessages`.
  - `utils/output/markdown.js`, `utils/output/csv.js`: pure string formatters.
  - `utils/fs.js`: `ensureDir`, `writeFile`, `writeJson` for centralized file I/O.
- New unit tests (pure and fast):
  - `__tests__/ofw-parser.test.js`, `__tests__/ofw-stats.test.js`, `__tests__/ofw-output.test.js`, `__tests__/ofw-clusters.test.js`, `__tests__/fs-utils.test.js`.

### Changed
- `index.js` now delegates parsing, stats, and output to new utils; behavior unchanged.
- `message-volume.js` imports clusters util and enforces JSON input (use `ofw:analyze` first).
- `imessage.js` moves CLI parsing under `require.main` to avoid `process.exit` on import in tests.
- Minor fix in `visitation-cal.js` wrapper functions (syntax/brace closure).
- Centralized file writes across scripts via `utils/fs.js`.

### Tests
- All suites green (10/10): adds coverage for parser, stats, output, clusters, and fs helpers.

## [1.2.1] - 2025-08-10

PR: [#6](https://github.com/jozecuervo/ofw-tools/pull/6)

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

## [1.2.0] - 2025-08-09

PR: [#5](https://github.com/jozecuervo/ofw-tools/pull/5)

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


## [1.1.1] - 2025-08-09

PR: [#4](https://github.com/jozecuervo/ofw-tools/pull/4)

### OFW PDF Analyzer (`index.js`)
- Removed hard-coded recipient ignores; visibility is now controlled solely via `--exclude <csv>` patterns.
- Skips non-message placeholder rows (e.g., page banners) during aggregation to prevent entries like "OFW Report" from appearing in totals and weekly tables.

### Documentation
- Minor description/overview tweaks to clarify project scope.

## [1.1.0] - 2025-08-09

PR: [#3](https://github.com/jozecuervo/ofw-tools/pull/3)

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
- Anchor-based Week 1 (`--anchor <weekday>`, default Friday); calendar grid showing V (weekend) and V/Z (Wednesday visit/Zoom).
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

PR: [#2](https://github.com/jozecuervo/ofw-tools/pull/2)

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

PR: [#1](https://github.com/jozecuervo/ofw-tools/pull/1)

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

