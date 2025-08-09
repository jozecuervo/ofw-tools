const { computeMooreMarsden } = require('../moore-marsden');

function closeTo(a, b, eps = 1e-2) {
  return Math.abs(a - b) <= eps;
}

describe('Moore/Marsden worksheet (California)', () => {
  // Legal anchors (not executable):
  // - In re Marriage of Moore (1980) 28 Cal.3d 366
  // - In re Marriage of Marsden (1982) 130 Cal.App.3d 426
  // - Family Code §§ 760, 770, 2640

  test('uses CP proportion = CP principal / purchase price (neutral example)', () => {
    const purchasePrice = 400000;
    const downPayment = 100000;
    const spPrincipal = 20000;
    const fmvMarriage = 600000;
    const cpPrincipal = 10000;
    const fmvDivision = 800000;

    const res = computeMooreMarsden(
      purchasePrice,
      downPayment,
      spPrincipal,
      fmvMarriage,
      cpPrincipal,
      fmvDivision
    );

    const expectedLine7 = fmvMarriage - purchasePrice;
    const expectedLine8 = fmvDivision - fmvMarriage;
    const expectedProp = cpPrincipal / purchasePrice; // CP/Purchase Price
    const expectedLine10 = expectedLine8 * expectedProp;
    const expectedLine11 = expectedLine8 - expectedLine10;
    const expectedCP = cpPrincipal + expectedLine10;
    const expectedSP = downPayment + spPrincipal + expectedLine7 + expectedLine11;

    expect(closeTo(res.line7Result, expectedLine7)).toBe(true);
    expect(closeTo(res.line8Result, expectedLine8)).toBe(true);
    expect(closeTo(res.line9Result, expectedProp, 1e-10)).toBe(true);
    expect(closeTo(res.line10Result, expectedLine10)).toBe(true);
    expect(closeTo(res.line11Result, expectedLine11)).toBe(true);
    expect(closeTo(res.cpInterest, expectedCP)).toBe(true);
    expect(closeTo(res.spInterest, expectedSP)).toBe(true);
  });

  test('zero CP principal yields zero CP share of appreciation', () => {
    const res = computeMooreMarsden(
      100000, 10000, 0, 120000, 0, 150000
    );
    // Appreciation during marriage = 30,000; CP proportion = 0
    expect(closeTo(res.line9Result, 0)).toBe(true);
    expect(closeTo(res.line10Result, 0)).toBe(true);
    expect(closeTo(res.cpInterest, 0)).toBe(true);
    // SP: DP + SP principal + pre‑marital appreciation + SP share (which equals full marital appreciation)
    expect(closeTo(res.spInterest, 10000 + 0 + (120000-100000) + (150000-120000))).toBe(true);
  });

  test('no appreciation during marriage -> CP share of appreciation is zero', () => {
    const res = computeMooreMarsden(
      300000, 50000, 25000, 400000, 10000, 400000
    );
    // line8 = 0, so CP share of appreciation = 0, CP interest = CP principal only
    expect(closeTo(res.line8Result, 0)).toBe(true);
    expect(closeTo(res.line10Result, 0)).toBe(true);
    expect(closeTo(res.cpInterest, 10000)).toBe(true);
    // SP = DP + SP principal + pre‑marital appreciation + 0
    expect(closeTo(res.spInterest, 50000 + 25000 + (400000-300000))).toBe(true);
  });

  test('full CP repayment scenario allocates 100% of marital appreciation to CP', () => {
    const res = computeMooreMarsden(
      200000, 0, 0, 220000, 200000, 300000
    );
    // CP proportion = 200k / 200k = 1
    expect(closeTo(res.line9Result, 1, 1e-10)).toBe(true);
    // line8 = 80,000 => CP share of app = 80,000
    expect(closeTo(res.line10Result, 80000)).toBe(true);
    // CP interest = cpPrincipal + share = 200,000 + 80,000 = 280,000
    expect(closeTo(res.cpInterest, 280000)).toBe(true);
  });
});


