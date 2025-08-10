const { computeMooreMarsdenThreeBucket, calculateBuyout, apportionEquity } = require('../apportionment-calc');

function closeTo(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

describe('Apportionment (Moore/Marsden three-bucket) and credits', () => {
  test('MM three-bucket splits appreciation by PP and adds dollar reimbursements', () => {
    // PP = 400k, FMV = 800k, A = 400k
    const PP = 400000;
    const FMV = 800000;
    const Cp = 100000; // CP principal during marriage
    const Sy = 100000; // Your SP
    const Sh = 200000; // Her SP

    const mm = computeMooreMarsdenThreeBucket(PP, FMV, Cp, Sy, Sh);

    // Shares of appreciation
    expect(closeTo(mm.cp.shareOfAppreciation, (Cp / PP) * (FMV - PP))).toBe(true);
    expect(closeTo(mm.you.shareOfAppreciation, (Sy / PP) * (FMV - PP))).toBe(true);
    expect(closeTo(mm.her.shareOfAppreciation, (Sh / PP) * (FMV - PP))).toBe(true);

    // Equities = principal + share of appreciation
    expect(closeTo(mm.cp.equity, Cp + mm.cp.shareOfAppreciation)).toBe(true);
    expect(closeTo(mm.you.equity, Sy + mm.you.shareOfAppreciation)).toBe(true);
    expect(closeTo(mm.her.equity, Sh + mm.her.shareOfAppreciation)).toBe(true);
  });

  test('Buyout applies Watts (net) against occupant and Epstein reimbursements as separate ledger', () => {
    const PP = 400000;
    const FMV = 800000;
    const Cp = 100000;
    const Sy = 100000;
    const Sh = 200000;
    const L2 = 0; // no remaining mortgage at valuation for this test

    const watts = {
      occupant: 'her',
      fairMonthlyRentalValue: 3000,
      months: 10,
      offsets: { interest: 1000, taxes: 0, insurance: 0, repairs: 0 },
    };
    // Gross = 0.5*3000*10 = 15000; Offsets = 1000*10 = 10000; Net = 5000 → charge to her, credit to you
    const epstein = { you: 0, her: 2000 };

    const res = calculateBuyout({ PP, FMV, Cp, Sy, Sh, L2, watts, epstein });

    // Baseline equal split of CP
    const cpHalf = res.baseline.community / 2;
    expect(closeTo(res.baseline.yourBaseline, res.baseline.yourSP + cpHalf)).toBe(true);
    expect(closeTo(res.baseline.herBaseline, res.baseline.herSP + cpHalf)).toBe(true);

    // Credits: her occupant → her baseline reduced by 5000, yours increased by 5000
    expect(closeTo(res.credits.watts.net, 5000)).toBe(true);
    expect(closeTo(res.net.your, res.baseline.yourBaseline + 5000 + 0)).toBe(true);
    expect(closeTo(res.net.her, res.baseline.herBaseline - 5000 + 2000)).toBe(true);

    // Buyout values mirror net equities
    expect(closeTo(res.buyout.yourBuyout, res.net.her)).toBe(true);
    expect(closeTo(res.buyout.herBuyout, res.net.your)).toBe(true);
  });

  test('§2640 joint-title during marriage: SP reimbursed dollar-for-dollar, no SP share of appreciation', () => {
    const PP = 400000;
    const FMV = 800000;
    const L0 = 300000;
    const L1 = 200000; // Cp = 100k (from loans)
    const L2 = 150000; // remaining mortgage at valuation
    const Sy = 60000;  // traceable SP (you)
    const Sh = 40000;  // traceable SP (her)

    const res = apportionEquity({ acquisitionContext: 'jointTitleDuringMarriage', PP, FMV, L0, L1, L2, Sy, Sh });
    const totalEquity = FMV - L2; // 650k
    expect(res.regime).toBe('2640');
    // CP equity is remainder after §2640 reimbursements
    const expectedCp = totalEquity - Sy - Sh;
    expect(Math.abs(res.cp.equity - expectedCp) <= 1e-6).toBe(true);
    expect(Math.abs(res.you.equity - Sy) <= 1e-6).toBe(true);
    expect(Math.abs(res.her.equity - Sh) <= 1e-6).toBe(true);
  });
});


