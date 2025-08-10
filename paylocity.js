"use strict";

/**
 * Paylocity Paycheck Folder → CSV
 *
 * Usage:
 *   node paylocity.js <source-folder> [--out <file.csv>]
 *
 * Scans the folder for .pdf files, parses each with pdf-parse, extracts key fields,
 * and writes a single CSV with one row per paycheck.
 */

const fs = require("fs");
const path = require("path");
const { parsePdf } = require("./utils");
const { writeFile, ensureDir } = require("./utils");
const { parsePaylocityPaystub, normalizeText } = require("./utils/paylocity/parser");

function printHelp() {
  console.log(`
Usage: node paylocity.js <source-folder> [--out <file.csv>] [--glob <pattern>]

Options:
  --out <file.csv>   Destination CSV path. Default: <source-folder>/paychecks.csv
  --glob <pattern>   Only include PDFs whose filename contains this substring (case-insensitive)
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
      return useTxt ? lower.endsWith('.txt') : lower.endsWith('.pdf');
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
    "File",
    "Pay Date",
    "Period Start",
    "Period End",
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

function recordToRow(filePath, record) {
  return [
    path.basename(filePath),
    record.payDate,
    record.periodStart,
    record.periodEnd,
    record.grossPay,
    record.netPay,
    record.totalTaxes,
    record.totalDeductions,
    record.federalIncomeTax,
    record.stateIncomeTax,
    record.socialSecurity,
    record.medicare,
  ]
    .map(toCsvValue)
    .join(",");
}

async function parseOnePdf(filePath, debugDir, useTxt) {
  let rawText;
  if (useTxt) {
    rawText = fs.readFileSync(filePath, 'utf8');
  } else {
    rawText = await parsePdf(filePath);
  }
  if (debugDir) {
    const base = path.basename(filePath, path.extname(filePath));
    const out = path.join(debugDir, `${base}.txt`);
    writeFile(out, normalizeText(rawText));
  }
  return parsePaylocityPaystub(rawText);
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
  if (!outCsv) {
    outCsv = path.join(sourceDir, "paychecks.csv");
  }

  let nameFilter = null;
  const globIdx = rawArgs.indexOf("--glob");
  if (globIdx !== -1) {
    const val = rawArgs[globIdx + 1];
    if (val && !val.startsWith("--")) nameFilter = val.toLowerCase();
  }

  const useTxt = rawArgs.includes("--use-txt") || process.env.PAYLOCITY_TEST_USE_TXT === '1';
  const inputFiles = listInputFilesInDir(sourceDir, useTxt).filter((p) =>
    nameFilter ? path.basename(p).toLowerCase().includes(nameFilter) : true
  );
  if (inputFiles.length === 0) {
    console.error("No PDF files found in source folder.");
    process.exit(1);
  }

  const header = buildHeaderRow();
  const rows = [header];

  // Optional debug text dump
  const debugDir = rawArgs.includes("--debug-text") ? path.join(sourceDir, "_debug_text") : null;
  if (debugDir) ensureDir(debugDir);

  for (const filePath of inputFiles) {
    try {
      const record = await parseOnePdf(filePath, debugDir, useTxt);
      rows.push(recordToRow(filePath, record));
      console.log(`Parsed: ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`Failed to parse ${filePath}:`, err.message || err);
    }
  }

  const csv = rows.join("\n") + "\n";
  ensureDir(path.dirname(outCsv));
  writeFile(outCsv, csv);
  console.log(`\nWrote ${inputFiles.length} row(s) to ${outCsv}`);
  if (debugDir) console.log(`Normalized text dumps written to ${debugDir}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}

module.exports = { main };


