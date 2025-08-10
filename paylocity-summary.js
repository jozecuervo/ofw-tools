"use strict";

/**
 * Paylocity Print Check History Summary → CSV
 *
 * Usage:
 *   node paylocity-summary.js <source-folder> [--out <file.csv>]
 *
 * Scans the folder for .pdf (or paired .txt with --use-txt), parses the summary table,
 * and writes a CSV with one row per paycheck summary line.
 */

const fs = require("fs");
const path = require("path");
const { parsePdf } = require("./utils/pdf");
const { writeFile, ensureDir } = require("./utils");
const { parsePaylocitySummary } = require("./utils/paylocity/summary");

function printHelp() {
  console.log(`
Usage: node paylocity-summary.js <source-folder> [--out <file.csv>] [--glob <pattern>]

Options:
  --out <file.csv>   Destination CSV path. Default: ./output/paychecks_summary.csv
  --glob <pattern>   Only include files whose filename contains this substring (case-insensitive)
  --use-txt          Read paired .txt files instead of PDFs (testing)
  -h, --help         Show this help
`);
}

function listInputFilesInDir(dirPath, useTxt) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.join(dirPath, e.name))
    .filter((p) => {
      const lower = p.toLowerCase();
      return useTxt ? lower.endsWith(".txt") : lower.endsWith(".pdf");
    })
    .sort();
}

function toCsvValue(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildHeaderRow() {
  return [
    "Source",
    "Check Date",
    "Gross Pay",
    "Net Pay",
    "Total Taxes",
    "Total Deductions",
    "Federal Income Tax",
    "State Income Tax",
    "Social Security",
    "Medicare",
  ].join(",");
}

function recordToRow(source, record) {
  const values = [
    path.basename(source),
    record.checkDate,
    record.grossPay != null ? record.grossPay.toFixed(2) : "",
    record.netPay != null ? record.netPay.toFixed(2) : "",
    record.totalTaxes != null ? record.totalTaxes.toFixed(2) : "",
    record.totalDeductions != null ? record.totalDeductions.toFixed(2) : "",
    record.federalIncomeTax != null ? record.federalIncomeTax.toFixed(2) : "",
    record.stateIncomeTax != null ? record.stateIncomeTax.toFixed(2) : "",
    record.socialSecurity != null ? record.socialSecurity.toFixed(2) : "",
    record.medicare != null ? record.medicare.toFixed(2) : "",
  ];
  return values.map(toCsvValue).join(",");
}

async function parseOneFile(filePath, useTxt) {
  if (useTxt) {
    const rawText = fs.readFileSync(filePath, "utf8");
    return parsePaylocitySummary(rawText);
  }
  const rawText = await parsePdf(filePath);
  return parsePaylocitySummary(rawText);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes("-h") || rawArgs.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  if (rawArgs.length === 0) {
    printHelp();
    process.exit(1);
  }

  const sourceDir = path.resolve(rawArgs[0]);
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    console.error(`Source folder not found or not a directory: ${sourceDir}`);
    process.exit(1);
  }

  let outCsv = null;
  const outIdx = rawArgs.indexOf("--out");
  if (outIdx !== -1) {
    const val = rawArgs[outIdx + 1];
    if (val && !val.startsWith("--")) outCsv = path.resolve(val);
  }
  if (!outCsv) outCsv = path.resolve(process.cwd(), "output", "paychecks_summary.csv");

  let nameFilter = null;
  const globIdx = rawArgs.indexOf("--glob");
  if (globIdx !== -1) {
    const val = rawArgs[globIdx + 1];
    if (val && !val.startsWith("--")) nameFilter = val.toLowerCase();
  }

  const useTxt = rawArgs.includes("--use-txt") || process.env.PAYLOCITY_TEST_USE_TXT === "1";
  const inputFiles = listInputFilesInDir(sourceDir, useTxt).filter((p) =>
    nameFilter ? path.basename(p).toLowerCase().includes(nameFilter) : true
  );
  if (inputFiles.length === 0) {
    console.error("No input files found in source folder.");
    process.exit(1);
  }

  const rows = [buildHeaderRow()];
  for (const filePath of inputFiles) {
    try {
      const records = await parseOneFile(filePath, useTxt);
      for (const r of records) {
        rows.push(recordToRow(filePath, r));
      }
    } catch (err) {
      console.error(`Failed to parse ${filePath}:`, err.message || err);
    }
  }

  const csv = rows.join("\n") + "\n";
  ensureDir(path.dirname(outCsv));
  writeFile(outCsv, csv);
  console.log(`Wrote ${rows.length - 1} row(s) to ${outCsv}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}

module.exports = { main };


