/**
 * DissoMaster Calculator CLI
 *
 * Purpose
 * - Calculate California spousal support using DissoMaster methodology
 * - Provide temporary spousal support estimates for family law practitioners
 * - Include tax calculations, support duration guidelines, and payment schedules
 *
 * Legal background (California)
 * - Family Code § 4320 (factors for spousal support)
 * - Family Code § 4325 (temporary support guidelines)
 * - DissoMaster software methodology (industry standard)
 *
 * Important Legal Disclaimers
 * - This calculator provides estimates only and should not replace certified DissoMaster software
 * - Results are for educational and planning purposes only
 * - Actual support awards are subject to court discretion and many factors not captured here
 * - Tax calculations are simplified and may not reflect individual circumstances
 * - Always consult with qualified professionals for legal and tax advice
 *
 * CLI Usage
 * - node dissomaster.js [--config <path-to-json>] [--out-json <path>]
 *   --config: Provide inputs via JSON; otherwise the tool will look for
 *             source_files/dissomaster.config.json (gitignored) if present
 *   --out-json: Write a machine-readable JSON summary of calculation results
 *   --summary: Print only the support calculation result
 *   --no-explain: Hide explanatory header and disclaimers
 *   --duration: Include support duration analysis
 *   --schedule: Generate payment schedule if duration is specified
 */

const fs = require('fs');
const path = require('path');

// Import DissoMaster utilities
const { calculateSpousalSupport, calculateNetIncome, generateSupportSchedule } = require('./utils/dissomaster/calculator');
const { calculateTotalTaxes } = require('./utils/dissomaster/tax-calculator');
const { calculateSupportDuration, calculateDurationScenarios } = require('./utils/dissomaster/duration-calculator');
const { validateDissoMasterInput, sanitizeInput } = require('./utils/dissomaster/validation');

// Parse command line arguments
const argv = process.argv.slice(2);
const summaryOnly = argv.includes('--summary');
const noExplain = argv.includes('--no-explain');
const includeDuration = argv.includes('--duration');
const includeSchedule = argv.includes('--schedule');

// Load configuration
let config = {};
const configIdx = argv.indexOf('--config');
if (configIdx !== -1 && argv[configIdx + 1]) {
    const configPath = argv[configIdx + 1];
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`Using configuration from ${configPath}`);
    } catch (e) {
        console.error('Failed to read config JSON:', e.message);
        process.exit(1);
    }
} else {
    const defaultConfig = path.join(__dirname, 'source_files', 'dissomaster.config.json');
    if (fs.existsSync(defaultConfig)) {
        try {
            config = JSON.parse(fs.readFileSync(defaultConfig, 'utf8'));
            console.log(`Using configuration from ${defaultConfig}`);
        } catch (e) {
            console.error('Failed to read default config JSON:', e.message);
            process.exit(1);
        }
    }
}

// Default values for demonstration (neutral example data)
const defaults = {
    payor: {
        grossIncome: 120000, // $120k annual
        filingStatus: 'single',
        healthInsurance: 6000, // $500/month
        retirementContributions: 12000 // 10% of gross
    },
    payee: {
        grossIncome: 40000, // $40k annual
        filingStatus: 'single',
        healthInsurance: 3600, // $300/month
        retirementContributions: 2000 // 5% of gross
    },
    marriageInfo: {
        marriageDate: '2015-06-15',
        separationDate: '2024-12-01',
        marriageLengthYears: 9.5
    },
    options: {
        childSupport: 0,
        hardshipDeduction: 0,
        supportCap: null
    }
};

// Merge defaults with config
const input = {
    payor: { ...defaults.payor, ...config.payor },
    payee: { ...defaults.payee, ...config.payee },
    marriageInfo: { ...defaults.marriageInfo, ...config.marriageInfo },
    options: { ...defaults.options, ...config.options }
};

// Sanitize inputs
input.payor = sanitizeInput(input.payor);
input.payee = sanitizeInput(input.payee);
input.options = sanitizeInput(input.options);

// Calculate taxes and net incomes first
const payorTaxCalc = calculateTotalTaxes(input.payor.grossIncome, {
    filingStatus: input.payor.filingStatus,
    healthInsurance: input.payor.healthInsurance,
    retirementContributions: input.payor.retirementContributions
});

const payeeTaxCalc = calculateTotalTaxes(input.payee.grossIncome, {
    filingStatus: input.payee.filingStatus,
    healthInsurance: input.payee.healthInsurance,
    retirementContributions: input.payee.retirementContributions
});

// Add net incomes to input objects for validation
const payorIncomeForValidation = {
    ...input.payor,
    netIncome: payorTaxCalc.netIncome / 12 // Monthly for validation
};

const payeeIncomeForValidation = {
    ...input.payee,
    netIncome: payeeTaxCalc.netIncome / 12 // Monthly for validation
};

// Validate inputs with calculated net incomes
const validation = validateDissoMasterInput(payorIncomeForValidation, payeeIncomeForValidation, input.marriageInfo, input.options);

if (!validation.isValid) {
    console.error('\nValidation Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
}

if (validation.warnings.length > 0 && !noExplain) {
    console.warn('\nValidation Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('');
}

// Prepare income objects for spousal support calculation
const payorIncome = {
    grossIncome: input.payor.grossIncome,
    netIncome: payorTaxCalc.netIncome / 12, // Convert to monthly
    taxCalculation: payorTaxCalc
};

const payeeIncome = {
    grossIncome: input.payee.grossIncome,
    netIncome: payeeTaxCalc.netIncome / 12, // Convert to monthly
    taxCalculation: payeeTaxCalc
};

// Calculate spousal support
const supportCalc = calculateSpousalSupport(payorIncome, payeeIncome, input.options);

// Calculate duration if requested
let durationCalc = null;
let supportSchedule = null;

if (includeDuration && input.marriageInfo.marriageLengthYears) {
    durationCalc = calculateDurationScenarios(input.marriageInfo.marriageLengthYears);
    
    if (includeSchedule && durationCalc.standard.durationMonths) {
        supportSchedule = generateSupportSchedule(
            supportCalc.monthlySupport,
            durationCalc.standard.durationMonths,
            durationCalc.standard.stepDownSchedule
        );
    }
}

// Output functions
function printDisclaimer() {
    if (noExplain) return;
    console.log('\n=== DISSOMASTER CALCULATOR - IMPORTANT DISCLAIMERS ===');
    console.log('This calculator provides ESTIMATES ONLY for educational purposes.');
    console.log('Results should NOT replace certified DissoMaster software or legal counsel.');
    console.log('Actual support awards are subject to court discretion and many factors.');
    console.log('Tax calculations are simplified - consult tax professionals for accuracy.');
    console.log('Always verify results with qualified family law attorneys.');
    console.log('===============================================================\n');
}

function printIncomeAnalysis() {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    
    console.log('INCOME ANALYSIS');
    console.log('----------------');
    console.log(`Payor (Higher Earner):`);
    console.log(`  Gross Income:     ${formatter.format(payorIncome.grossIncome)}/year`);
    console.log(`  Total Taxes:      ${formatter.format(payorTaxCalc.totalTaxes)}/year`);
    console.log(`  Net Income:       ${formatter.format(payorTaxCalc.netIncome)}/year (${formatter.format(payorIncome.netIncome)}/month)`);
    console.log(`  Effective Tax Rate: ${(payorTaxCalc.effectiveTaxRate * 100).toFixed(1)}%`);
    
    console.log(`\nPayee (Lower Earner):`);
    console.log(`  Gross Income:     ${formatter.format(payeeIncome.grossIncome)}/year`);
    console.log(`  Total Taxes:      ${formatter.format(payeeTaxCalc.totalTaxes)}/year`);
    console.log(`  Net Income:       ${formatter.format(payeeTaxCalc.netIncome)}/year (${formatter.format(payeeIncome.netIncome)}/month)`);
    console.log(`  Effective Tax Rate: ${(payeeTaxCalc.effectiveTaxRate * 100).toFixed(1)}%`);
    
    console.log(`\nIncome Gap:         ${formatter.format(supportCalc.calculations.incomeGap * 12)}/year (${formatter.format(supportCalc.calculations.incomeGap)}/month)`);
}

function printSupportCalculation() {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    
    console.log('\nSPOUSAL SUPPORT CALCULATION');
    console.log('-----------------------------');
    console.log(`Base Support (40% of income gap): ${formatter.format(supportCalc.calculations.baseSupport)}/month`);
    
    if (input.options.childSupport > 0) {
        console.log(`Child Support Offset (50%):       -${formatter.format(supportCalc.calculations.childSupportOffset)}/month`);
    }
    
    if (input.options.hardshipDeduction > 0) {
        console.log(`Hardship Deduction:               -${formatter.format(input.options.hardshipDeduction)}/month`);
    }
    
    console.log(`\nRECOMMENDED MONTHLY SUPPORT:      ${formatter.format(supportCalc.monthlySupport)}`);
    console.log(`Annual Support Total:             ${formatter.format(supportCalc.monthlySupport * 12)}`);
    
    // Show percentage of payor's net income
    const supportPercentage = (supportCalc.monthlySupport * 12) / payorTaxCalc.netIncome * 100;
    console.log(`Percentage of Payor's Net Income: ${supportPercentage.toFixed(1)}%`);
}

function printDurationAnalysis() {
    if (!durationCalc) return;
    
    console.log('\nSUPPORT DURATION ANALYSIS');
    console.log('-------------------------');
    console.log(`Marriage Length: ${input.marriageInfo.marriageLengthYears.toFixed(1)} years`);
    
    if (durationCalc.standard.isIndefinite) {
        console.log('Duration: No specific end date (marriage 10+ years)');
        console.log('Support may continue indefinitely subject to court discretion');
    } else {
        console.log(`Standard Duration: ${durationCalc.standard.durationMonths} months (${durationCalc.standard.durationYears.toFixed(1)} years)`);
        console.log(`Conservative: ${durationCalc.conservative.durationMonths} months`);
        console.log(`Liberal: ${durationCalc.liberal.durationMonths} months`);
    }
    
    if (durationCalc.standard.notes.length > 0) {
        console.log('\nNotes:');
        durationCalc.standard.notes.forEach(note => console.log(`  - ${note}`));
    }
}

function printPaymentSchedule() {
    if (!supportSchedule) return;
    
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    
    console.log('\nPAYMENT SCHEDULE');
    console.log('----------------');
    console.log('Month | Amount    | Notes');
    console.log('------|-----------|------------------');
    
    // Show first 5 months
    for (let i = 0; i < Math.min(5, supportSchedule.length); i++) {
        const payment = supportSchedule[i];
        const month = payment.month.toString().padStart(5);
        const amount = formatter.format(payment.amount).padStart(9);
        const notes = payment.isStepDown ? 'Step-down applied' : '';
        console.log(`${month} | ${amount} | ${notes}`);
    }
    
    // If schedule is long, show ellipsis and step-downs
    if (supportSchedule.length > 10) {
        console.log('  ... | (continued) | ');
        
        // Show step-down months
        const stepDownMonths = supportSchedule.filter(p => p.isStepDown);
        stepDownMonths.forEach(payment => {
            const month = payment.month.toString().padStart(5);
            const amount = formatter.format(payment.amount).padStart(9);
            const notes = 'Step-down applied';
            console.log(`${month} | ${amount} | ${notes}`);
            
            // Show a few months after each step-down
            const nextFew = supportSchedule.slice(payment.month, payment.month + 3);
            nextFew.forEach(p => {
                if (!p.isStepDown) {
                    const m = p.month.toString().padStart(5);
                    const a = formatter.format(p.amount).padStart(9);
                    console.log(`${m} | ${a} | `);
                }
            });
        });
        
        // Show last few months
        console.log('  ... | (continued) | ');
        const lastFew = supportSchedule.slice(-3);
        lastFew.forEach(payment => {
            const month = payment.month.toString().padStart(5);
            const amount = formatter.format(payment.amount).padStart(9);
            console.log(`${month} | ${amount} | `);
        });
    } else {
        // Show remaining months for short schedules
        for (let i = 5; i < supportSchedule.length; i++) {
            const payment = supportSchedule[i];
            const month = payment.month.toString().padStart(5);
            const amount = formatter.format(payment.amount).padStart(9);
            const notes = payment.isStepDown ? 'Step-down applied' : '';
            console.log(`${month} | ${amount} | ${notes}`);
        }
    }
    
    const totalSupport = supportSchedule.reduce((sum, payment) => sum + payment.amount, 0);
    console.log('------|-----------|------------------');
    console.log(`Total | ${formatter.format(totalSupport).padStart(9)} | ${supportSchedule.length} payments`);
}

// Main output
printDisclaimer();

if (!summaryOnly) {
    printIncomeAnalysis();
}

printSupportCalculation();

if (includeDuration) {
    printDurationAnalysis();
}

if (includeSchedule) {
    printPaymentSchedule();
}

// Output JSON if requested
const outIdx = argv.indexOf('--out-json');
if (outIdx !== -1 && argv[outIdx + 1]) {
    const outPath = argv[outIdx + 1];
    try {
        const { writeJson } = require('./utils/fs');
        const output = {
            inputs: input,
            payorTaxCalculation: payorTaxCalc,
            payeeTaxCalculation: payeeTaxCalc,
            supportCalculation: supportCalc,
            durationAnalysis: durationCalc,
            paymentSchedule: supportSchedule,
            calculatedAt: new Date().toISOString()
        };
        writeJson(outPath, output);
        console.log(`\nWrote calculation results to ${outPath}`);
    } catch (e) {
        console.error('Failed to write --out-json file:', e.message);
    }
}

// Export for testing
module.exports = {
    calculateSpousalSupport,
    calculateNetIncome,
    calculateTotalTaxes,
    calculateSupportDuration
};