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
const { computeMonthlyAnalysis } = require("./utils/paylocity/gross-monthly-summary");

function printHelp() {
  console.log(`
Usage: node paylocity.js <source-folder> [--out <file.csv>] [--glob <pattern>]

Options:
  --out <file.csv>   Destination CSV path. Default: ./output/paychecks.csv
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
    outCsv = path.resolve(process.cwd(), "output", "paychecks.csv");
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
  const analysisInput = [];

  // Optional debug text dump
  const debugDir = rawArgs.includes("--debug-text") ? path.join(sourceDir, "_debug_text") : null;
  if (debugDir) ensureDir(debugDir);

  for (const filePath of inputFiles) {
    try {
      const record = await parseOnePdf(filePath, debugDir, useTxt);
      rows.push(recordToRow(filePath, record));
      analysisInput.push({ payDate: record.payDate, grossPay: record.grossPay, netPay: record.netPay });
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

  // Monthly 26/12 analysis CSV
  // Aggregate multiple records that fall on the same pay date to avoid duplicate rows
  function parseMMDDYYYYToDate(value) {
    if (!value || typeof value !== "string") return null;
    const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const aggregatedByPayDateMap = new Map();
  for (const r of analysisInput) {
    if (!r || !r.payDate) continue;
    const key = r.payDate;
    const existing = aggregatedByPayDateMap.get(key) || { payDate: key, grossPay: 0, netPay: 0 };
    const addGross = typeof r.grossPay === 'number' && Number.isFinite(r.grossPay) ? r.grossPay : 0;
    const addNet = typeof r.netPay === 'number' && Number.isFinite(r.netPay) ? r.netPay : 0;
    existing.grossPay = (existing.grossPay || 0) + addGross;
    existing.netPay = (existing.netPay || 0) + addNet;
    aggregatedByPayDateMap.set(key, existing);
  }
  const aggregatedByPayDate = Array.from(aggregatedByPayDateMap.values()).sort((a, b) => {
    const da = parseMMDDYYYYToDate(a.payDate);
    const db = parseMMDDYYYYToDate(b.payDate);
    if (da && db) return da - db;
    return String(a.payDate).localeCompare(String(b.payDate));
  });

  const analysis = computeMonthlyAnalysis(aggregatedByPayDate);
  const monthlyHeader = [
    "Pay Date",
    "Gross Pay",
    "Net Pay",
    "Monthly Gross (26/12)",
    "12M Trailing Avg Gross",
    "Monthly Net (26/12)",
  ].join(",");

  const monthlyRows = [monthlyHeader];
  for (const r of analysis) {
    const row = [
      r.payDate || "",
      r.grossPay != null ? r.grossPay.toFixed(2) : "",
      r.netPay != null ? r.netPay.toFixed(2) : "",
      r.monthlyGross_26_12 != null ? r.monthlyGross_26_12.toFixed(2) : "",
      r.trailingAvgGross_12M != null ? r.trailingAvgGross_12M.toFixed(2) : "",
      r.monthlyNet_26_12 != null ? r.monthlyNet_26_12.toFixed(2) : "",
    ].map(toCsvValue).join(",");
    monthlyRows.push(row);
  }

  const monthlyCsv = monthlyRows.join("\n") + "\n";
  const monthlyOutCsv = path.join(
    path.dirname(outCsv),
    path.basename(outCsv).replace(/\.csv$/i, "") + "_monthly.csv"
  );
  ensureDir(path.dirname(monthlyOutCsv));
  writeFile(monthlyOutCsv, monthlyCsv);
  console.log(`Wrote ${analysis.length} row(s) to ${monthlyOutCsv}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}

module.exports = { main };


