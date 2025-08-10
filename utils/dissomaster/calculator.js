/**
 * DissoMaster Calculator Core Engine
 * 
 * Implements California guideline spousal support calculations based on DissoMaster methodology.
 * This is an educational implementation for estimation purposes only.
 */

/**
 * Calculate monthly spousal support using DissoMaster formula
 * 
 * Basic DissoMaster formula (simplified):
 * Support = 0.4 * (Higher Earner Net - Lower Earner Net) - 0.5 * (Child Support)
 * 
 * @param {Object} payorIncome - Higher earner's income information
 * @param {Object} payeeIncome - Lower earner's income information  
 * @param {Object} options - Additional calculation options
 * @returns {Object} Calculation results
 */
function calculateSpousalSupport(payorIncome, payeeIncome, options = {}) {
  const payorNet = payorIncome.netIncome || 0;
  const payeeNet = payeeIncome.netIncome || 0;
  const childSupport = options.childSupport || 0;
  const hardshipDeduction = options.hardshipDeduction || 0;
  
  // Basic DissoMaster calculation
  const incomeGap = payorNet - payeeNet;
  const baseSupport = 0.4 * incomeGap;
  const childSupportOffset = 0.5 * childSupport;
  const supportBeforeAdjustments = baseSupport - childSupportOffset;
  
  // Apply hardship deductions
  const supportAfterHardship = Math.max(0, supportBeforeAdjustments - hardshipDeduction);
  
  // Apply support caps if specified
  let finalSupport = supportAfterHardship;
  if (options.supportCap && finalSupport > options.supportCap) {
    finalSupport = options.supportCap;
  }
  
  // Ensure support doesn't exceed payor's ability to pay
  const maxSupportCapacity = payorNet * 0.5; // Conservative 50% cap
  if (finalSupport > maxSupportCapacity) {
    finalSupport = maxSupportCapacity;
  }
  
  return {
    monthlySupport: Math.max(0, Math.round(finalSupport)),
    calculations: {
      payorNetIncome: payorNet,
      payeeNetIncome: payeeNet,
      incomeGap,
      baseSupport,
      childSupportOffset,
      supportBeforeAdjustments,
      hardshipDeduction,
      supportAfterHardship,
      finalSupport,
      maxSupportCapacity
    }
  };
}

/**
 * Calculate detailed income breakdown with taxes and deductions
 * 
 * @param {Object} incomeData - Gross income and deduction information
 * @returns {Object} Net income calculation details
 */
function calculateNetIncome(incomeData) {
  const {
    grossIncome = 0,
    federalTax = 0,
    stateTax = 0,
    sdi = 0,
    socialSecurity = 0,
    medicare = 0,
    healthInsurance = 0,
    retirementContributions = 0,
    otherDeductions = 0
  } = incomeData;
  
  const totalTaxes = federalTax + stateTax + sdi + socialSecurity + medicare;
  const totalDeductions = healthInsurance + retirementContributions + otherDeductions;
  const netIncome = grossIncome - totalTaxes - totalDeductions;
  
  return {
    grossIncome,
    totalTaxes,
    totalDeductions,
    netIncome: Math.max(0, netIncome),
    breakdown: {
      federalTax,
      stateTax,
      sdi,
      socialSecurity,
      medicare,
      healthInsurance,
      retirementContributions,
      otherDeductions
    }
  };
}

/**
 * Generate support payment schedule with step-downs if applicable
 * 
 * @param {number} monthlyAmount - Monthly support amount
 * @param {number} durationMonths - Duration in months
 * @param {Array} stepDowns - Array of step-down adjustments
 * @returns {Array} Payment schedule
 */
function generateSupportSchedule(monthlyAmount, durationMonths, stepDowns = []) {
  const schedule = [];
  let currentAmount = monthlyAmount;
  
  for (let month = 1; month <= durationMonths; month++) {
    // Check for step-downs
    const stepDown = stepDowns.find(sd => sd.month === month);
    if (stepDown) {
      if (stepDown.type === 'percentage') {
        currentAmount = currentAmount * (1 - stepDown.reduction);
      } else if (stepDown.type === 'fixed') {
        currentAmount = Math.max(0, currentAmount - stepDown.reduction);
      }
    }
    
    schedule.push({
      month,
      amount: Math.round(currentAmount),
      isStepDown: !!stepDown
    });
  }
  
  return schedule;
}

/**
 * Calculate support modification based on income changes
 * 
 * @param {Object} originalCalculation - Original support calculation
 * @param {Object} newPayorIncome - Updated payor income
 * @param {Object} newPayeeIncome - Updated payee income
 * @param {Object} options - Calculation options
 * @returns {Object} Modification analysis
 */
function calculateSupportModification(originalCalculation, newPayorIncome, newPayeeIncome, options = {}) {
  const newCalculation = calculateSpousalSupport(newPayorIncome, newPayeeIncome, options);
  const difference = newCalculation.monthlySupport - originalCalculation.monthlySupport;
  const percentageChange = originalCalculation.monthlySupport > 0 
    ? (difference / originalCalculation.monthlySupport) * 100 
    : 0;
  
  return {
    originalSupport: originalCalculation.monthlySupport,
    newSupport: newCalculation.monthlySupport,
    difference,
    percentageChange,
    isSignificantChange: Math.abs(percentageChange) >= 20, // 20% threshold for significance
    newCalculation
  };
}

module.exports = {
  calculateSpousalSupport,
  calculateNetIncome,
  generateSupportSchedule,
  calculateSupportModification
};