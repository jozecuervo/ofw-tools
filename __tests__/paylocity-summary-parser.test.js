const { parsePaylocitySummary } = require('../utils/paylocity/summary');

describe('paylocity summary parser', () => {
  test('parses header + rows with common columns', () => {
    const sample = [
      'Print Check History Summary',
      'Check Date Gross Net Taxes Deductions FIT SIT SS MED',
      'July 19, 2025 8,000.00 4,000.00 3,000.00 1,000.00 1,500.00 600.00 500.00 100.00',
      'August 1, 2025 7,500.00 3,900.00 2,900.00 700.00 1,300.00 600.00 800.00 200.00',
    ].join('\n');

    const rows = parsePaylocitySummary(sample);
    expect(rows.length).toBe(2);
    expect(rows[0].checkDate).toBe('07/19/2025');
    expect(rows[0].grossPay).toBeCloseTo(8000, 2);
    expect(rows[0].netPay).toBeCloseTo(4000, 2);
    expect(rows[0].totalTaxes).toBeCloseTo(3000, 2);
    expect(rows[0].totalDeductions).toBeCloseTo(1000, 2);
    expect(rows[0].federalIncomeTax).toBeCloseTo(1500, 2);
    expect(rows[0].stateIncomeTax).toBeCloseTo(600, 2);
    expect(rows[0].socialSecurity).toBeCloseTo(500, 2);
    expect(rows[0].medicare).toBeCloseTo(100, 2);
  });

  test('derives totals when only components present and handles numeric dates', () => {
    const sample = [
      'Check Date  Gross  Net  FIT  SIT  SS  MED',
      '08/15/2025  1,500.00  1,000.00  200.00  50.00  40.00  10.00',
    ].join('\n');

    const rows = parsePaylocitySummary(sample);
    expect(rows.length).toBe(1);
    const r = rows[0];
    expect(r.checkDate).toBe('08/15/2025');
    expect(r.grossPay).toBeCloseTo(1500, 2);
    expect(r.netPay).toBeCloseTo(1000, 2);
    expect(r.totalTaxes).toBeCloseTo(300, 2);
    expect(r.totalDeductions).toBeCloseTo(200, 2);
  });
});


