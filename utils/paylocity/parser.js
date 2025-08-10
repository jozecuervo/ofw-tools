"use strict";

/**
 * Paylocity Paycheck PDF text parser
 *
 * Extracts key fields from Paylocity paystub text. Written to be tolerant of layout changes:
 * - Supports labels like "Pay Date" or "Check Date"
 * - Supports "Pay Period: MM/DD/YYYY - MM/DD/YYYY" and separate Begin/End labels
 * - Searches common summary labels for Gross, Net, Taxes, and Deductions
 *
 * Returns string dates as MM/DD/YYYY and numeric amounts as Numbers (or null if missing).
 */

/**
 * Parse a US currency string into a Number.
 * Parses a US currency string into a Number.
 *
 * Accepts optional leading '$', thousands separators (commas), spaces, and negative values
 * (either with a leading '-' or wrapped in parentheses).
 *
 * @param {string|number|null|undefined} value - The currency value to parse. Can be a string, number, null, or undefined.
 * @returns {number|null} The parsed numeric value, or null if the input is missing or invalid.
 *
 * @example
 * parseMoneyStringToNumber("$1,234.56"); // 1234.56
 * parseMoneyStringToNumber("($1,234.56)"); // -1234.56
 * parseMoneyStringToNumber("-$1,234.56"); // -1234.56
 * parseMoneyStringToNumber("1234.56"); // 1234.56
 * parseMoneyStringToNumber(null); // null
 * parseMoneyStringToNumber("invalid"); // null
 */
function parseMoneyStringToNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  const isNegative = /\(\s*[^)]+\s*\)/.test(raw) || /^-/.test(raw);
  const cleaned = raw.replace(/[()$,\s]/g, "").replace(/^[-]/, "");
  if (cleaned === "") return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return isNegative ? -num : num;
}

/**
 * Get first capturing group for a list of patterns.
 */
function firstMatch(text, regexes) {
  for (const rx of regexes) {
    const m = rx.exec(text);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * Get first pair (two capturing groups) for a list of patterns.
 */
function firstMatchPair(text, regexes) {
  for (const rx of regexes) {
    const m = rx.exec(text);
    if (m && m[1]) return { a: m[1], b: m[2] };
  }
  return { a: null, b: null };
}

/**
 * Normalize PDF text for robust regexes: collapse repeated spaces, keep newlines, unify dashes.
 */
function normalizeText(input) {
  return String(input)
    .replace(/[\u2013\u2014]/g, "-") // en/em dash → hyphen
    .replace(/\u00A0/g, " ") // nbsp → space
    .replace(/[ \t]+/g, " ") // collapse spaces (not newlines)
    .trim();
}

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

function normalizeDateString(dateStr) {
  if (!dateStr) return null;
  // Find date tokens anywhere in the string
  const nameAnywhere = dateStr.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
  if (nameAnywhere && nameAnywhere[1]) {
    const parts = nameAnywhere[1].match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (parts) {
      const m = monthNameToNumber(parts[1]);
      if (m) return formatMMDDYYYY(m, Number(parts[2]), parts[3]);
    }
  }
  const mdYAnywhere = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (mdYAnywhere && mdYAnywhere[1]) {
    return formatMMDDYYYY(Number(mdYAnywhere[1]), Number(mdYAnywhere[2]), mdYAnywhere[3]);
  }
  // Fallback: strict matches (unlikely reached now)
  const mdY = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (mdY) return formatMMDDYYYY(Number(mdY[1]), Number(mdY[2]), mdY[3]);
  const name = dateStr.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (name) {
    const m = monthNameToNumber(name[1]);
    if (m) return formatMMDDYYYY(m, Number(name[2]), name[3]);
  }
  return null;
}

function findDateAfterLabel(text, label) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(label.toLowerCase());
  if (idx === -1) return null;
  const slice = text.slice(idx + label.length, idx + label.length + 80);
  const nameMatch = slice.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
  if (nameMatch && nameMatch[1]) return nameMatch[1];
  const numMatch = slice.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/);
  if (numMatch && numMatch[1]) return numMatch[1];
  return null;
}

/**
 * Extract a dollar amount by label, allowing for either order and line breaks.
 * Tries these layouts:
 *  - "Label: $1,234.56"
 *  - "Label" followed by amount on next token/line
 *  - "$1,234.56 Label"
 */
function extractAmountByLabel(text, labels) {
  const amountPattern = AMOUNT_REGEX_PATTERN;
  const joinedLabels = labels.map(l => l.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|");

  const regexes = [
    // Label: $1,234.56  (same line)
    new RegExp(`(?:${joinedLabels})\s*[:]?\s*${amountPattern}`, "i"),
    // Label\n$1,234.56  (next line)
    new RegExp(`(?:${joinedLabels})\s*[:]?\s*[\n\r]+\s*${amountPattern}`, "i"),
    // $1,234.56 Label  (amount first)
    new RegExp(`${amountPattern}\s*(?:${joinedLabels})`, "i"),
  ];

  for (const rx of regexes) {
    const m = rx.exec(text);
    if (m && m[1]) return parseMoneyStringToNumber(m[1]);
  }
  return null;
}

/**
 * Parse Paylocity paystub text into a normalized paycheck record.
 * @param {string} rawText
 * @returns {{
 *   payDate: string|null,
 *   periodStart: string|null,
 *   periodEnd: string|null,
 *   grossPay: number|null,
 *   netPay: number|null,
 *   totalTaxes: number|null,
 *   totalDeductions: number|null,
 *   federalIncomeTax: number|null,
 *   stateIncomeTax: number|null,
 *   socialSecurity: number|null,
 *   medicare: number|null,
 * }}
 */
function parsePaylocityPaystub(rawText) {
  const text = normalizeText(rawText);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Dates
  let payDateRaw = firstMatch(text, [
    /(?:Pay\s*Date|Check\s*Date)\s*:?\s*([0-1]?\d[\/-][0-3]?\d[\/-]\d{4})/i,
    /(?:Pay\s*Date|Check\s*Date)\s*:?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i,
  ]);
  if (!payDateRaw) {
    payDateRaw = findDateAfterLabel(text, 'Check Date') || findDateAfterLabel(text, 'Pay Date');
  }
  const payDate = normalizeDateString(payDateRaw);

  let { a: periodStart, b: periodEnd } = firstMatchPair(text, [
    /(?:Pay\s*Period)\s*:?\s*([0-1]?\d[\/-][0-3]?\d[\/-]\d{4})\s*-\s*([0-1]?\d[\/-][0-3]?\d[\/-]\d{4})/i,
    /(?:Pay\s*Period)\s*:?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})\s*-\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i,
  ]);

  if (!periodStart || !periodEnd) {
    // Fallback: separate begin/end labels
    const beginRaw = firstMatch(text, [/(?:Period\s*(?:Start|Begin|Beginning)\s*(?:Date)?)\s*:?\s*([0-1]?\d[\/-][0-3]?\d[\/-]\d{4})/i,
                                      /(?:Period\s*(?:Start|Begin|Beginning)\s*(?:Date)?)\s*:?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i]);
    const endRaw = firstMatch(text, [/(?:Period\s*(?:End|Ending)\s*(?:Date)?)\s*:?\s*([0-1]?\d[\/-][0-3]?\d[\/-]\d{4})/i,
                                    /(?:Period\s*(?:End|Ending)\s*(?:Date)?)\s*:?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i]);
    periodStart = normalizeDateString(beginRaw) || normalizeDateString(findDateAfterLabel(text, 'Period Beginning')) || normalizeDateString(findDateAfterLabel(text, 'Period Start'));
    const periodBeginningRaw = findDateAfterLabel(text, 'Period Beginning');
    const periodStartRaw = findDateAfterLabel(text, 'Period Start');
    periodStart = normalizeDateString(beginRaw) ||
                  normalizeDateString(periodBeginningRaw) ||
                  normalizeDateString(periodStartRaw);
    const periodEndingRaw = findDateAfterLabel(text, 'Period Ending');
    const periodEndRaw = findDateAfterLabel(text, 'Period End');
    periodEnd = normalizeDateString(endRaw) ||
                normalizeDateString(periodEndingRaw) ||
                normalizeDateString(periodEndRaw);
  }

  // Helper to scan lines for a label and pick the nearest currency on the same or next line
  function extractFromLines(labelSynonyms, pick = 'first') {
    const labelRegex = new RegExp(labelSynonyms.map(s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|"), "i");
    const moneyRx = MONEY_REGEX;
    for (let i = 0; i < lines.length; i++) {
      if (labelRegex.test(lines[i])) {
        // Collect money tokens on same line
        const same = Array.from(lines[i].matchAll(moneyRx)).map(m => m[0]);
        if (same && same.length > 0) {
          if (pick === 'second' && same.length >= 2) return parseMoneyStringToNumber(same[1]);
          return parseMoneyStringToNumber(same[0]);
        }
        // Try next two lines for a plausible "current" amount
        for (let j = 1; j <= 2 && i + j < lines.length; j++) {
          const next = Array.from(lines[i + j].matchAll(moneyRx)).map(m => m[0]);
          if (next && next.length > 0) {
            if (pick === 'second' && next.length >= 2) return parseMoneyStringToNumber(next[1]);
            return parseMoneyStringToNumber(next[0]);
          }
        }
      }
    }
    return null;
  }

  function extractTaxSecondByPrefixes(prefixes) {
    const rx = new RegExp(`^(?:${prefixes.map(p => p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join('|')})(?:[^\n]*)$`, 'i');
    const moneyRx = /\(?-?\$?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})\)?|\(?-?[0-9]+(?:\.[0-9]{2})\)?/g;
    for (const line of lines) {
      if (rx.test(line)) {
        const tokens = Array.from(line.matchAll(moneyRx)).map(m => m[0]);
        if (tokens.length >= 2) return parseMoneyStringToNumber(tokens[1]);
      }
    }
    return null;
  }

  // Amounts (summary) with broader synonyms and line scanning fallback
  const grossPay = extractAmountByLabel(text, ["Gross Pay", "Current Gross"]) ||
                   extractFromLines(["Gross Pay", "Current Gross"], 'first') ||
                   extractFromLines(["Gross Earnings", "Total Earnings"], 'second');
  const netPay = extractAmountByLabel(text, ["Net Pay", "Net Amount", "Net Check", "NET PAY"]) ||
                 extractFromLines(["Net Pay", "Net Amount", "Net Check", "NET PAY"]);
  const totalTaxes = extractAmountByLabel(text, ["Total Taxes", "Taxes Total", "Total Tax", "Employee Taxes", "Taxes"]) ||
                     extractFromLines(["Total Taxes", "Taxes Total", "Total Tax", "Employee Taxes", "Taxes"]);
  const totalDeductions = extractAmountByLabel(text, ["Total Deductions", "Deductions Total", "Total Deduction", "Employee Deductions", "Deductions"]) ||
                          extractFromLines(["Total Deductions", "Deductions Total", "Total Deduction", "Employee Deductions", "Deductions"]);

  // Common tax lines with more synonyms
  const federalIncomeTax = extractTaxSecondByPrefixes(["FIT", "FITW", "FITWS"]) ||
                           extractFromLines(["Federal Income Tax", "Federal Withholding", "Fed Income Tax", "Fed Withholding", "FIT"], 'second');
  const stateIncomeTax = extractTaxSecondByPrefixes(["SIT", "CAS", "CAS-", "CA SIT", "CA STATE", "CA ST"]) ||
                         extractFromLines(["State Income Tax", "State Withholding", "CA Withholding", "California Withholding", "SIT", "CAS"], 'second');
  const socialSecurity = extractTaxSecondByPrefixes(["SS", "FICA Social Security", "OASDI"]) ||
                         extractFromLines(["Social Security", "OASDI", "FICA Social Security", "Social Security Employee", "SS"], 'second');
  const medicare = extractTaxSecondByPrefixes(["MED", "Medicare"]) ||
                   extractFromLines(["Medicare", "FICA Medicare", "Medicare Employee", "MED"], 'second');

  // Derive missing totals where possible
  let derivedGross = grossPay;
  let derivedTaxes = totalTaxes;
  let derivedDeductions = totalDeductions;
  const taxParts = [federalIncomeTax, stateIncomeTax, socialSecurity, medicare].filter(v => typeof v === 'number');
  if (derivedTaxes == null && taxParts.length >= 1) {
    derivedTaxes = taxParts.reduce((sum, v) => sum + v, 0);
  }
  if (derivedGross == null && typeof netPay === 'number' && typeof derivedTaxes === 'number' && typeof derivedDeductions === 'number') {
    derivedGross = netPay + derivedTaxes + derivedDeductions;
  }
  if (derivedDeductions == null && typeof netPay === 'number' && typeof derivedTaxes === 'number' && typeof derivedGross === 'number') {
    derivedDeductions = derivedGross - netPay - derivedTaxes;
  }

  return {
    payDate,
    periodStart,
    periodEnd,
    grossPay: derivedGross ?? null,
    netPay,
    totalTaxes: derivedTaxes ?? null,
    totalDeductions: derivedDeductions ?? null,
    federalIncomeTax,
    stateIncomeTax,
    socialSecurity,
    medicare,
  };
}

module.exports = {
  parsePaylocityPaystub,
  parseMoneyStringToNumber,
  normalizeText,
};


