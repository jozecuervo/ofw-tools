"use strict";

const { normalizeText, parseMoneyStringToNumber } = require("./parser");

function monthNameToNumber(name) {
  const map = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  const n = map[(name || '').toLowerCase()];
  return n || null;
}

function formatMMDDYYYY(month, day, year) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${mm}/${dd}/${year}`;
}

function toMMDDYYYY(dateStr) {
  if (!dateStr) return null;
  const m1 = dateStr.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (m1) {
    const m = monthNameToNumber(m1[1]);
    if (m) return formatMMDDYYYY(m, Number(m1[2]), m1[3]);
  }
  const m2 = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m2) return formatMMDDYYYY(Number(m2[1]), Number(m2[2]), m2[3]);
  return null;
}

/**
 * Parse a Paylocity "Print Check History Summary" text dump.
 *
 * Expected header contains labels like:
 *   "Check Date Gross Net Taxes Deductions FIT SIT SS MED" or a subset like
 *   "Check Date Gross Net FIT SIT SS MED".
 *
 * Data lines follow the header, one per paycheck, beginning with a date (Month d, yyyy or MM/DD/YYYY)
 * followed by numeric columns for the amounts corresponding to the header tokens.
 *
 * Returns an array of records with normalized amounts and date format MM/DD/YYYY.
 * Missing or unparsable pieces become null. If totals are not present but components (FIT/SIT/SS/MED) are,
 * totals are derived: totalTaxes = sum(components); totalDeductions = gross - net - totalTaxes (when possible).
 */
function parsePaylocitySummary(rawText) {
  const text = normalizeText(rawText || "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const results = [];
  const headerIndex = lines.findIndex((l) => /check\s*date/i.test(l));
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;

  // Build column mapping from header (after "Check Date")
  let colMap = [];
  if (headerIndex >= 0) {
    const header = lines[headerIndex];
    const afterDate = header.replace(/^[\s\S]*?check\s*date\s*/i, "");
    const tokens = afterDate.split(/\s+/).filter(Boolean);
    const canon = (t) => t.toLowerCase().replace(/[^a-z]/g, "");
    colMap = tokens.map((t) => {
      const c = canon(t);
      if (c.startsWith("gross")) return "grossPay";
      if (c === "net" || c.startsWith("netpay")) return "netPay";
      if (c.startsWith("tax")) return "totalTaxes";
      if (c.startsWith("deduct")) return "totalDeductions";
      if (c === "fit" || c.startsWith("federal")) return "federalIncomeTax";
      if (c === "sit" || c.startsWith("state")) return "stateIncomeTax";
      if (c === "ss" || c.includes("social") || c.includes("oasdi")) return "socialSecurity";
      if (c === "med" || c.startsWith("medicare")) return "medicare";
      return null;
    }).filter(Boolean);
  }

  const dateRegexes = [
    /^([A-Za-z]+\s+\d{1,2},\s*\d{4})\b(.*)$/,
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b(.*)$/,
  ];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    let dateStr = null;
    let rest = null;
    for (const rx of dateRegexes) {
      const m = line.match(rx);
      if (m) {
        dateStr = toMMDDYYYY(m[1]);
        rest = (m[2] || '').trim();
        break;
      }
    }
    if (!dateStr) continue;

    const amounts = Array.from(rest.matchAll(/\(?-?\$?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})\)?|\(?-?[0-9]+(?:\.[0-9]{2})\)?/g)).map(m => parseMoneyStringToNumber(m[0]));
    if (amounts.length < 2) continue; // need at least gross + net

    const rec = {
      checkDate: dateStr,
      grossPay: null,
      netPay: null,
      totalTaxes: null,
      totalDeductions: null,
      federalIncomeTax: null,
      stateIncomeTax: null,
      socialSecurity: null,
      medicare: null,
    };

    if (colMap.length > 0) {
      for (let j = 0; j < Math.min(colMap.length, amounts.length); j++) {
        const key = colMap[j];
        rec[key] = amounts[j] ?? rec[key];
      }
    } else {
      // Fallback positional mapping as Gross, Net, Taxes, Deductions, FIT, SIT, SS, MED
      const [grossPay, netPay, totalTaxes, totalDeductions, federalIncomeTax, stateIncomeTax, socialSecurity, medicare] = amounts;
      rec.grossPay = grossPay ?? null;
      rec.netPay = netPay ?? null;
      rec.totalTaxes = totalTaxes ?? null;
      rec.totalDeductions = totalDeductions ?? null;
      rec.federalIncomeTax = federalIncomeTax ?? null;
      rec.stateIncomeTax = stateIncomeTax ?? null;
      rec.socialSecurity = socialSecurity ?? null;
      rec.medicare = medicare ?? null;
    }

    // Derivations when totals absent
    const taxParts = [rec.federalIncomeTax, rec.stateIncomeTax, rec.socialSecurity, rec.medicare].filter((v) => typeof v === 'number');
    if (rec.totalTaxes == null && taxParts.length > 0) {
      rec.totalTaxes = taxParts.reduce((s, v) => s + v, 0);
    }
    if (rec.totalDeductions == null && typeof rec.grossPay === 'number' && typeof rec.netPay === 'number' && typeof rec.totalTaxes === 'number') {
      rec.totalDeductions = rec.grossPay - rec.netPay - rec.totalTaxes;
    }

    results.push(rec);
  }

  return results;
}

module.exports = {
  parsePaylocitySummary,
};


