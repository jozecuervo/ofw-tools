## OFW Tools: Divorce and Communication Analysis Toolkit

### ⚠️ IMPORTANT LEGAL DISCLAIMER

**This toolkit is for educational and calculation purposes only and does not constitute legal advice.** Property division, family law issues, and communication analysis involve complex legal and factual determinations that vary by jurisdiction and individual circumstances. Always consult with a qualified family law attorney before making decisions based on these calculations or analysis. The tools do not account for many factors that may affect legal outcomes, including transmutations, agreements, refinances, improvements, or other legal doctrines.

### Overview

Local-first Node.js CLIs that streamline common family-law workflows. These tools help you quickly analyze communications, generate calendars, compute property/equity figures, and now parse paychecks — all on your machine for privacy and speed. Outputs favor simple formats (CSV/Markdown/JSON) that drop easily into exhibits or spreadsheets.

What’s included:
- Messages and evidence prep
  - OFW Messages PDF → JSON/CSV summaries with weekly stats and console Markdown
  - iMessage text export → per-year JSON with sentiment metrics
- Scheduling and analysis
  - Visitation calendar helper with court-style week logic and annotated grids
  - Fifth-week analyzer to quantify months with “5th” occurrences of anchor weekdays
- Property and finance calculators
  - Moore/Marsden worksheet and apportionment/buyout with credits (Watts/Epstein/fees)
  - **DissoMaster spousal support calculator** with tax calculations and duration guidelines
- Payroll parsing
  - Paylocity paycheck PDFs → single CSV (one row per paycheck) with robust field extraction

Design principles:
- Fast, private, and offline by default (no external services)
- Vanilla JavaScript, clear CLIs, and predictable file outputs
- Small, testable modules with focused responsibility

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
- **DissoMaster spousal support calculator**: `npm run dissomaster`
- iMessage parser with sentiment: `npm run imessage -- /absolute/path/to/imessage.txt`
- Paylocity paychecks → CSV: `npm run paylocity -- /absolute/path/to/folder/of/pdfs`
   - Tips: `--debug-text` writes normalized text to `<source>/_debug_text/`; `--use-txt` reads `.txt` files for testing.

---

## Tools

### 1) OFW PDF Analyzer (`index.js`)

- **Purpose**: Parse an "Our Family Wizard" Messages PDF and compute weekly stats per person: messages sent/read, average read time, total words, and sentiment. Outputs JSON, Markdown to console, and CSV.
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

- **Purpose**: Compute Separate Property (SP) and Community Property (CP) interests using the classic Moore/Marsden worksheet with show‑your‑work lines and percentages.
- **Config**: Provide inputs via `source_files/moore-marsden.config.json` (gitignored) or pass `--config <path>`. If no config is provided, neutral defaults are used.
- **Output**: Console worksheet (Lines 1–13) and optional JSON via `--out-json` containing `{ inputs, worksheet }`.

#### Legal context and applicability
- **Authorities**: In re Marriage of Moore (1980) 28 Cal.3d 366; In re Marriage of Marsden (1982) 130 Cal.App.3d 426; Fam. Code §§ 760 (CP presumption), 770 (SP), 2640 (SP reimbursements).
- **What this models**: Premarital ownership with a single original acquisition loan. Community acquires a pro tanto share of appreciation during marriage based on the community’s principal reduction over the original purchase price (PP).
- **What this does not model**:
  - Joint‑title acquisitions during marriage → typically a §2640 reimbursement regime (no SP slice of appreciation absent transmutation).
  - Refinances/HELOCs/capital improvements/transmutations → out of scope for this worksheet and flagged with warnings.

#### Formulae (implemented)
- **Community share of appreciation during marriage**: \( (\text{CP principal reduction} \div \text{PP}) \times (\text{FMV@Division} - \text{FMV@Marriage}) \)
- **SP interest**: down payment + SP principal + pre‑marital appreciation + SP share of appreciation
- Only principal reduction counts in the ratio; interest, taxes, insurance, and routine maintenance are excluded.

#### Inputs (JSON fields)
- `purchasePrice` (PP)
- `downPayment`
- `paymentsWithSeparateFunds` — total SP principal reduction (includes premarital SP and any traced SP during marriage)
- Optional split SP fields: `spPrincipalPreMarriage`, `spPrincipalDuringMarriage` (if provided, they are summed into `paymentsWithSeparateFunds` for Line 3)
- `paymentsWithCommunityFunds` — CP principal reduction during marriage
- `fairMarketAtMarriage` (FMV@Marriage)
- `fairMarketAtDivision` (FMV@Division)
- Optional reconciliation inputs: `originalLoan` (L0 implied at purchase), `loanAtDivision` (L2 at valuation)
- Optional context: `acquisitionContext`: `premaritalOwner` (default) | `jointTitleDuringMarriage`

#### CLI options
- `--summary` — print only Lines 12–13 (SP/CP interests)
- `--no-explain` — hide explanatory header and citations
- `--out-json <path>` — write `{ inputs, worksheet }` JSON to the given path
- `--context <acquisitionContext>` — override `config.acquisitionContext`
- `--refi` — user hint to print an additional refinance/HELOC scope warning

#### Validations and warnings (what you’ll see and why)
- **Purchase price must be > 0**: throws if PP ≤ 0.
- **CP proportion clamp 0..1**: Moore/Marsden ratio is clamped after computing CP principal ÷ PP to avoid pathological inputs; a separate sanity warning prints if CP principal > PP.
- **Negative appreciation during marriage**: warns if `FMV@Division < FMV@Marriage`; values still compute.
- **Context warning**: if `acquisitionContext === 'jointTitleDuringMarriage'`, prints that §2640 reimbursement is the proper regime absent a transmutation.
- **Refi/HELOC scope**: warns if `--refi` is passed or `purchasePrice < downPayment` is detected.
- **Loan reconciliation (when `originalLoan` and `loanAtDivision` are provided)**:
  - Warns if provided `originalLoan` ≠ implied `PP − downPayment`.
  - Warns if equity from worksheet `(downPayment + SP principal + CP principal) + (FMV@Division − PP)` does not match `FMV@Division − loanAtDivision` within a penny — indicates possible refinance/improvements/context mismatch.

#### Example
```json
{
  "purchasePrice": 435000,
  "downPayment": 132179.18,
  "spPrincipalPreMarriage": 25696.15,
  "spPrincipalDuringMarriage": 0,
  "paymentsWithCommunityFunds": 9936.09,
  "fairMarketAtMarriage": 665000,
  "fairMarketAtDivision": 750225.81,
  "originalLoan": 302820.82,
  "loanAtDivision": 290000,
  "acquisitionContext": "premaritalOwner"
}
```

Run:
```bash
npm run moore-marsden -- --config ./source_files/moore-marsden.config.json --out-json ./output/moore-marsden.json
```

Output mapping (abbrev):
- Line 7: pre‑marital appreciation = FMV@Marriage − PP
- Line 8: appreciation during marriage = FMV@Division − FMV@Marriage
- Line 9: CP proportion = CP principal ÷ PP
- Line 10: CP share of appreciation = Line 8 × Line 9
- Line 11: SP share of appreciation = Line 8 − Line 10
- Line 12: SP Interest = Down Payment + SP Principal + Line 7 + Line 11
- Line 13: CP Interest = CP Principal + Line 10

Legal note: This worksheet is designed for the Moore/Marsden context (premarital owner, single original loan). Joint‑title acquisitions during marriage are typically handled under Fam. Code §2640 reimbursement rules. Consult counsel for refinances, HELOCs, capital improvements, or transmutation issues.

### 7) Apportionment & Buyout with Credits (`apportionment-calc.js`)

- **Purpose**: Compute SP/CP interests using a Moore/Marsden-style allocation tied to the original purchase price (PP), then apply Watts (exclusive-use) and Epstein (post‑separation principal) as separate credit ledgers. Attorney’s fees are not netted into the buyout here.
- **Config**: Provide a local config at `source_files/apportionment.config.json` (gitignored). An example is included at `source_files/apportionment.config.example.json` — copy it and edit for your case.
- **Output**: Console breakdown and computed buyout; optionally emit JSON via `--out-json`.
- **Run**:
  ```bash
  # With defaults (illustrative numbers)
  npm run apportionment

  # With your local config and JSON output
  npm run apportionment -- --config ./source_files/apportionment.config.json --out-json ./output/apportionment.json
  ```
- **Inputs** (JSON):
  - **Moore/Marsden**: `houseValueAtPurchase` (PP), `appraisedValue` (FMV), `mortgageAtPurchase` (L0), `mortgageAtSeparation` (L1), `principalPaidDuringMarriage` (Cp), `yourSeparateInterest` (Sy), `herSeparateInterest` (Sh)
  - **Epstein** (post‑sep principal): `principalPaidAfterSeparationByYou`, `principalPaidAfterSeparationByHer`
  - **Watts** (exclusive use): `fairMonthlyRentalValue`, `monthsSinceSeparation`, `occupant` ('you'|'her')
  - **Watts offsets**: `monthlyMortgageInterest`, `monthlyPropertyTaxes`, `monthlyInsurance`, `monthlyNecessaryRepairs`
  - **Acquisition context**: `acquisitionContext` one of:
    - `premaritalOwner` (default): classic Moore/Marsden allocation; appreciation allocated by PP denominator across CP and traceable SP buckets.
    - `jointTitleDuringMarriage`: §2640 regime — reimburse traceable SP contributions dollar‑for‑dollar (down payment, SP principal, SP improvements); all appreciation/remainder equity treated as CP absent transmutation.
    - `separateTitleDuringMarriage`: treat like Moore/Marsden unless you have a written transmutation; fact‑specific.
  - **Improvements (optional)**: `cpImpr`, `spImprYou`, `spImprHer`. For simple use, they’re added to CP/SP buckets. For larger capital improvements, consult counsel about basis adjustments.
- **Notes**:
  - CP share of appreciation during marriage is computed as (CP principal reduction ÷ PP) × (FMV − PP). Separate interests get analogous shares using Sy and Sh over PP.
  - Post‑separation principal is treated as Epstein reimbursement to the paying spouse; it is not converted into an equity “share.”
  - Watts is modeled as ½ FRV × months, net of carrying‑cost offsets paid by the occupant; applied after property interests.
  - Data integrity checks: warns if `Cp` differs from `L0 − L1`, throws if PP ≤ 0, and warns if baseline equity doesn’t match `FMV − L2` within a penny.
#### Enhanced Features:
- **Input Validation**: Comprehensive validation with granular error messages and recovery suggestions
- **Dry Run Mode**: Use `--dry-run` to validate inputs without performing calculations
- **Enhanced Error Handling**: Detailed warnings for edge cases like negative appreciation, refinancing complications, and bucket sum mismatches
- **Metadata Output**: Results include regime explanation and calculation details
- **Edge Case Support**: Handles negative appreciation, zero appreciation, and complex scenarios with appropriate warnings

#### New CLI Options:
```bash
# Dry run validation
npm run apportionment -- --config ./config.json --dry-run

# Skip input validation (not recommended)
npm run apportionment -- --no-validate

# Enhanced help with edge case documentation
npm run apportionment -- --help
```

### 8) Comprehensive Mocks and Testing (`mocks/` folder)

- **Purpose**: Comprehensive testing and demo data for the apportionment system, including Moore/Marsden and Family Code §2640 scenarios
- **Structure**:
  - `mocks/data/`: Sample property data files for different legal regimes and edge cases
  - `mocks/demos/`: Interactive demo scripts and educational walkthroughs  
  - `mocks/fixtures/`: Test data for boundary conditions and performance testing
  - `mocks/docs/`: Annotated examples and scenario explanations
- **Quick Start**:
  ```bash
  # Interactive regime comparison demo
  node ./mocks/demos/regime-comparison.js
  
  # Step-by-step Moore/Marsden educational walkthrough
  node ./mocks/demos/step-by-step-walkthrough.js
  
  # Test with sample Moore/Marsden data
  npm run apportionment -- --config ./mocks/data/moore-marsden-basic.json
  
  # Test with Family Code §2640 scenario
  npm run apportionment -- --config ./mocks/data/section-2640-basic.json
  
  # Test edge case: negative appreciation
  npm run apportionment -- --config ./mocks/data/edge-case-negative-appreciation.json --dry-run
  ```
- **Educational Value**: Each mock scenario includes legal citations, factual assumptions, expected results, and limitations
- **Legal Context**: All scenarios include disclaimers and appropriate case law references

### 8) DissoMaster Spousal Support Calculator (`dissomaster.js`)

- **Purpose**: Calculate California guideline spousal support using DissoMaster methodology with comprehensive tax calculations and duration guidelines.
- **Features**:
  - Basic DissoMaster formula: 40% of income gap minus 50% of child support
  - Full tax calculations (Federal, CA state, payroll taxes)
  - Support duration guidelines based on marriage length
  - Payment schedules with step-down provisions
  - Input validation and comprehensive disclaimers
- **Config**: You can supply a local config at `source_files/dissomaster.config.json` (gitignored) or pass `--config <path>`.
- **Output**: Console breakdown with income analysis, support calculation, duration analysis, and optional payment schedule.
- **Run**:
  ```bash
  # With defaults (illustrative numbers)
  npm run dissomaster

  # With duration analysis and payment schedule
  npm run dissomaster -- --duration --schedule

  # Summary mode only
  npm run dissomaster -- --summary

  # With your local config and JSON output
  npm run dissomaster -- --config ./source_files/dissomaster.config.json --out-json ./output/dissomaster.json
  ```
- **Important**: This calculator provides estimates only for educational purposes. Results should NOT replace certified DissoMaster software or professional legal counsel. Actual support awards are subject to court discretion and many factors not captured in simplified calculations.
- **Citations**: Family Code §§ 4320 (support factors), 4325 (temporary support), DissoMaster methodology.

### 9) Paylocity Paychecks → CSV (`paylocity.js`)

- **Purpose**: Scan a folder of Paylocity paycheck PDFs and produce a single CSV with one row per paycheck. Then, generate a summary CSV with monthly gross analysis, using the 26/12 method.
- **Input**: Path to a folder containing `.pdf` paystubs exported from Paylocity.
- **Output**: 
  - Raw data `output/paychecks.csv` by default; override with `--out <file.csv>`.
  - Monthly gross analysis: `output/monthly-gross-analysis.csv`
- **Run**:
  ```bash
  npm run paylocity -- /absolute/path/to/paystubs
  npm run paylocity -- /absolute/path/to/paystubs -- --out /absolute/path/to/output/paychecks.csv
  npm run paylocity -- /absolute/path/to/paystubs -- --glob 2025   # only files with '2025' in name
  ```
- **Columns**: `File, Pay Date, Period Start, Period End, Gross Pay, Net Pay, Total Taxes, Total Deductions, Federal Income Tax, State Income Tax, Social Security, Medicare`.
- **Notes**: Parser is resilient to minor label shifts (e.g., "Pay Date" vs. "Check Date"; "Pay Period" range or separate Begin/End). Missing values are left blank.

---

## Shared Utilities

### `utils/date.js`
Reusable date/time helpers used across tools:
- Constants: `weekdayNames`, `nameToOrdinal`
- Month/day: `daysInMonth`, `getNthOccurrenceDate`, `getFifthOccurrenceDate`
- Visitation helpers: `getFirstAnchorOfMonth`, `getFirstWeekStart`
- Formatters: `formatDateMMMddYYYY`, `formatDateMMDDYYYY`, `formatTimeHHMM`
- OFW-specific: `getWeekString` (Sun–Sat), `parseDate` (MM/DD/YYYY hh:mm AM/PM), `formatDate`

Import example:
```js
const { getFifthOccurrenceDate, formatDateMMMddYYYY } = require('./utils/date');
```

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
