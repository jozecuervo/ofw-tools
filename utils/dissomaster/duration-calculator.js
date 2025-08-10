/**
 * Support Duration Calculator
 * 
 * Calculates spousal support duration based on California guidelines and marriage length.
 * These are general guidelines - actual duration is subject to court discretion.
 */

/**
 * Calculate marriage length in years
 * 
 * @param {Date|string} marriageDate - Date of marriage
 * @param {Date|string} separationDate - Date of separation
 * @returns {number} Marriage length in years (with fractions)
 */
function calculateMarriageLength(marriageDate, separationDate) {
  const startDate = new Date(marriageDate);
  const endDate = new Date(separationDate);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Please provide valid dates.');
  }
  
  if (endDate <= startDate) {
    throw new Error('Separation date must be after marriage date.');
  }
  
  const diffTime = Math.abs(endDate - startDate);
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
  
  return diffYears;
}

/**
 * Calculate recommended support duration based on marriage length
 * 
 * California guidelines (general rules of thumb):
 * - Marriages under 10 years: Generally 1/2 the length of marriage
 * - Marriages 10+ years: Subject to court discretion (no specific end date)
 * - Very short marriages (under 2 years): Often limited duration
 * 
 * @param {number} marriageLengthYears - Length of marriage in years
 * @param {Object} options - Additional options
 * @returns {Object} Duration recommendation
 */
function calculateSupportDuration(marriageLengthYears, options = {}) {
  const {
    includeStepDowns = true,
    customRatio = null // Allow custom ratio instead of 0.5
  } = options;
  
  let durationType;
  let durationYears;
  let durationMonths;
  let stepDownSchedule = [];
  let notes = [];
  
  if (marriageLengthYears < 1) {
    durationType = 'very_short';
    durationYears = 0.5; // 6 months typical maximum
    durationMonths = 6;
    notes.push('Very short marriage - support typically limited');
  } else if (marriageLengthYears < 2) {
    durationType = 'short';
    durationYears = Math.min(1, marriageLengthYears * 0.5);
    durationMonths = Math.round(durationYears * 12);
    notes.push('Short marriage - limited duration typical');
  } else if (marriageLengthYears < 10) {
    durationType = 'medium';
    const ratio = customRatio || 0.5;
    durationYears = marriageLengthYears * ratio;
    durationMonths = Math.round(durationYears * 12);
    notes.push(`Marriage under 10 years - ${Math.round(ratio * 100)}% rule applied`);
    
    // For medium-length marriages, consider step-downs
    if (includeStepDowns && durationMonths >= 24) {
      stepDownSchedule = generateStepDownSchedule(durationMonths, 'gradual');
    }
  } else {
    durationType = 'long';
    durationYears = null; // Indefinite
    durationMonths = null;
    notes.push('Marriage 10+ years - no specific end date, subject to court discretion');
    notes.push('Support may continue indefinitely or until remarriage/cohabitation');
  }
  
  return {
    marriageLengthYears,
    durationType,
    durationYears,
    durationMonths,
    stepDownSchedule,
    notes,
    isIndefinite: durationType === 'long'
  };
}

/**
 * Generate step-down schedule for support reduction
 * 
 * @param {number} totalMonths - Total duration in months
 * @param {string} type - Type of step-down ('gradual', 'aggressive', 'custom')
 * @param {Array} customSchedule - Custom step-down points
 * @returns {Array} Step-down schedule
 */
function generateStepDownSchedule(totalMonths, type = 'gradual', customSchedule = []) {
  const schedule = [];
  
  if (type === 'custom' && customSchedule.length > 0) {
    return customSchedule.map(item => ({
      month: item.month,
      type: item.type || 'percentage',
      reduction: item.reduction,
      description: item.description || `Step down at month ${item.month}`
    }));
  }
  
  if (type === 'gradual' && totalMonths >= 24) {
    // Gradual step-downs at 50% and 75% of duration
    const firstStepDown = Math.round(totalMonths * 0.5);
    const secondStepDown = Math.round(totalMonths * 0.75);
    
    schedule.push({
      month: firstStepDown,
      type: 'percentage',
      reduction: 0.25, // 25% reduction
      description: `25% reduction at month ${firstStepDown} (50% of duration)`
    });
    
    schedule.push({
      month: secondStepDown,
      type: 'percentage',
      reduction: 0.25, // Another 25% reduction (total 43.75% of original)
      description: `Additional 25% reduction at month ${secondStepDown} (75% of duration)`
    });
  } else if (type === 'aggressive' && totalMonths >= 18) {
    // More aggressive step-downs
    const firstStepDown = Math.round(totalMonths * 0.33);
    const secondStepDown = Math.round(totalMonths * 0.67);
    
    schedule.push({
      month: firstStepDown,
      type: 'percentage',
      reduction: 0.33, // 33% reduction
      description: `33% reduction at month ${firstStepDown}`
    });
    
    schedule.push({
      month: secondStepDown,
      type: 'percentage',
      reduction: 0.5, // 50% of remaining (total 66.5% of original)
      description: `50% reduction at month ${secondStepDown}`
    });
  }
  
  return schedule;
}

/**
 * Calculate duration for different support types
 * 
 * @param {number} marriageLengthYears - Length of marriage
 * @param {Object} options - Calculation options
 * @returns {Object} Duration recommendations for different scenarios
 */
function calculateDurationScenarios(marriageLengthYears, options = {}) {
  const conservative = calculateSupportDuration(marriageLengthYears, { 
    ...options, 
    customRatio: 0.4, // 40% of marriage length
    includeStepDowns: false 
  });
  
  const standard = calculateSupportDuration(marriageLengthYears, options);
  
  const liberal = calculateSupportDuration(marriageLengthYears, { 
    ...options, 
    customRatio: 0.6, // 60% of marriage length
    includeStepDowns: true 
  });
  
  return {
    conservative,
    standard,
    liberal,
    marriageLengthYears
  };
}

/**
 * Check for terminating events that would end support
 * 
 * @param {Object} circumstances - Current circumstances
 * @returns {Object} Termination analysis
 */
function checkTerminatingEvents(circumstances = {}) {
  const {
    payeeRemarried = false,
    payeeCohabiting = false,
    cohabitationDuration = 0, // months
    payorDeath = false,
    payeeDeath = false,
    courtOrderModification = false
  } = circumstances;
  
  const terminatingEvents = [];
  
  if (payeeRemarried) {
    terminatingEvents.push({
      event: 'remarriage',
      terminates: true,
      description: 'Support typically terminates upon remarriage of recipient'
    });
  }
  
  if (payeeCohabiting) {
    const significantCohabitation = cohabitationDuration >= 6; // 6+ months often considered significant
    terminatingEvents.push({
      event: 'cohabitation',
      terminates: significantCohabitation,
      description: significantCohabitation
        ? 'Extended cohabitation may justify termination or reduction'
        : 'Short-term cohabitation - may not justify termination'
    });
  }
  
  if (payorDeath) {
    terminatingEvents.push({
      event: 'payor_death',
      terminates: true,
      description: 'Support terminates upon death of payor (unless secured by life insurance)'
    });
  }
  
  if (payeeDeath) {
    terminatingEvents.push({
      event: 'payee_death',
      terminates: true,
      description: 'Support terminates upon death of recipient'
    });
  }
  
  const shouldTerminate = terminatingEvents.some(event => event.terminates);
  
  return {
    shouldTerminate,
    terminatingEvents,
    recommendations: shouldTerminate 
      ? ['Consider filing motion to terminate or modify support']
      : ['Continue monitoring circumstances for changes']
  };
}

module.exports = {
  calculateMarriageLength,
  calculateSupportDuration,
  generateStepDownSchedule,
  calculateDurationScenarios,
  checkTerminatingEvents
};