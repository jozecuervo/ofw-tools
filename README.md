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
- **Input**: Path to an OFW messages PDF (export with full pages per message).
- **Output**:
  - `same-directory/<basename>.json` (parsed messages)
  - `same-directory/<basename>.csv` (weekly stats)
  - Markdown tables printed to console
- **Run**:
  ```bash
  npm run ofw:analyze -- /absolute/path/to/OFW_Messages_Report_2025-03-04.pdf
  ```

### 2) Rapid-Fire Message Clusters (`message-volume.js`)
- **Purpose**: From the JSON produced by the OFW PDF Analyzer, find clusters of back-to-back messages within a time threshold (default 30 minutes) for a given sender.
- **Defaults**: Looks for sender "José Hernandez" and prints clusters of 3+ messages.
- **Input**: Path to the JSON file (e.g., `OFW_Messages_Report_2025-03-04_12-04-15.json`).
- **Output**: Console summary lines and a compact ASCII visualization.
- **Run**:
  ```bash
  npm run ofw:clusters -- /absolute/path/to/OFW_Messages_Report_2025-03-04_12-04-15.json
  ```
- **Note**: To analyze a different sender or change the threshold, edit `message-volume.js` variables: `senderName` and `thresholdSeconds`.

### 3) Visitation Calendar Helper (`visitation-cal.js`)

- **Purpose**: Print weekly schedule details for a given month following a pattern: 1st/3rd Wednesday in-person visits; 2nd/4th (and 5th when present) Wednesday Zoom; weekend visits on 2nd and 4th weeks.
- **Input**: Year and month (numeric).
- **Output**: Console list of week ranges and visit/Zoom/weekend details. Optionally includes a month grid (disabled by default).
- **Run**:
  ```bash
  npm run visitation -- 2024 4
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

- **Purpose**: Parse a text export of iMessage conversations, perform sentiment analysis, and write per-year JSON files.
- **Input**: Path to a text export (lines grouped as timestamp → sender → content).
- **Output**: `output_<year>.json` files written next to the script.
- **Run**:
  ```bash
  npm run imessage -- /absolute/path/to/imessage.txt
  ```
- **Note**: The script currently uses sensible defaults and example path; passing a file path via CLI is recommended.

### 6) Moore/Marsden Calculator (`moore-marsden.js`)

- **Purpose**: Compute Separate Property (SP) and Community Property (CP) interests per Moore/Marsden. Prints a worksheet with intermediate values and percentages.
- **Input**: Example numbers are embedded; edit the call at the bottom of `moore-marsden.js` to use your case values.
- **Run**:
  ```bash
  npm run moore-marsden
  ```

### 7) Apportionment & Buyout with Credits (`apportionment-calc.js`)

- **Purpose**: Pro-rata apportionment of equity (separate vs. community) and illustrative buyout calculations incorporating Watts (use) credits, Epstein reimbursements, and attorney fees.
- **Input**: Example numbers are embedded; edit the constants near the top of `apportionment-calc.js` to match your facts.
- **Output**: Console breakdown and the computed buyout amounts.
- **Run**:
  ```bash
  npm run apportionment
  ```

---

## Data Flow and Typical Usage

1) Export OFW Messages as PDF → run `ofw:analyze` → get `<basename>.json` and `<basename>.csv`.
2) Optionally analyze rapid-fire clusters with `ofw:clusters` using the JSON from step 1.
3) Prepare calendar visuals/evidence with `visitation` or `nth-week`.
4) Run `moore-marsden` and/or `apportionment` with your numbers for property division exhibits.

## Notes and Limitations

- The OFW parser expects the standard PDF export format and may break if OFW changes formatting.
- Sentiment analysis is heuristic and should be treated as supportive, not dispositive.
- Several scripts contain example inputs; update those inline for your case as needed.

## License

This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. To view a copy of this license, visit `http://creativecommons.org/licenses/by-nc-nd/4.0/` or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
