/**
 * Tax Calculator for DissoMaster
 * 
 * Provides tax calculations for California residents
 * Note: These are simplified calculations for estimation purposes.
 * Actual tax calculations should use current tax tables and professional software.
 */

// 2024 Federal tax brackets (simplified - using standard deduction for single filers)
const FEDERAL_TAX_BRACKETS_2024 = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191650, rate: 0.24 },
  { min: 191650, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 }
];

// 2024 California tax brackets (simplified)
const CA_TAX_BRACKETS_2024 = [
  { min: 0, max: 10099, rate: 0.01 },
  { min: 10099, max: 23942, rate: 0.02 },
  { min: 23942, max: 37788, rate: 0.04 },
  { min: 37788, max: 52455, rate: 0.06 },
  { min: 52455, max: 66295, rate: 0.08 },
  { min: 66295, max: 338639, rate: 0.093 },
  { min: 338639, max: 406364, rate: 0.103 },
  { min: 406364, max: 677278, rate: 0.113 },
  { min: 677278, max: Infinity, rate: 0.123 }
];

// Standard deductions for 2024
const STANDARD_DEDUCTIONS_2024 = {
  federal: {
    single: 14600,
    marriedFilingJointly: 29200,
    marriedFilingSeparately: 14600,
    headOfHousehold: 21900
  },
  california: {
    single: 5202,
    marriedFilingJointly: 10404,
    marriedFilingSeparately: 5202,
    headOfHousehold: 10726
  }
};

// Social Security and Medicare rates
const PAYROLL_TAX_RATES = {
  socialSecurity: 0.062, // 6.2% up to wage base
  medicare: 0.0145, // 1.45%
  medicareAdditional: 0.009, // 0.9% for high earners
  sdi: 0.009 // California SDI rate (approximate)
};

// 2024 Social Security wage base
const SS_WAGE_BASE_2024 = 160200;
const MEDICARE_ADDITIONAL_THRESHOLD = 200000; // For single filers

/**
 * Calculate progressive tax based on brackets
 * 
 * @param {number} taxableIncome - Income subject to tax
 * @param {Array} brackets - Tax bracket array
 * @returns {number} Calculated tax
 */
function calculateProgressiveTax(taxableIncome, brackets) {
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableAtThisBracket * bracket.rate;
    remainingIncome -= taxableAtThisBracket;
  }
  
  return tax;
}

/**
 * Calculate federal income tax
 * 
 * @param {number} grossIncome - Annual gross income
 * @param {string} filingStatus - Filing status
 * @param {number} deductions - Additional deductions beyond standard
 * @returns {Object} Federal tax calculation
 */
function calculateFederalTax(grossIncome, filingStatus = 'single', deductions = 0) {
  const standardDeduction = STANDARD_DEDUCTIONS_2024.federal[filingStatus] || STANDARD_DEDUCTIONS_2024.federal.single;
  const totalDeductions = standardDeduction + deductions;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  
  const tax = calculateProgressiveTax(taxableIncome, FEDERAL_TAX_BRACKETS_2024);
  
  return {
    grossIncome,
    standardDeduction,
    additionalDeductions: deductions,
    taxableIncome,
    federalTax: tax,
    effectiveRate: grossIncome > 0 ? tax / grossIncome : 0,
    marginalRate: getMarginalRate(taxableIncome, FEDERAL_TAX_BRACKETS_2024)
  };
}

/**
 * Calculate California state income tax
 * 
 * @param {number} grossIncome - Annual gross income
 * @param {string} filingStatus - Filing status
 * @param {number} deductions - Additional deductions beyond standard
 * @returns {Object} State tax calculation
 */
function calculateCaliforniaTax(grossIncome, filingStatus = 'single', deductions = 0) {
  const standardDeduction = STANDARD_DEDUCTIONS_2024.california[filingStatus] || STANDARD_DEDUCTIONS_2024.california.single;
  const totalDeductions = standardDeduction + deductions;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  
  const tax = calculateProgressiveTax(taxableIncome, CA_TAX_BRACKETS_2024);
  
  return {
    grossIncome,
    standardDeduction,
    additionalDeductions: deductions,
    taxableIncome,
    stateTax: tax,
    effectiveRate: grossIncome > 0 ? tax / grossIncome : 0,
    marginalRate: getMarginalRate(taxableIncome, CA_TAX_BRACKETS_2024)
  };
}

/**
 * Calculate payroll taxes (Social Security, Medicare, SDI)
 * 
 * @param {number} grossIncome - Annual gross income
 * @returns {Object} Payroll tax calculation
 */
function calculatePayrollTaxes(grossIncome) {
  // Social Security tax (capped at wage base)
  const ssWages = Math.min(grossIncome, SS_WAGE_BASE_2024);
  const socialSecurityTax = ssWages * PAYROLL_TAX_RATES.socialSecurity;
  
  // Medicare tax (no cap)
  const medicareTax = grossIncome * PAYROLL_TAX_RATES.medicare;
  
  // Additional Medicare tax for high earners
  const additionalMedicareTax = grossIncome > MEDICARE_ADDITIONAL_THRESHOLD
    ? (grossIncome - MEDICARE_ADDITIONAL_THRESHOLD) * PAYROLL_TAX_RATES.medicareAdditional
    : 0;
  
  // California SDI (State Disability Insurance)
  const sdiTax = grossIncome * PAYROLL_TAX_RATES.sdi;
  
  return {
    grossIncome,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    sdiTax,
    totalPayrollTax: socialSecurityTax + medicareTax + additionalMedicareTax + sdiTax
  };
}

/**
 * Calculate comprehensive tax withholding
 * 
 * @param {number} grossIncome - Annual gross income
 * @param {Object} options - Tax calculation options
 * @returns {Object} Comprehensive tax calculation
 */
function calculateTotalTaxes(grossIncome, options = {}) {
  const {
    filingStatus = 'single',
    additionalDeductions = 0,
    healthInsurance = 0,
    retirementContributions = 0
  } = options;
  
  // Pre-tax deductions reduce taxable income
  const preTaxDeductions = healthInsurance + retirementContributions;
  const adjustedGrossIncome = grossIncome - preTaxDeductions;
  
  const federal = calculateFederalTax(adjustedGrossIncome, filingStatus, additionalDeductions);
  const state = calculateCaliforniaTax(adjustedGrossIncome, filingStatus, additionalDeductions);
  const payroll = calculatePayrollTaxes(grossIncome); // Payroll taxes on gross income
  
  const totalTaxes = federal.federalTax + state.stateTax + payroll.totalPayrollTax;
  const netIncome = grossIncome - totalTaxes - preTaxDeductions;
  
  return {
    grossIncome,
    preTaxDeductions,
    adjustedGrossIncome,
    federal,
    state,
    payroll,
    totalTaxes,
    netIncome: Math.max(0, netIncome),
    effectiveTaxRate: grossIncome > 0 ? totalTaxes / grossIncome : 0
  };
}

/**
 * Get marginal tax rate for given income level
 * 
 * @param {number} taxableIncome - Taxable income amount
 * @param {Array} brackets - Tax bracket array
 * @returns {number} Marginal tax rate
 */
function getMarginalRate(taxableIncome, brackets) {
  for (const bracket of brackets) {
    if (taxableIncome >= bracket.min && taxableIncome < bracket.max) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate; // Highest bracket
}

module.exports = {
  calculateFederalTax,
  calculateCaliforniaTax,
  calculatePayrollTaxes,
  calculateTotalTaxes,
  FEDERAL_TAX_BRACKETS_2024,
  CA_TAX_BRACKETS_2024,
  PAYROLL_TAX_RATES,
  STANDARD_DEDUCTIONS_2024
};