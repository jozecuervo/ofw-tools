"use strict";

/**
 * Biweekly 26/12 monthly-equivalent analysis helpers.
 *
 * Court form FL-150 (California) often requires a monthly gross figure. For
 * bi-weekly compensation, use a 26-pay-periods-per-year conversion divided by 12 months.
 *
 * monthly = perPeriod * (26 / 12)
 */

const BIWEEKLY_TO_MONTHLY_FACTOR = 26 / 12;

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

function toTwoDecimals(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }
  return null;
}

/**
 * Compute monthly-equivalent metrics for a sorted timeline of pay periods.
 *
 * Input records should contain at least { payDate: "MM/DD/YYYY", grossPay?: number, netPay?: number }.
 * Records with invalid dates are ignored for ordering.
 *
 * trailingAvgGross_12M: average of up to the most recent 26 grossPay values (including current when available),
 * multiplied by 26/12.
 *
 * @param {Array<{payDate: string|null, grossPay?: number|null, netPay?: number|null}>} records
 * @returns {Array<{payDate: string, grossPay: number|null, netPay: number|null, monthlyGross_26_12: number|null, trailingAvgGross_12M: number|null, monthlyNet_26_12: number|null}>}
 */
function median(values) {
  const arr = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2;
  return arr[mid];
}

function computeMonthlyAnalysis(records) {
  const withDates = (Array.isArray(records) ? records : [])
    .map((r) => ({ ...r, _dt: parseMMDDYYYYToDate(r && r.payDate) }))
    .filter((r) => r._dt instanceof Date);

  withDates.sort((a, b) => a._dt - b._dt);

  const rollingGross = [];
  const results = [];

  for (const rec of withDates) {
    const gross = typeof rec.grossPay === "number" && Number.isFinite(rec.grossPay) ? rec.grossPay : null;
    const net = typeof rec.netPay === "number" && Number.isFinite(rec.netPay) ? rec.netPay : null;

    if (gross != null) {
      rollingGross.push(gross);
      if (rollingGross.length > 26) rollingGross.shift();
    }

    const monthlyGross_26_12 = gross != null ? toTwoDecimals(gross * BIWEEKLY_TO_MONTHLY_FACTOR) : null;
    const monthlyNet_26_12 = net != null ? toTwoDecimals(net * BIWEEKLY_TO_MONTHLY_FACTOR) : null;

    // True 12-month trailing average (by date window), excluding obvious irregular tiny entries
    let trailingAvgGross_12M = null;
    const endTs = rec._dt.getTime();
    const startTs = new Date(rec._dt); startTs.setUTCFullYear(startTs.getUTCFullYear() - 1);
    const window = withDates.filter((r) => r._dt.getTime() >= startTs.getTime() && r._dt.getTime() <= endTs);
    const windowGross = window
      .map((r) => (typeof r.grossPay === 'number' && Number.isFinite(r.grossPay) ? r.grossPay : null))
      .filter((v) => v != null);
    if (windowGross.length > 0) {
      const med = median(windowGross);
      const minKeep = Math.max(100, (med || 0) * 0.3);
      const filtered = windowGross.filter((v) => v >= minKeep);
      if (filtered.length > 0) {
        const sum = filtered.reduce((s, v) => s + v, 0);
        const avgPerPeriod = sum / filtered.length;
        trailingAvgGross_12M = toTwoDecimals(avgPerPeriod * BIWEEKLY_TO_MONTHLY_FACTOR);
      }
    }

    results.push({
      payDate: rec.payDate || null,
      grossPay: gross,
      netPay: net,
      monthlyGross_26_12,
      trailingAvgGross_12M,
      monthlyNet_26_12,
    });
  }

  return results;
}

module.exports = {
  BIWEEKLY_TO_MONTHLY_FACTOR,
  computeMonthlyAnalysis,
};
