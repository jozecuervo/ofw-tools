/**
 * Input Validation Utilities for DissoMaster Calculator
 */

/**
 * Validate income data
 * 
 * @param {Object} incomeData - Income information to validate
 * @returns {Object} Validation result
 */
function validateIncomeData(incomeData) {
  const errors = [];
  const warnings = [];
  
  if (!incomeData || typeof incomeData !== 'object') {
    errors.push('Income data must be provided as an object');
    return { isValid: false, errors, warnings };
  }
  
  const { grossIncome } = incomeData;
  
  // Validate gross income
  if (grossIncome === undefined || grossIncome === null) {
    errors.push('Gross income is required');
  } else if (typeof grossIncome !== 'number' || isNaN(grossIncome)) {
    errors.push('Gross income must be a valid number');
  } else if (grossIncome < 0) {
    errors.push('Gross income cannot be negative');
  } else if (grossIncome > 10000000) { // $10M annual income
    warnings.push('Gross income is unusually high - please verify');
  }
  
  // Validate individual tax/deduction components
  const numericFields = [
    'federalTax', 'stateTax', 'sdi', 'socialSecurity', 'medicare',
    'healthInsurance', 'retirementContributions', 'otherDeductions'
  ];
  
  numericFields.forEach(field => {
    const value = incomeData[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${field} must be a valid number`);
      } else if (value < 0) {
        errors.push(`${field} cannot be negative`);
      } else if (value > grossIncome) {
        warnings.push(`${field} exceeds gross income - please verify`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate marriage dates
 * 
 * @param {Date|string} marriageDate - Marriage date
 * @param {Date|string} separationDate - Separation date
 * @returns {Object} Validation result
 */
function validateMarriageDates(marriageDate, separationDate) {
  const errors = [];
  const warnings = [];
  
  let startDate, endDate;
  
  try {
    startDate = new Date(marriageDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid marriage date format');
    }
  } catch (e) {
    errors.push('Invalid marriage date format');
  }
  
  try {
    endDate = new Date(separationDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid separation date format');
    }
  } catch (e) {
    errors.push('Invalid separation date format');
  }
  
  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    if (endDate <= startDate) {
      errors.push('Separation date must be after marriage date');
    }
    
    const now = new Date();
    if (startDate > now) {
      errors.push('Marriage date cannot be in the future');
    }
    
    if (endDate > now) {
      warnings.push('Separation date is in the future');
    }
    
    // Check for very long or very short marriages
    const diffYears = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (diffYears > 50) {
      warnings.push('Marriage length exceeds 50 years - please verify dates');
    } else if (diffYears < 0.1) { // Less than about 1 month
      warnings.push('Marriage length is very short - please verify dates');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate calculation options
 * 
 * @param {Object} options - Calculation options
 * @returns {Object} Validation result
 */
function validateCalculationOptions(options = {}) {
  const errors = [];
  const warnings = [];
  
  const {
    childSupport,
    hardshipDeduction,
    supportCap,
    existingSupport
  } = options;
  
  // Validate child support
  if (childSupport !== undefined) {
    if (typeof childSupport !== 'number' || isNaN(childSupport)) {
      errors.push('Child support must be a valid number');
    } else if (childSupport < 0) {
      errors.push('Child support cannot be negative');
    } else if (childSupport > 50000) { // $50k/month seems excessive
      warnings.push('Child support amount is unusually high');
    }
  }
  
  // Validate hardship deduction
  if (hardshipDeduction !== undefined) {
    if (typeof hardshipDeduction !== 'number' || isNaN(hardshipDeduction)) {
      errors.push('Hardship deduction must be a valid number');
    } else if (hardshipDeduction < 0) {
      errors.push('Hardship deduction cannot be negative');
    }
  }
  
  // Validate support cap
  if (supportCap !== undefined) {
    if (typeof supportCap !== 'number' || isNaN(supportCap)) {
      errors.push('Support cap must be a valid number');
    } else if (supportCap < 0) {
      errors.push('Support cap cannot be negative');
    }
  }
  
  // Validate existing support
  if (existingSupport !== undefined) {
    if (typeof existingSupport !== 'number' || isNaN(existingSupport)) {
      errors.push('Existing support must be a valid number');
    } else if (existingSupport < 0) {
      errors.push('Existing support cannot be negative');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate complete DissoMaster calculation input
 * 
 * @param {Object} payorIncome - Payor income data
 * @param {Object} payeeIncome - Payee income data
 * @param {Object} marriageInfo - Marriage information
 * @param {Object} options - Calculation options
 * @returns {Object} Complete validation result
 */
function validateDissoMasterInput(payorIncome, payeeIncome, marriageInfo = {}, options = {}) {
  const validationResults = {
    payorIncome: validateIncomeData(payorIncome),
    payeeIncome: validateIncomeData(payeeIncome),
    options: validateCalculationOptions(options)
  };
  
  // Validate marriage info if provided
  if (marriageInfo.marriageDate && marriageInfo.separationDate) {
    validationResults.marriageInfo = validateMarriageDates(
      marriageInfo.marriageDate,
      marriageInfo.separationDate
    );
  }
  
  // Check for logical income relationship
  if (validationResults.payorIncome.isValid && validationResults.payeeIncome.isValid) {
    const payorNet = payorIncome.netIncome || 0;
    const payeeNet = payeeIncome.netIncome || 0;
    
    if (payorNet <= payeeNet) {
      validationResults.incomeLogic = {
        isValid: false,
        errors: ['Payor income should typically be higher than payee income for spousal support calculations'],
        warnings: []
      };
    } else if (payorNet - payeeNet < 1000) { // Less than $1000/month difference
      validationResults.incomeLogic = {
        isValid: true,
        errors: [],
        warnings: ['Small income difference may result in minimal support']
      };
    } else {
      validationResults.incomeLogic = {
        isValid: true,
        errors: [],
        warnings: []
      };
    }
  }
  
  // Aggregate results
  const allErrors = Object.values(validationResults)
    .flatMap(result => result.errors || []);
  const allWarnings = Object.values(validationResults)
    .flatMap(result => result.warnings || []);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    details: validationResults
  };
}

/**
 * Sanitize and normalize input data
 * 
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data
 */
function sanitizeInput(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  // Sanitize numeric fields
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      // Convert string numbers to actual numbers
      sanitized[key] = parseFloat(value);
    } else if (typeof value === 'number' && !isNaN(value)) {
      // Keep valid numbers, round to 2 decimal places for currency
      sanitized[key] = Math.round(value * 100) / 100;
    } else if (value !== undefined && value !== null && value !== '') {
      // Keep non-empty, non-null values as-is
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

module.exports = {
  validateIncomeData,
  validateMarriageDates,
  validateCalculationOptions,
  validateDissoMasterInput,
  sanitizeInput
};