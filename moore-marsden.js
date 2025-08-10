/**
 * Moore/Marsden Worksheet Calculator
 *
 * IMPORTANT LEGAL DISCLAIMER:
 * This tool is for educational and calculation purposes only and does not constitute legal advice.
 * Property division in divorce involves complex legal issues that vary by jurisdiction and individual
 * circumstances. Always consult with a qualified family law attorney before making decisions based
 * on these calculations. This tool does not account for many factors that may affect property
 * characterization, including transmutations, agreements, refinances, improvements, or other legal doctrines.
 *
 * Purpose
 * - Compute Separate Property (SP) and Community Property (CP) interests for a residence
 *   using the Moore/Marsden approach with a clear, worksheet-style output.
 *
 * Legal background (California)
 * - In re Marriage of Moore (1980) 28 Cal.3d 366, 374-375 [169 Cal.Rptr. 619, 618 P.2d 208]
 * - In re Marriage of Marsden (1982) 130 Cal.App.3d 426, 435-437 [181 Cal.Rptr. 910]
 * - Family Code §§ 760 (community property), 770 (separate property), 2640 (SP reimbursements)
 * - In re Marriage of Aufmuth (1979) 89 Cal.App.3d 446 (early Moore/Marsden development)
 * - Recent appellate guidance: In re Marriage of Walrath (1998) 17 Cal.4th 907 (transmutation requirements)
 *
 * Case Citations and Key Holdings:
 * - Moore v. Moore: Established that community acquires pro tanto interest in appreciation based on
 *   community principal payments relative to original purchase price
 * - Marsden v. Marsden: Clarified application of Moore formula to post-separation scenarios and
 *   confirmed that appreciation during marriage is allocated proportionately
 *
 * Statutory quotes (California Family Code)
 * - § 760 (Community property presumption):
 *   "Except as otherwise provided by statute, all property, real or personal, wherever situated,
 *    acquired by a married person during the marriage while domiciled in this state is community property."
 *   Source: Cal. Fam. Code § 760 (West 2023)
 *
 * - § 770(a) (Separate property defined):
 *   "Separate property of a married person includes:
 *     (1) All property owned by the person before marriage.
 *     (2) All property acquired by the person after marriage by gift, bequest, devise, or descent.
 *     (3) The rents, issues, and profits of the property described in this section."
 *   Source: Cal. Fam. Code § 770(a) (West 2023)
 *
 * - § 2640(a), (b) (Reimbursement for SP contributions to acquisition of CP):
 *   "(a) In the division of the community estate under this division, unless a party has made a written
 *    waiver of the right to reimbursement or has signed a writing that has the effect of a waiver, the party
 *    shall be reimbursed for the party’s contributions to the acquisition of property of the community estate
 *    to the extent the party traces the contributions to a separate property source."
 *   "(b) A party shall be reimbursed for separate property contributions to the acquisition of property to
 *    the extent the party traces the contributions to a separate property source. Contributions to the acquisition
 *    of property include downpayments, payments for improvements, and payments that reduce the principal of a loan
 *    used to finance the purchase or improvements of the property but do not include payments of interest on the loan
 *    or payments made for maintenance, insurance, or taxation of the property."
 *   Source: Cal. Fam. Code § 2640(a)-(b) (West 2023)
 *
 * Core rule
 * - Community share of appreciation during marriage = (CP principal reduction ÷ purchase price) × appreciation during marriage.
 * - SP interest consists of: down payment + SP principal reduction + pre‑marital appreciation + SP share of appreciation.
 * - CP interest consists of: CP principal reduction + CP share of appreciation.
 * - Only principal reduction counts. Interest, taxes, insurance, and routine maintenance are excluded from the Moore/Marsden ratio.
 *
 * Scope and assumptions
 * - This worksheet assumes a single acquisition loan and does not account for later refinances, title transmutations,
 *   or capital improvements; those events can alter characterization and require adjustments beyond this worksheet.
 * - Figures should be based on documentation (amortization schedules, statements, appraisals). Use of estimates can skew results.
 *
 * CLI
 * - node moore-marsden.js [--config <path-to-json>] [--out-json <path>]
 *   --config: Provide inputs via JSON; otherwise the tool will look for
 *             source_files/moore-marsden.config.json (gitignored) if present.
 *   --out-json: Write a machine-readable JSON summary of the worksheet results.
 *   --summary: Print only lines 12–13 (SP/CP interests)
 *   --no-explain: Hide explanatory header
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
 * Family Code § 2640(b) confirms that qualifying contributions include principal reduction, but exclude interest,
 * taxes, insurance, and routine maintenance payments.
 * @param {number} paymentsWithCommunityFunds - Total CP principal reduction during marriage
 * @param {number} purchasePrice - Original purchase price
 * @returns {number} proportion in [0,1]
 */
function computeCommunityProportion(paymentsWithCommunityFunds, purchasePrice) {
    if (!(purchasePrice > 0)) throw new Error('Purchase price must be > 0');
    const ratio = paymentsWithCommunityFunds / purchasePrice;
    return Math.max(0, Math.min(1, ratio));
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

function reconcileIfPossible(input, worksheet) {
    const { purchasePrice: PP, fairMarketAtDivision: FMVd, originalLoan, loanAtDivision: L2 } = input;
    if (originalLoan == null || L2 == null) return;
    const dp = input.downPayment ?? 0;
    const spP = input.paymentsWithSeparateFunds ?? 0;
    const cpP = input.paymentsWithCommunityFunds ?? 0;

    const equityWorksheet = (dp + spP + cpP) + (FMVd - PP);
    const equityLoans = FMVd - L2;

    const impliedL0 = PP - dp;
    if (originalLoan != null && Math.abs(originalLoan - impliedL0) > 0.01) {
        console.warn(`Original loan mismatch: given ${originalLoan.toFixed(2)} vs implied ${(impliedL0).toFixed(2)}.`);
    }
    if (Math.abs(equityWorksheet - equityLoans) > 0.01) {
        console.warn(`Equity mismatch: worksheet ${equityWorksheet.toFixed(2)} vs FMV-L2 ${equityLoans.toFixed(2)}. Check for refi/HELOC/improvements.`);
    }
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

    return { line7Result, line8Result, line9Result, line10Result, line11Result, spInterest, cpInterest };
}

function printHelp() {
    console.log(`\nUsage: node moore-marsden.js [--config <path-to-json>] [--out-json <path>] [--summary] [--no-explain] [--context <acquisitionContext>]\n\nConfig JSON fields (optional):\n  purchasePrice, downPayment, paymentsWithSeparateFunds, fairMarketAtMarriage,\n  paymentsWithCommunityFunds, fairMarketAtDivision,\n  originalLoan, loanAtDivision, acquisitionContext,\n  spPrincipalPreMarriage, spPrincipalDuringMarriage\n\nNotes:\n  - acquisitionContext: 'premaritalOwner' (default) or 'jointTitleDuringMarriage'\n  - If spPrincipalPreMarriage/spPrincipalDuringMarriage are provided, they will be summed into Line 3.\n`);
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

// Optional inline context override via CLI
const ctxIdx = argv.indexOf('--context');
if (ctxIdx !== -1 && argv[ctxIdx + 1]) {
    config.acquisitionContext = argv[ctxIdx + 1];
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

// Support optional split SP principal fields; sum into Line 3 if provided
if (config.spPrincipalPreMarriage != null || config.spPrincipalDuringMarriage != null) {
    const spPre = Number(config.spPrincipalPreMarriage || 0);
    const spDuring = Number(config.spPrincipalDuringMarriage || 0);
    input.paymentsWithSeparateFunds = spPre + spDuring;
}

// Run the calculation and optionally emit JSON
const worksheet = computeMooreMarsden(
    input.purchasePrice,
    input.downPayment,
    input.paymentsWithSeparateFunds,
    input.fairMarketAtMarriage,
    input.paymentsWithCommunityFunds,
    input.fairMarketAtDivision
);

// Context and sanity warnings
if (input.fairMarketAtDivision < input.fairMarketAtMarriage) {
    console.warn('Warning: FMV@Division < FMV@Marriage (negative appreciation during marriage).');
}
if (input.acquisitionContext === 'jointTitleDuringMarriage') {
    console.warn('Context: jointTitleDuringMarriage detected. Use §2640 reimbursement method; MM is not the correct regime.');
}
// Refi/HELOC scope warning
if (argv.includes('--refi') || (input.purchasePrice != null && input.downPayment != null && input.purchasePrice < input.downPayment)) {
    console.warn('Refi/HELOC or purchase price < down payment indicated. This worksheet does not model refinances/HELOCs; results may not reconcile.');
}

reconcileIfPossible(input, worksheet);

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
    // Show-your-work breakdowns
    console.log(`7. Appreciation before marriage:                ${currencyFormatter.format(worksheet.line7Result)} = FMV@Marriage (${currencyFormatter.format(input.fairMarketAtMarriage)}) − Purchase (${currencyFormatter.format(input.purchasePrice)})`);
    console.log(`8. Appreciation during marriage:                ${currencyFormatter.format(worksheet.line8Result)} = FMV@Division (${currencyFormatter.format(input.fairMarketAtDivision)}) − FMV@Marriage (${currencyFormatter.format(input.fairMarketAtMarriage)})`);
    console.log(`9. Proportion of community payments (CP/Purchase Price): ${percentageFormatter.format(worksheet.line9Result)} = CP Principal (${currencyFormatter.format(input.paymentsWithCommunityFunds)}) ÷ Purchase (${currencyFormatter.format(input.purchasePrice)})`);
    console.log(`10. Community share of appreciation:            ${currencyFormatter.format(worksheet.line10Result)} = Line 8 (${currencyFormatter.format(worksheet.line8Result)}) × Line 9 (${percentageFormatter.format(worksheet.line9Result)})`);
    console.log(`11. Separate property share of appreciation:    ${currencyFormatter.format(worksheet.line11Result)} = Line 8 (${currencyFormatter.format(worksheet.line8Result)}) − Line 10 (${currencyFormatter.format(worksheet.line10Result)})`);
    console.log(`---------------------------------------------------------------`);
}

function printSummary() {
    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    console.log(`12. Separate Property Interest (SP Interest):   ${currencyFormatter.format(worksheet.spInterest)} = Down Payment (${currencyFormatter.format(input.downPayment)}) + SP Principal (${currencyFormatter.format(input.paymentsWithSeparateFunds)}) + Line 7 (${currencyFormatter.format(worksheet.line7Result)}) + Line 11 (${currencyFormatter.format(worksheet.line11Result)})`);
    console.log(`13. Community Property Interest (CP Interest):  ${currencyFormatter.format(worksheet.cpInterest)} = CP Principal (${currencyFormatter.format(input.paymentsWithCommunityFunds)}) + Line 10 (${currencyFormatter.format(worksheet.line10Result)})\n`);
    if (input.paymentsWithCommunityFunds > input.purchasePrice) {
        console.warn('Warning: CP principal exceeds purchase price. Check inputs for purchase price and principal amounts.');
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
        const { writeJson } = require('./utils/fs');
        writeJson(outPath, { inputs: input, worksheet });
        console.log(`\nWrote worksheet JSON to ${outPath}`);
    } catch (e) {
        console.error('Failed to write --out-json file:', e.message);
    }
}

module.exports = {
    computeMooreMarsden,
    calculateMooreMarsden,
};
