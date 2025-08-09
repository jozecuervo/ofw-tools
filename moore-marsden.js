/**
 * Moore/Marsden Worksheet Calculator
 *
 * Purpose
 * - Compute Separate Property (SP) and Community Property (CP) interests for a residence
 *   using the Moore/Marsden approach with a clear, worksheet-style output.
 *
 * Legal background (California)
 * - In re Marriage of Moore (1980) 28 Cal.3d 366
 * - In re Marriage of Marsden (1982) 130 Cal.App.3d 426
 * - Family Code §§ 760 (community property), 770 (separate property), 2640 (SP reimbursements)
 *
 * Core rule
 * - Community share of appreciation during marriage = (CP principal reduction ÷ purchase price) × appreciation during marriage.
 * - SP interest consists of: down payment + SP principal reduction + pre‑marital appreciation + SP share of appreciation.
 * - CP interest consists of: CP principal reduction + CP share of appreciation.
 * - Only principal reduction counts. Interest, taxes, insurance, and routine maintenance are excluded from the Moore/Marsden ratio.
 *
 * CLI
 * - node moore-marsden.js [--config <path-to-json>] [--out-json <path>]
 *   --config: Provide inputs via JSON; otherwise the tool will look for
 *             source_files/moore-marsden.config.json (gitignored) if present.
 *   --out-json: Write a machine-readable JSON summary of the worksheet results.
 */

const fs = require('fs');
const path = require('path');
// Calculation functions
function subtractLine1FromLine4(purchasePrice, fairMarketAtMarriage) {
    return fairMarketAtMarriage - purchasePrice;
}

function subtractLine4FromLine6(fairMarketAtMarriage, fairMarketAtDivision) {
    return fairMarketAtDivision - fairMarketAtMarriage;
}

/**
 * Per Moore/Marsden: community proportion of appreciation is CP principal reduction ÷ purchase price.
 * See Moore, 28 Cal.3d at 371–372 (community acquires a pro tanto interest proportionate to the community's
 * reduction of principal) and Marsden, 130 Cal.App.3d at 436–437 (community share of appreciation during marriage).
 * @param {number} paymentsWithCommunityFunds - Total CP principal reduction during marriage
 * @param {number} purchasePrice - Original purchase price
 * @returns {number} proportion in [0,1]
 */
function computeCommunityProportion(paymentsWithCommunityFunds, purchasePrice) {
    return paymentsWithCommunityFunds / purchasePrice;
}

function multiplyLine8ByLine9(line8Result, line9Result) {
    return line8Result * line9Result;
}

function subtractLine10FromLine8(line8Result, line10Result) {
    return line8Result - line10Result;
}

function calculateSPInterest(downPayment, paymentsWithSeparateFunds, line7Result, line11Result) {
    return downPayment + paymentsWithSeparateFunds + line7Result + line11Result;
}

function calculateCPInterest(communityPayments, line10Result) {
    return communityPayments + line10Result;
}

// Main calculation function with logging
/**
 * Compute the Moore/Marsden worksheet values.
 * @param {number} purchasePrice
 * @param {number} downPayment
 * @param {number} paymentsWithSeparateFunds
 * @param {number} fairMarketAtMarriage
 * @param {number} paymentsWithCommunityFunds
 * @param {number} fairMarketAtDivision
 * @returns {{
 *   line7Result:number, line8Result:number, line9Result:number,
 *   line10Result:number, line11Result:number,
 *   spInterest:number, cpInterest:number
 * }}
 */
function computeMooreMarsden(purchasePrice, downPayment, paymentsWithSeparateFunds, fairMarketAtMarriage, paymentsWithCommunityFunds, fairMarketAtDivision) {
    const line7Result = subtractLine1FromLine4(purchasePrice, fairMarketAtMarriage); // Appreciation before marriage
    const line8Result = subtractLine4FromLine6(fairMarketAtMarriage, fairMarketAtDivision); // Appreciation during marriage
    const line9Result = computeCommunityProportion(paymentsWithCommunityFunds, purchasePrice); // Community % of purchase price
    const line10Result = multiplyLine8ByLine9(line8Result, line9Result); // Community share of appreciation
    const line11Result = subtractLine10FromLine8(line8Result, line10Result); // Separate share of appreciation
    const spInterest = calculateSPInterest(downPayment, paymentsWithSeparateFunds, line7Result, line11Result);
    const cpInterest = calculateCPInterest(paymentsWithCommunityFunds, line10Result);

    return { line7Result, line8Result, line9Result, line10Result, line11Result, spInterest, cpInterest };
}

function calculateMooreMarsden(purchasePrice, downPayment, paymentsWithSeparateFunds, fairMarketAtMarriage, paymentsWithCommunityFunds, fairMarketAtDivision) {
    const { line7Result, line8Result, line9Result, line10Result, line11Result, spInterest, cpInterest } =
        computeMooreMarsden(purchasePrice, downPayment, paymentsWithSeparateFunds, fairMarketAtMarriage, paymentsWithCommunityFunds, fairMarketAtDivision);

    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const percentageFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });

    console.log(`1. Purchase price:                              ${currencyFormatter.format(purchasePrice)}`);
    console.log(`2. Down payment:                                ${currencyFormatter.format(downPayment)}`);
    console.log(`3. Principal payments made with separate funds: ${currencyFormatter.format(paymentsWithSeparateFunds)}`);
    console.log(`4. Fair Market Value at Date of Marriage:       ${currencyFormatter.format(fairMarketAtMarriage)}`);
    console.log(`5. Principal payments with community funds:     ${currencyFormatter.format(paymentsWithCommunityFunds)}`);
    console.log(`6. Fair Market Value at Date of Division:       ${currencyFormatter.format(fairMarketAtDivision)}`);
    console.log(`---------------------------------------------------------------`);
    console.log(`7. Appreciation before marriage:                ${currencyFormatter.format(line7Result)}`);
    console.log(`8. Appreciation during marriage:                ${currencyFormatter.format(line8Result)}`);
    console.log(`9. Proportion of community payments (CP/Purchase Price): ${percentageFormatter.format(line9Result)}`);
    console.log(`10. Community share of appreciation:            ${currencyFormatter.format(line10Result)}`);
    console.log(`11. Separate property share of appreciation:    ${currencyFormatter.format(line11Result)}`);
    console.log(`---------------------------------------------------------------`);
    console.log(`12. Separate Property Interest (SP Interest):   ${currencyFormatter.format(spInterest)}`);
    console.log(`13. Community Property Interest (CP Interest):  ${currencyFormatter.format(cpInterest)}\n`);
}

function printHelp() {
    console.log(`\nUsage: node moore-marsden.js [--config <path-to-json>]\n\nConfig JSON fields (optional):\n  purchasePrice, downPayment, paymentsWithSeparateFunds, fairMarketAtMarriage,\n  paymentsWithCommunityFunds, fairMarketAtDivision\n`);
}

const argv = process.argv.slice(2);
const showHelp = argv.includes('-h') || argv.includes('--help');
const summaryOnly = argv.includes('--summary');
const noExplain = argv.includes('--no-explain');
if (showHelp) {
    printHelp();
    process.exit(0);
}

let config = {};
const cfgIndex = argv.indexOf('--config');
if (cfgIndex !== -1 && argv[cfgIndex + 1]) {
    try {
        const p = argv[cfgIndex + 1];
        config = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`Using configuration from ${p}`);
    } catch (e) {
        console.error('Failed to read config JSON:', e.message);
        process.exit(1);
    }
} else {
    const defaultCfg = path.join(__dirname, 'source_files', 'moore-marsden.config.json');
    if (fs.existsSync(defaultCfg)) {
        try {
            config = JSON.parse(fs.readFileSync(defaultCfg, 'utf8'));
            console.log(`Using configuration from ${defaultCfg}`);
        } catch (e) {
            console.error('Failed to read default config JSON:', e.message);
            process.exit(1);
        }
    }
}

// Neutral, even-number defaults for clarity
const defaults = {
    purchasePrice: 400000,
    downPayment: 100000,
    paymentsWithSeparateFunds: 20000,
    fairMarketAtMarriage: 600000,
    paymentsWithCommunityFunds: 10000,
    fairMarketAtDivision: 800000,
};

const input = { ...defaults, ...config };

// Run the calculation and optionally emit JSON
const worksheet = computeMooreMarsden(
    input.purchasePrice,
    input.downPayment,
    input.paymentsWithSeparateFunds,
    input.fairMarketAtMarriage,
    input.paymentsWithCommunityFunds,
    input.fairMarketAtDivision
);

function printHeader() {
    if (noExplain) return;
    console.log('\nMoore/Marsden Worksheet (California)');
    console.log('Community share of appreciation during marriage = (CP principal reduction ÷ purchase price) × appreciation during marriage.');
    console.log('Only principal reduction counts; do not include interest, taxes, insurance, or routine maintenance.');
    console.log('References: Moore (28 Cal.3d 366), Marsden (130 Cal.App.3d 426), Fam. Code §§ 760, 770, 2640');
    console.log('');
}

function printWorksheet() {
    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const percentageFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });
    console.log(`1. Purchase price:                              ${currencyFormatter.format(input.purchasePrice)}`);
    console.log(`2. Down payment:                                ${currencyFormatter.format(input.downPayment)}`);
    console.log(`3. Principal payments made with separate funds: ${currencyFormatter.format(input.paymentsWithSeparateFunds)}`);
    console.log(`4. Fair Market Value at Date of Marriage:       ${currencyFormatter.format(input.fairMarketAtMarriage)}`);
    console.log(`5. Principal payments with community funds:     ${currencyFormatter.format(input.paymentsWithCommunityFunds)}`);
    console.log(`6. Fair Market Value at Date of Division:       ${currencyFormatter.format(input.fairMarketAtDivision)}`);
    console.log(`---------------------------------------------------------------`);
    console.log(`7. Appreciation before marriage:                ${currencyFormatter.format(worksheet.line7Result)}`);
    console.log(`8. Appreciation during marriage:                ${currencyFormatter.format(worksheet.line8Result)}`);
    console.log(`9. Proportion of community payments (CP/Purchase Price): ${percentageFormatter.format(worksheet.line9Result)}`);
    console.log(`10. Community share of appreciation:            ${currencyFormatter.format(worksheet.line10Result)}`);
    console.log(`11. Separate property share of appreciation:    ${currencyFormatter.format(worksheet.line11Result)}`);
    console.log(`---------------------------------------------------------------`);
}

function printSummary() {
    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    console.log(`12. Separate Property Interest (SP Interest):   ${currencyFormatter.format(worksheet.spInterest)}`);
    console.log(`13. Community Property Interest (CP Interest):  ${currencyFormatter.format(worksheet.cpInterest)}\n`);
    if (worksheet.line9Result > 1) {
        console.warn('Warning: CP proportion exceeds 100%. Check inputs for purchase price and principal amounts.');
    }
}

printHeader();
if (!summaryOnly) {
    printWorksheet();
}
printSummary();

const outIdx = argv.indexOf('--out-json');
if (outIdx !== -1 && argv[outIdx + 1]) {
    const outPath = argv[outIdx + 1];
    try {
        fs.writeFileSync(outPath, JSON.stringify({ inputs: input, worksheet }, null, 2));
        console.log(`\nWrote worksheet JSON to ${outPath}`);
    } catch (e) {
        console.error('Failed to write --out-json file:', e.message);
    }
}

module.exports = {
    computeMooreMarsden,
    calculateMooreMarsden,
};
