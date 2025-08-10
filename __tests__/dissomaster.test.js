const { calculateSpousalSupport, calculateNetIncome } = require('../utils/dissomaster/calculator');
const { calculateTotalTaxes } = require('../utils/dissomaster/tax-calculator');
const { calculateSupportDuration } = require('../utils/dissomaster/duration-calculator');
const { validateDissoMasterInput } = require('../utils/dissomaster/validation');

describe('DissoMaster Calculator', () => {
  
  describe('calculateNetIncome', () => {
    test('calculates net income correctly', () => {
      const incomeData = {
        grossIncome: 120000,
        federalTax: 15000,
        stateTax: 8000,
        sdi: 1080,
        socialSecurity: 7440,
        medicare: 1740,
        healthInsurance: 6000,
        retirementContributions: 12000
      };
      
      const result = calculateNetIncome(incomeData);
      
      expect(result.grossIncome).toBe(120000);
      expect(result.totalTaxes).toBe(33260); // 15000 + 8000 + 1080 + 7440 + 1740
      expect(result.totalDeductions).toBe(18000); // 6000 + 12000
      expect(result.netIncome).toBe(68740); // 120000 - 33260 - 18000
    });
  });

  describe('calculateSpousalSupport', () => {
    test('calculates basic spousal support correctly', () => {
      const payorIncome = { netIncome: 8000 }; // $8000/month net
      const payeeIncome = { netIncome: 3000 }; // $3000/month net
      
      const result = calculateSpousalSupport(payorIncome, payeeIncome);
      
      // 40% of income gap: 0.4 * (8000 - 3000) = 2000
      expect(result.monthlySupport).toBe(2000);
      expect(result.calculations.incomeGap).toBe(5000);
      expect(result.calculations.baseSupport).toBe(2000);
    });

    test('accounts for child support offset', () => {
      const payorIncome = { netIncome: 8000 };
      const payeeIncome = { netIncome: 3000 };
      const options = { childSupport: 1000 }; // $1000/month child support
      
      const result = calculateSpousalSupport(payorIncome, payeeIncome, options);
      
      // Base support: 0.4 * 5000 = 2000
      // Child support offset: 0.5 * 1000 = 500
      // Final: 2000 - 500 = 1500
      expect(result.monthlySupport).toBe(1500);
    });

    test('handles zero or negative results', () => {
      const payorIncome = { netIncome: 4000 };
      const payeeIncome = { netIncome: 3000 };
      const options = { childSupport: 2000 }; // High child support
      
      const result = calculateSpousalSupport(payorIncome, payeeIncome, options);
      
      // Base: 0.4 * 1000 = 400
      // Offset: 0.5 * 2000 = 1000
      // Result would be negative, should be 0
      expect(result.monthlySupport).toBe(0);
    });
  });

  describe('calculateTotalTaxes', () => {
    test('calculates taxes for middle income earner', () => {
      const result = calculateTotalTaxes(80000, { filingStatus: 'single' });
      
      expect(result.grossIncome).toBe(80000);
      expect(result.netIncome).toBeGreaterThan(55000); // Should have reasonable net income
      expect(result.totalTaxes).toBeGreaterThan(15000); // Should pay substantial taxes
      expect(result.effectiveTaxRate).toBeGreaterThan(0.15); // Should be at least 15%
      expect(result.effectiveTaxRate).toBeLessThan(0.4); // Should be less than 40%
    });

    test('handles pre-tax deductions', () => {
      const withoutDeductions = calculateTotalTaxes(80000);
      const withDeductions = calculateTotalTaxes(80000, {
        healthInsurance: 6000,
        retirementContributions: 8000
      });
      
      // With pre-tax deductions, should have lower total taxes
      expect(withDeductions.totalTaxes).toBeLessThan(withoutDeductions.totalTaxes);
      // But lower net income due to deductions
      expect(withDeductions.netIncome).toBeLessThan(withoutDeductions.netIncome);
    });
  });

  describe('calculateSupportDuration', () => {
    test('applies half-marriage rule for short marriages', () => {
      const result = calculateSupportDuration(8); // 8 year marriage
      
      expect(result.durationType).toBe('medium');
      expect(result.durationYears).toBe(4); // Half of 8 years
      expect(result.durationMonths).toBe(48);
      expect(result.isIndefinite).toBe(false);
    });

    test('handles long-term marriages', () => {
      const result = calculateSupportDuration(15); // 15 year marriage
      
      expect(result.durationType).toBe('long');
      expect(result.durationYears).toBeNull();
      expect(result.durationMonths).toBeNull();
      expect(result.isIndefinite).toBe(true);
    });

    test('handles very short marriages', () => {
      const result = calculateSupportDuration(0.5); // 6 month marriage
      
      expect(result.durationType).toBe('very_short');
      expect(result.durationMonths).toBe(6);
      expect(result.notes).toContain('Very short marriage - support typically limited');
    });
  });

  describe('validateDissoMasterInput', () => {
    test('validates correct input', () => {
      const payorIncome = { grossIncome: 120000, netIncome: 80000 };
      const payeeIncome = { grossIncome: 60000, netIncome: 45000 };
      const options = { childSupport: 500 };
      
      const result = validateDissoMasterInput(payorIncome, payeeIncome, {}, options);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('catches invalid income data', () => {
      const payorIncome = { grossIncome: -1000 }; // Negative income
      const payeeIncome = { grossIncome: 'invalid' }; // Non-numeric
      
      const result = validateDissoMasterInput(payorIncome, payeeIncome);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('warns about unusual income relationships', () => {
      const payorIncome = { grossIncome: 50000, netIncome: 40000 };
      const payeeIncome = { grossIncome: 60000, netIncome: 45000 }; // Payee earns more
      
      const result = validateDissoMasterInput(payorIncome, payeeIncome);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payor income should typically be higher than payee income for spousal support calculations');
    });
  });
});