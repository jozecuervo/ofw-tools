const { computeMooreMarsdenThreeBucket, calculateBuyout, apportionEquity, computeApportionment } = require('../apportionment-calc');

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

// Enhanced boundary condition tests
describe('Boundary conditions and edge cases', () => {
  test('Zero appreciation during marriage', () => {
    const inputs = {
      houseValueAtPurchase: 500000,
      fairMarketAtMarriage: 500000,
      appraisedValue: 500000,
      downPayment: 100000,
      principalPaidDuringMarriage: 50000,
      yourSeparateInterest: 100000,
      herSeparateInterest: 0,
      mortgageAtPurchase: 400000,
      mortgageAtSeparation: 350000,
      acquisitionContext: 'premaritalOwner'
    };

    const result = computeApportionment(inputs);
    expect(result.metadata.appreciationDuringMarriage).toBe(0);
    expect(result.mm.cp.shareOfAppreciation).toBe(0);
    expect(result.mm.you.shareOfAppreciation).toBe(0);
  });

  test('Negative appreciation during marriage', () => {
    const inputs = {
      houseValueAtPurchase: 600000,
      fairMarketAtMarriage: 700000,
      appraisedValue: 650000,
      downPayment: 120000,
      principalPaidDuringMarriage: 60000,
      yourSeparateInterest: 120000,
      herSeparateInterest: 0,
      mortgageAtPurchase: 480000,
      mortgageAtSeparation: 420000,
      acquisitionContext: 'premaritalOwner'
    };

    const result = computeApportionment(inputs);
    expect(result.metadata.appreciationDuringMarriage).toBe(-50000);
    expect(result.metadata.hasNegativeAppreciation).toBe(false); // This checks total appreciation vs purchase price
    
    // Moore/Marsden uses total appreciation (FMV - PP), not appreciation during marriage
    const totalAppreciation = 650000 - 600000; // 50000 total appreciation
    const expectedCommunityShare = (60000 / 600000) * totalAppreciation; 
    expect(closeTo(result.mm.cp.shareOfAppreciation, expectedCommunityShare, 0.01)).toBe(true);
    
    // Verify the warning was generated for negative appreciation during marriage
    // (This would be captured in console.warn calls during validation)
  });

  test('Input validation - invalid purchase price', () => {
    expect(() => {
      computeApportionment({
        houseValueAtPurchase: 0,
        appraisedValue: 100000
      });
    }).toThrow('Purchase price must be a positive number greater than 0');

    expect(() => {
      computeApportionment({
        houseValueAtPurchase: -100000,
        appraisedValue: 100000
      });
    }).toThrow('Purchase price must be a positive number greater than 0');
  });

  test('Input validation - invalid acquisition context', () => {
    expect(() => {
      computeApportionment({
        houseValueAtPurchase: 500000,
        appraisedValue: 600000,
        acquisitionContext: 'invalidContext'
      });
    }).toThrow('Invalid acquisitionContext');
  });

  test('Dry run mode - validation only', () => {
    const result = computeApportionment({
      houseValueAtPurchase: 500000,
      appraisedValue: 600000,
      principalPaidDuringMarriage: 50000,
      yourSeparateInterest: 100000,
      herSeparateInterest: 0,
      dryRun: true
    });

    expect(result.validation).toBeDefined();
    expect(result.validation.valid).toBe(true);
    expect(result.metadata.message).toContain('Dry run completed');
    expect(result.baseline).toBeUndefined(); // No calculations performed
  });

  test('Skip validation mode', () => {
    // This should not throw even with invalid data when validation is skipped
    const result = computeApportionment({
      houseValueAtPurchase: 500000,
      appraisedValue: 600000,
      validateInputs: false,
      acquisitionContext: 'premaritalOwner'
    });

    expect(result.regime).toBe('Moore/Marsden');
  });

  test('Large values calculation accuracy', () => {
    const inputs = {
      houseValueAtPurchase: 50000000,
      fairMarketAtMarriage: 65000000,
      appraisedValue: 80000000,
      downPayment: 10000000,
      principalPaidDuringMarriage: 5000000,
      yourSeparateInterest: 10000000,
      herSeparateInterest: 0,
      mortgageAtPurchase: 40000000,
      mortgageAtSeparation: 35000000,
      acquisitionContext: 'premaritalOwner'
    };

    const result = computeApportionment(inputs);
    expect(result.regime).toBe('Moore/Marsden');
    expect(result.baseline.community).toBeGreaterThan(0);
    expect(result.baseline.yourSP).toBeGreaterThan(0);
  });

  test('Minimum positive values', () => {
    const inputs = {
      houseValueAtPurchase: 1,
      fairMarketAtMarriage: 1,
      appraisedValue: 2,
      downPayment: 0.5,
      principalPaidDuringMarriage: 0.25,
      yourSeparateInterest: 0.5,
      herSeparateInterest: 0,
      mortgageAtPurchase: 0.5,
      mortgageAtSeparation: 0.25,
      acquisitionContext: 'premaritalOwner'
    };

    const result = computeApportionment(inputs);
    expect(result.regime).toBe('Moore/Marsden');
    // Should complete calculation without errors
    expect(result.baseline).toBeDefined();
  });

  test('Metadata includes regime explanation', () => {
    const result = computeApportionment({
      houseValueAtPurchase: 500000,
      appraisedValue: 600000,
      acquisitionContext: 'premaritalOwner'
    });

    expect(result.metadata.regimeUsed).toBe('Moore/Marsden');
    expect(result.metadata.explanation).toContain('Moore/Marsden apportionment');
    expect(result.metadata.totalAppreciation).toBe(100000);
  });
});


