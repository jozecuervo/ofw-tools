const { parsePaylocityPaystub } = require('../utils/paylocity/parser');

describe('paylocity parser', () => {
  test('parses pay date, period, gross/net, totals and common taxes', () => {
    const sample = [
      'Direct Deposit Advice',
      'Check DateAugust 1, 2025',
      'Period BeginningJuly 19, 2025',
      'Period EndingAugust 1, 2025',
      'Net Pay4,000.00',
      'Taxes3,000.00',
      'Deductions1,000.00',
      'FITWS7,000.001,500.00',
      'CAS-7,000.00600.00',
      'SS7,000.00500.00',
      'MED7,000.00100.00',
      'Gross Earnings80.008,000.00',
    ].join('\n');

    const rec = parsePaylocityPaystub(sample);
    expect(rec.payDate).toBe('08/01/2025');
    expect(rec.periodStart).toBe('07/19/2025');
    expect(rec.periodEnd).toBe('08/01/2025');
    expect(rec.grossPay).toBeCloseTo(8000.00, 2);
    expect(rec.netPay).toBeCloseTo(4000.00, 2);
    expect(rec.totalTaxes).toBeCloseTo(3000.00, 2);
    expect(rec.totalDeductions).toBeCloseTo(1000.00, 2);
    expect(rec.federalIncomeTax).toBeCloseTo(1500.00, 2);
    expect(rec.stateIncomeTax).toBeCloseTo(600.00, 2);
    expect(rec.socialSecurity).toBeCloseTo(500.00, 2);
    expect(rec.medicare).toBeCloseTo(100.00, 2);
  });

  test('handles parentheses negative amounts and numeric dates', () => {
    const sample = [
      'Check Date 08/15/2025',
      'Period Start 08/02/2025',
      'Period End 08/15/2025',
      'Net Pay (1,000.00)',
      'Total Deductions (200.00)',
      'Total Taxes 300.00',
      'Federal Withholding 200.00',
      'State Withholding 50.00',
      'FICA Social Security 40.00',
      'FICA Medicare 10.00',
      'Gross Pay 1,500.00',
    ].join('\n');
    const rec = parsePaylocityPaystub(sample);
    expect(rec.payDate).toBe('08/15/2025');
    expect(rec.periodStart).toBe('08/02/2025');
    expect(rec.periodEnd).toBe('08/15/2025');
    expect(rec.netPay).toBeCloseTo(-1000.00, 2);
    expect(rec.totalDeductions).toBeCloseTo(-200.0, 2);
    expect(rec.totalTaxes).toBeCloseTo(300.0, 2);
    expect(rec.federalIncomeTax).toBeCloseTo(200.0, 2);
    expect(rec.stateIncomeTax).toBeCloseTo(50.0, 2);
    expect(rec.socialSecurity).toBeCloseTo(40.0, 2);
    expect(rec.medicare).toBeCloseTo(10.0, 2);
    expect(rec.grossPay).toBeCloseTo(1500.00, 2);
  });
});


