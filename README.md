## OFW Tools: Divorce and Communication Analysis Toolkit

### Overview

This repository contains a set of small, focused tools that help analyze communications, plan visitation schedules, and perform basic family-law-related calculations (Moore/Marsden, apportionment). These are optimized for quick, local use as you prepare materials for court.

### Quick Start

- **Requirements**: Node.js (use your local `nvm` setup)
- **Install**:
  ```bash
  cd ~/projects/ofw-tools
  source ~/.nvm/nvm.sh && nvm use
  npm install
  ```

### Run Commands (npm scripts)

Pass arguments after `--`.

- Analyze OFW PDF: `npm run ofw:analyze -- /absolute/path/to/OFW_Messages_Report.pdf`
- Rapid-fire clusters from JSON: `npm run ofw:clusters -- /absolute/path/to/OFW_Messages_Report.json`
- Visitation calendar (YYYY MM): `npm run visitation -- 2024 4`
- Fifth-week counter (built-in examples): `npm run nth-week`
- Moore/Marsden calculation (example values): `npm run moore-marsden`
- Apportionment & buyout calculator (example values): `npm run apportionment`
- iMessage parser with sentiment: `npm run imessage -- /absolute/path/to/imessage.txt`

---

## Tools

### 1) OFW PDF Analyzer (`index.js`)

- **Purpose**: Parse an Our Family Wizard Messages PDF and compute weekly stats per person: messages sent/read, average read time, total words, and sentiment. Outputs JSON, Markdown to console, and CSV.
- **Input**: Path to an OFW messages PDF (export with full pages per message). Supports both legacy (metadata after body) and new (metadata at head; values on next line) formats.
- **Output**:
  - `same-directory/<basename>.json` (parsed messages)
  - `same-directory/<basename>.csv` (weekly stats)
  - Markdown tables printed to console
- **Run**:
  ```bash
  npm run ofw:analyze -- /absolute/path/to/OFW_Messages_Report_2025-03-04.pdf
  ```
- **Options**:
  - `--no-markdown`: Skip writing per-message Markdown file
  - `--no-csv`: Skip writing weekly CSV
  - `--exclude <csv>`: Hide names containing any of the given substrings (case-insensitive) in printed tables
- **Display**:
  - “To:” pseudo-rows (recipient read-time buckets) are hidden in tables but still used for read-time stats.
  - Avg sentiment prints 0.00 when no messages were sent for that row/week.
  - Page banners and footers are excluded from message bodies.

### 2) Rapid-Fire Message Clusters (`message-volume.js`)
- **Purpose**: From the JSON produced by the OFW PDF Analyzer, find clusters of back-to-back messages within a time threshold (default 30 minutes) for a given sender.
- **Defaults**: Looks for sender "José Hernandez" and prints clusters of 3+ messages.
- **Input**: Path to the JSON file (e.g., `OFW_Messages_Report_2025-03-04_12-04-15.json`).
- **Output**: Console summary lines and a compact ASCII visualization.
- **Run**:
  ```bash
  npm run ofw:clusters -- /absolute/path/to/OFW_Messages_Report_2025-03-04_12-04-15.json
  ```
- **Flags**:
  - `--sender "Name"` (default: "José Hernandez")
  - `--threshold-min <minutes>` (default: 30)
  - `--min-messages <n>` (default: 3)

### 3) Visitation Calendar Helper (`visitation-cal.js`)

- **Purpose**: Court-style month view where Week 1 is the first calendar week (Sun–Sat) containing the anchor weekday (default: Friday). Labels Wednesday activities (1st/3rd Visit, 2nd/4th Zoom) and weekend visits (2nd/4th).
- **Input**: Year and month (numeric).
- **Output**: Console list of week ranges with Wednesday/Weekend details; optional ASCII calendar grid with annotations (V: visit, Z: zoom).
- **Run**:
  ```bash
  npm run visitation -- 2024 4
  npm run visitation -- 2024 4 -- --anchor Saturday   # anchor Week 1 on Saturdays
  npm run visitation -- 2024 4 -- --grid              # include annotated calendar grid
  ```

### 4) Fifth-Week Counter (`nth-week.js`)

- **Purpose**: Quantify how often a month has a “5th week” under common court-style definitions.
  - Definition used: Week 1 is the first week that contains the anchor day(s) (e.g., Friday/Saturday). A month has a “5th week” if it contains 5 such anchor days in that month.
- **Defaults**: Counts Friday (5) and Saturday (6) for current year through current year + 18. Prints all dates and a per-year summary by default.
- **Run**:
  ```bash
  npm run nth-week
  ```
- **Options** (optional; pass flags after `--` with npm):
  - `--start <year>` and `--end <year>`: Year range (inclusive). Defaults: start = current year; end = start + 18.
  - `--weekday <0-6|csv>`: Weekday ordinal(s) (0=Sun … 6=Sat)
  - `--anchor <name[,name]>`: Named weekday(s), e.g. `Friday` or `Friday,Saturday`
  - `--list`: Print each 5th-occurrence date (on by default)
  - `--per-year`: Show a yearly summary (on by default)
- **Examples**:
  ```bash
  npm run nth-week
  npm run nth-week -- --start 2024 --end 2026 --anchor Friday
  npm run nth-week -- --weekday 3 --start 2024 --end 2025
  ```

### 5) iMessage Parser with Sentiment (`imessage.js`)

- **Purpose**: Parse a text export of iMessage conversations, perform sentiment analysis, and emit per-year JSON files.
- **Input**: Path to a text export (lines grouped as timestamp → sender → content).
- **Output**: `output/imessage-export-<year>.json` by default (directory is gitignored). Override with `--out-dir`.
- **Run**:
  ```bash
  npm run imessage -- /absolute/path/to/imessage.txt
  npm run imessage -- /absolute/path/to/imessage.txt -- --out-dir ./custom_output
  ```
 - **Notes**: Uses `sentiment`, `natural`, and `polarity` libraries. Tests mock `polarity` for Jest compatibility.

### 6) Moore/Marsden Calculator (`moore-marsden.js`)

- **Purpose**: Compute Separate Property (SP) and Community Property (CP) interests using the Moore/Marsden worksheet with clear intermediate values and percentages.
- **Config**: Provide inputs via `source_files/moore-marsden.config.json` (gitignored) or pass `--config <path>`. If no config is provided, neutral defaults are used.
- **Output**: Console worksheet (lines 1–13). Optionally emit a JSON worksheet via `--out-json`.
- **Notes**:
  - Community share of appreciation during marriage is computed as (community principal reduction ÷ original purchase price) × (FMV at division − FMV at marriage).
  - Only principal reduction counts toward this ratio; do not include interest, taxes, insurance, or routine maintenance.
- **Options**:
  - `--summary`: print only the SP/CP interests (hide lines 1–11)
  - `--no-explain`: hide the explanatory header and citations
- **Run**:
  ```bash
  # With defaults (illustrative numbers)
  npm run moore-marsden

  # With your local config (gitignored by default) and JSON output
  npm run moore-marsden -- --config ./source_files/moore-marsden.config.json --out-json ./output/moore-marsden.json
  ```
 - **Citations**: Moore, Marsden; Family Code §§ 760, 770, 2640.

### 7) Apportionment & Buyout with Credits (`apportionment-calc.js`)

- **Purpose**: Pro-rata apportionment of equity (separate vs. community) and illustrative buyout calculations incorporating Watts (use) credits, Epstein reimbursements, and attorney fees.
- **Config**: You can supply a local config at `source_files/apportionment.config.json` (gitignored) or pass `--config <path>`.
- **Output**: Console breakdown and computed buyout; optional machine-readable JSON via `--out-json`.
- **Run**:
  ```bash
  # With defaults (illustrative numbers)
  npm run apportionment

  # With your local config (gitignored by default) and JSON output
  npm run apportionment -- --config ./source_files/apportionment.config.json --out-json ./output/apportionment.json
  ```
 - **Notes**: Neutral, even-number example defaults to illustrate formulas. Future enhancement: toggles for Epstein-only vs. equity allocation and FRV offsets.

---

## Data Flow and Typical Usage

1) Export OFW Messages as PDF → run `ofw:analyze` → get `<basename>.json` and `<basename>.csv`.
2) Optionally analyze rapid-fire clusters with `ofw:clusters` using the JSON from step 1.
3) Prepare calendar visuals/evidence with `visitation` or `nth-week`.
4) Run `moore-marsden` and/or `apportionment` with your numbers for property division exhibits.

## Notes and Limitations

- The OFW parser supports multiple OFW export layouts; if OFW changes formatting again, please open an issue with a sample.
- Sentiment analysis is heuristic and should be treated as supportive, not dispositive.
- Several scripts contain example inputs; update those inline for your case as needed.

## License

This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. To view a copy of this license, visit `http://creativecommons.org/licenses/by-nc-nd/4.0/` or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.

---

## AI Tooling

This repo is equipped with AI prompt files for enhanced development.

- Location: `.github/prompts/` and `.github/prompt-snippets/`.
- Usage: Copy prompts into your AI tool (e.g., GitHub Copilot Chat, Claude, Cursor) or reference them directly.
- Examples: See individual `.md` files for task-specific guidance.

You can also use these prompts to guide code generation, reviews, and testing tasks. If you have a generator tool, you may export repo-wide context to a file such as `prompts/entire-codebase.md` and keep temporary artifacts ignored by Git.

### Licensing

Prompts are governed by `PROMPTS_LICENSE.md` and may differ from the code license.
