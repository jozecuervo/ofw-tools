/**
 * Apportionment & Buyout Calculator (Moore/Marsden with Watts/Epstein/Fees)
 *
 * Purpose
 * - Compute separate vs. community interests using pro-rata apportionment (Moore/Marsden),
 *   and derive illustrative buyout amounts after applying Watts (exclusive use) credits,
 *   Epstein reimbursements, and attorney fees.
 *
 * CLI
 * - node apportionment-calc.js [--config <path-to-json>] [--out-json <path>]
 *   --config: Provide inputs via JSON (see fields below)
 *   --out-json: Write computed results to a JSON file
 */

const path = require('path');
const fs = require('fs');

// Function to calculate proportionate interest in the property
// This function implements the principle of pro-rata apportionment,
// dividing the total property value based on the proportion of each contribution (separate/community).
/**
 * Proportionate share of the property value for a given contribution.
 * @param {number} contribution
 * @param {number} totalContribution
 * @param {number} propertyValue
 * @returns {number}
 */
function calculateShare(contribution, totalContribution, propertyValue) {
    return (contribution / totalContribution) * propertyValue;
}

// Function to calculate the fair buyout amount using Moore/Marsden and credits for Watts, Epstein, and attorney fees.
// Legal Reference: In re Marriage of Moore (1980) 28 Cal.3d 366; In re Marriage of Marsden (1982) 130 Cal.App.3d 426.
// It calculates the proportionate interests of both parties and adjusts for credits.
/**
 * Compute illustrative buyout amounts after applying credits and fees.
 * @param {{
 *   yourSeparateShare: number,
 *   herSeparateShare: number,
 *   communityShare: number,
 *   postSeparationShare: number,
 *   wattsCredit: number,
 *   epsteinCredit: number,
 *   attorneyFees: number,
 * }} input
 * @returns {{ yourBuyout: number, herBuyout: number }}
 */
function calculateBuyout({
    yourSeparateShare,
    herSeparateShare,
    communityShare,
    postSeparationShare, // Properly counted as her separate contribution under Epstein credits.
    wattsCredit,         // Watts Credit for exclusive use of the family residence post-separation.
    epsteinCredit,       // Epstein Credit for payments made by her toward community obligations post-separation.
    attorneyFees,        // Attorney fees can be factored in the buyout.
}) {
    const totalCommunityValue = communityShare; // The community share of the home's value, excluding post-separation payments.
    
    // Calculate each party's total interest after applying credits and attorney fees.
    // Legal Reference: Moore/Marsden for property share; Watts for rent credits; Epstein for reimbursement of payments post-separation.
    const totalYourInterest = yourSeparateShare + (totalCommunityValue / 2) + wattsCredit - epsteinCredit - attorneyFees;
    const totalHerInterest = herSeparateShare + postSeparationShare + (totalCommunityValue / 2) + epsteinCredit - wattsCredit + attorneyFees;
    
    // Log values for clarity
    console.log(`Total Community Value (excluding post-separation payments): ${totalCommunityValue.toFixed(2)}`);
    console.log(`Your Total Interest (after Watts, Epstein, and Attorney Fees): ${totalYourInterest.toFixed(2)}`);
    console.log(`Her Total Interest (after Watts, Epstein, and Attorney Fees): ${totalHerInterest.toFixed(2)}`);
    
    return {
        yourBuyout: totalHerInterest,  // The amount you would need to pay to buy her out.
        herBuyout: totalYourInterest   // The amount she would need to pay to buy you out.
    };
}

/**
 * Compute apportionment shares, ratios, credits and buyout from inputs.
 * @param {{
 *   houseValueAtPurchase:number,
 *   yourSeparateInterest:number,
 *   herSeparateInterest:number,
 *   mortgageAtPurchase:number,
 *   principalPaidDuringMarriage:number,
 *   mortgageAtSeparation:number,
 *   appraisedValue:number,
 *   principalPaidAfterSeparationByHer:number,
 *   monthsSinceSeparation:number,
 *   monthlyRent:number,
 *   attorneyFees:number,
 * }} p
 * @returns {{ totals: object, ratios: object, shares: object, credits: object, buyout: object, inputs: object }}
 */
function computeApportionment(p) {
    const totalContribution = p.yourSeparateInterest + p.herSeparateInterest + p.principalPaidDuringMarriage;
    const remainingMortgage = p.mortgageAtSeparation - p.principalPaidAfterSeparationByHer;
    const netPropertyValue = p.appraisedValue - remainingMortgage;

    const yourSeparateShare = calculateShare(p.yourSeparateInterest, totalContribution, netPropertyValue);
    const herSeparateShare = calculateShare(p.herSeparateInterest, totalContribution, netPropertyValue);
    const communityShare = calculateShare(p.principalPaidDuringMarriage, totalContribution, netPropertyValue);
    const postSeparationShare = calculateShare(p.principalPaidAfterSeparationByHer, totalContribution, netPropertyValue);

    const ratios = {
        yourInterestRatio: p.yourSeparateInterest / totalContribution,
        herPostSeparationRatio: p.principalPaidAfterSeparationByHer / totalContribution,
        communityRatio: p.principalPaidDuringMarriage / totalContribution,
    };

    const wattsCredit = p.monthsSinceSeparation * (p.monthlyRent / 2);
    const epsteinCredit = p.principalPaidAfterSeparationByHer;

    const buyout = calculateBuyout({
        yourSeparateShare,
        herSeparateShare,
        communityShare,
        postSeparationShare,
        wattsCredit,
        epsteinCredit,
        attorneyFees: p.attorneyFees,
    });

    return {
        inputs: p,
        totals: { totalContribution, remainingMortgage, netPropertyValue },
        ratios,
        shares: { yourSeparateShare, herSeparateShare, communityShare, postSeparationShare },
        credits: { wattsCredit, epsteinCredit, attorneyFees: p.attorneyFees },
        buyout,
    };
}

// CLI config support
function printHelp() {
    console.log(`\nUsage: node apportionment-calc.js [--config <path-to-json>] [--out-json <path>]\n\nNotes:\n  - If --config is not provided, the tool will look for source_files/apportionment.config.json (gitignored).\n\nConfig JSON fields (optional, overrides defaults):\n  houseValueAtPurchase, yourSeparateInterest, herSeparateInterest, mortgageAtPurchase,\n  principalPaidDuringMarriage, mortgageAtSeparation, appraisedValue,\n  principalPaidAfterSeparationByHer, monthsSinceSeparation, monthlyRent, attorneyFees\n`);
}

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
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
    const defaultCfgPath = path.join(__dirname, 'source_files', 'apportionment.config.json');
    if (fs.existsSync(defaultCfgPath)) {
        try {
            config = JSON.parse(fs.readFileSync(defaultCfgPath, 'utf8'));
            console.log(`Using configuration from ${defaultCfgPath}`);
        } catch (e) {
            console.error('Failed to read default config JSON:', e.message);
            process.exit(1);
        }
    }
}

// Home purchase details
// Use neutral, even-number defaults to illustrate the math clearly
const houseValueAtPurchase = config.houseValueAtPurchase ?? 1000000;
const yourSeparateInterest = config.yourSeparateInterest ?? 400000;
const herSeparateInterest = config.herSeparateInterest ?? 100000;
const mortgageAtPurchase = config.mortgageAtPurchase ?? 500000;

// Home details at separation
const principalPaidDuringMarriage = config.principalPaidDuringMarriage ?? 200000;
const mortgageAtSeparation = config.mortgageAtSeparation ?? 100000;

// Home details at division of assets (current value at division)
const appraisedValue = config.appraisedValue ?? 1200000;
const principalPaidAfterSeparationByHer = config.principalPaidAfterSeparationByHer ?? 20000;
const remainingMortgage = mortgageAtSeparation - principalPaidAfterSeparationByHer;  // Remaining mortgage after her post-separation payments.

// Credits
const monthsSinceSeparation = config.monthsSinceSeparation ?? 12;
const monthlyRent = config.monthlyRent ?? 3000;
// Watts Credit: Rent owed to you for her exclusive use of the home post-separation.
// Legal Reference: In re Marriage of Watts (1985) 171 Cal.App.3d 366.
const wattsCredit = monthsSinceSeparation * (monthlyRent / 2);  // Watts credit calculation.

// Epstein Credit: Reimbursement owed to her for paying community obligations (mortgage) post-separation.
// Legal Reference: In re Marriage of Epstein (1979) 24 Cal.3d 76.
const epsteinCredit = principalPaidAfterSeparationByHer;  

// Attorney Fees: These can be factored into the buyout as well.
// Legal Reference: Family Code Section 2030.
const attorneyFees = config.attorneyFees ?? 10000;

const { totals, ratios, shares, credits, buyout } = computeApportionment({
    houseValueAtPurchase,
    yourSeparateInterest,
    herSeparateInterest,
    mortgageAtPurchase,
    principalPaidDuringMarriage,
    mortgageAtSeparation,
    appraisedValue,
    principalPaidAfterSeparationByHer,
    monthsSinceSeparation,
    monthlyRent,
    attorneyFees,
});

// Logging for verification and clarity
console.log(`Home Details:\n`);
console.log(`House Value at Purchase: $${houseValueAtPurchase}`);
console.log(`Mortgage at Purchase: $${mortgageAtPurchase}`);
console.log(`Your Separate Interest: $${yourSeparateInterest}`);
console.log(`Her Separate Interest: $${herSeparateInterest}`);
console.log(`Mortgage remaining at Separation: $${mortgageAtSeparation}`);

console.log(`\nMortgage contributions:\n`);
console.log(`Community Paid Principal: $${principalPaidDuringMarriage}`);
console.log(`Principal Paid after Separation by Her: $${principalPaidAfterSeparationByHer}`);
console.log(`Total principal contributions: $${totals.totalContribution}`);

console.log(`\nCalculate current home equity \n`);
console.log(`Appraised Value: $${appraisedValue}`);
console.log(`Current Remaining Mortgage: $${totals.remainingMortgage}`);
console.log(`Current Net Home value after Mortgage: $${totals.netPropertyValue}`);

console.log(`\nCalculate pro-rata percentages \n`);
console.log(`Your ratio: ${ratios.yourInterestRatio.toFixed(3)}`);
console.log(`Her ratio: ${ratios.herPostSeparationRatio.toFixed(3)}`);
console.log(`Community ratio: ${ratios.communityRatio.toFixed(3)}`);

console.log(`\nCalculate pro-rated shares \n`);
console.log(`Community Property Interest: $${shares.communityShare.toFixed(2)}`);
console.log(`Your Separate Property Share of Current Value: $${shares.yourSeparateShare.toFixed(2)}`);
console.log(`Her Separate Property Share of Current Value: $${shares.herSeparateShare.toFixed(2)}`);
console.log(`Her Post-Separation Property Share: $${shares.postSeparationShare.toFixed(2)}`);

console.log(`\nCredits:\n`);
console.log(`Months since Separation: ${monthsSinceSeparation}`);
console.log(`Watts Credit: ${monthsSinceSeparation} months x $${monthlyRent / 2} = $${credits.wattsCredit}`);
console.log(`Epstein Credit: $${credits.epsteinCredit}`);
console.log(`Attorney Fees: $${credits.attorneyFees}`);

// Step 4: Calculate Buyout Amounts with Watts and Epstein Credits
// Legal References for buyout adjustments: Moore/Marsden, Watts, Epstein, and Family Code Section 2030 for attorney fees.
const buyoutAmounts = buyout;

console.log(`\nBuyout amounts after credits:\n`);
// Calculate the buyout amounts after credits, factoring in Moore/Marsden calculations and other adjustments.
console.log(`You would need to pay her: $${buyoutAmounts.yourBuyout.toFixed(2)} to buy her out.`);
console.log(`She would need to pay you: $${buyoutAmounts.herBuyout.toFixed(2)} to buy you out.`);

// Optional JSON output
const jsonOutIdx = argv.indexOf('--out-json');
if (jsonOutIdx !== -1 && argv[jsonOutIdx + 1]) {
    const outPath = argv[jsonOutIdx + 1];
    try {
        const { writeJson } = require('./utils/fs');
        writeJson(outPath, { totals, ratios, shares, credits, buyout });
        console.log(`\nWrote detailed results to ${outPath}`);
    } catch (e) {
        console.error('Failed to write --out-json file:', e.message);
    }
}

module.exports = { calculateShare, calculateBuyout };
