## Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.1] - 2025-08-09


## [1.0.0] - 2024-xx-xx

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


