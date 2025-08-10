/**
 * Apportionment & Buyout Calculator (Moore/Marsden with separate Watts/Epstein ledgers)
 *
 * Purpose
 * - Compute Separate Property (SP) and Community Property (CP) interests using a Moore/Marsden
 *   style apportionment based on purchase price (PP), not on contribution-proportions of current equity.
 * - Keep Watts (exclusive use) and Epstein (post-separation principal) as separate ledgers applied
 *   after property interests are determined. Do NOT blend them into the equity math.
 *
 * Legal anchors (California)
 * - In re Marriage of Moore (1980) 28 Cal.3d 366; In re Marriage of Marsden (1982) 130 Cal.App.3d 426
 * - Family Code §§ 760, 770, 2640 (principal reduction only; exclude interest/taxes/insurance for MM ratio)
 * - In re Marriage of Epstein (1979) 24 Cal.3d 76 (post-separation principal reimbursements)
 * - In re Marriage of Watts (1985) 171 Cal.App.3d 366 (exclusive use charge; fair rental value offsets)
 *
 * CLI
 * - node apportionment-calc.js [--config <path-to-json>] [--out-json <path>]
 *   --config: Provide inputs via JSON (see fields below)
 *   --out-json: Write computed results to a JSON file
 *
 * Inputs (JSON)
 * - houseValueAtPurchase (PP)
 * - appraisedValue (FMV at valuation/division)
 * - mortgageAtPurchase (L0)
 * - mortgageAtSeparation (L1)
 * - principalPaidDuringMarriage (Cp = L0 - L1)
 * - principalPaidAfterSeparationByHer, principalPaidAfterSeparationByYou (Epstein credits)
 * - yourSeparateInterest (Sy): DP + SP principal (traceable separate)
 * - herSeparateInterest (Sh): DP + SP principal (traceable separate)
 * - acquisitionContext: 'premaritalOwner' | 'jointTitleDuringMarriage' | 'separateTitleDuringMarriage'
 * - Optional improvements (simplified): cpImpr, spImprYou, spImprHer
 * - Optional Watts inputs:
 *   - fairMonthlyRentalValue, monthsSinceSeparation
 *   - occupant: 'you' | 'her' (who had exclusive use)
 *   - monthlyMortgageInterest, monthlyPropertyTaxes, monthlyInsurance, monthlyNecessaryRepairs
 *
 * Notes
 * - This tool is educational, not legal advice. Real cases may require adjustments for refinances,
 *   capital improvements, transmutations, and equities. Attorney’s fees (§2030) are not included here.
 */

const path = require('path');
const fs = require('fs');

/**
 * Compute Moore/Marsden-style equities for CP and each spouse's SP using purchase price as denominator.
 * A = FMV − PP. Each bucket's share of appreciation is computed directly over PP: (bucket / PP) × A.
 * This mirrors orthodox MM: every dollar of qualifying contribution buys a fixed fraction at acquisition.
 */
function computeMooreMarsdenThreeBucket(PP, FMV, Cp, Sy, Sh) {
    if (!(PP > 0)) throw new Error('PP must be > 0');
    const appreciation = FMV - PP;
    const cpShareOfA = (Cp / PP) * appreciation;
    const yShareOfA = (Sy / PP) * appreciation;
    const hShareOfA = (Sh / PP) * appreciation;

    const cp = {
        principal: Cp,
        shareOfAppreciation: cpShareOfA,
        equity: Cp + cpShareOfA,
    };
    const you = {
        principal: Sy,
        shareOfAppreciation: yShareOfA,
        equity: Sy + yShareOfA,
    };
    const her = {
        principal: Sh,
        shareOfAppreciation: hShareOfA,
        equity: Sh + hShareOfA,
    };

    return { appreciation, cp, you, her };
}

// Regime-aware apportionment function (Moore/Marsden vs §2640)
function apportionEquity({ acquisitionContext, PP, FMV, L0, L1, L2, Sy, Sh, cpImpr = 0, spImprYou = 0, spImprHer = 0, principalPaidDuringMarriageProvided }) {
    if (!(PP > 0)) {
        throw new Error('Invalid purchase price (PP). Must be > 0.');
    }
    const CpFromLoans = (L0 ?? 0) - (L1 ?? 0);
    if (principalPaidDuringMarriageProvided != null) {
        const diff = Math.abs(CpFromLoans - principalPaidDuringMarriageProvided);
        if (diff > 0.01) {
            console.warn(`Warning: Cp mismatch. L0-L1 = ${CpFromLoans.toFixed(2)} vs provided principalPaidDuringMarriage = ${principalPaidDuringMarriageProvided.toFixed(2)}.`);
        }
    }
    const totalEquity = FMV - (L2 ?? 0);
    if (totalEquity < 0) {
        console.warn('Warning: Negative total equity at valuation (FMV < L2). Check inputs.');
    }

    if (acquisitionContext === 'jointTitleDuringMarriage') {
        const spReimbYou = (Sy ?? 0) + (spImprYou ?? 0);
        const spReimbHer = (Sh ?? 0) + (spImprHer ?? 0);
        let cpEquity = totalEquity - spReimbYou - spReimbHer;
        if (cpEquity < -0.01) {
            console.warn('§2640: SP reimbursements exceed total equity. Review tracing/inputs.');
            cpEquity = 0;
        } else if (cpEquity < 0) {
            cpEquity = 0;
        }
        if ((spReimbYou + spReimbHer) > (FMV * 0.9)) {
            console.warn('§2640: Large SP reimbursements relative to FMV. Ensure this is not a Moore/Marsden scenario.');
        }
        return { regime: '2640', you: { equity: spReimbYou }, her: { equity: spReimbHer }, cp: { equity: cpEquity }, mm: null };
    }

    const Cp = ((CpFromLoans > 0 ? CpFromLoans : (principalPaidDuringMarriageProvided ?? 0))) + (cpImpr ?? 0);
    const SyAdj = (Sy ?? 0) + (spImprYou ?? 0);
    const ShAdj = (Sh ?? 0) + (spImprHer ?? 0);
    const mm = computeMooreMarsdenThreeBucket(PP, FMV, Cp, SyAdj, ShAdj);
    return { regime: 'Moore/Marsden', you: { equity: mm.you.equity }, her: { equity: mm.her.equity }, cp: { equity: mm.cp.equity }, mm };
}

/**
 * Compute baseline equities and then apply Watts/Epstein to derive buyout figures.
 * Attorney fees are intentionally excluded here.
 *
 * @param {{
 *   PP:number, FMV:number,
 *   L0:number, L1:number, L2:number,
 *   Sy:number, Sh:number,
 *   acquisitionContext:string,
 *   cpImpr?:number, spImprYou?:number, spImprHer?:number,
 *   principalPaidDuringMarriageProvided?:number,
 *   watts:{ occupant:'you'|'her'|null, fairMonthlyRentalValue:number, months:number, offsets:{interest:number,taxes:number,insurance:number,repairs:number} },
 *   epstein:{ you:number, her:number },
 * }} input
 * @returns {{
 *   baseline:{ community:number, yourSP:number, herSP:number, yourBaseline:number, herBaseline:number, totalEquity:number },
 *   credits:{ watts:{ occupant:string|null, gross:number, offsets:number, net:number }, epstein:{ you:number, her:number } },
 *   net:{ your:number, her:number },
 *   buyout:{ yourBuyout:number, herBuyout:number }
 * }}
 */
function calculateBuyout({ PP, FMV, L0, L1, L2, Sy, Sh, acquisitionContext, cpImpr, spImprYou, spImprHer, principalPaidDuringMarriageProvided, watts, epstein }) {
    const apportion = apportionEquity({ acquisitionContext, PP, FMV, L0, L1, L2, Sy, Sh, cpImpr, spImprYou, spImprHer, principalPaidDuringMarriageProvided });
    const totalEquity = FMV - L2;

    const cpEquity = apportion.cp.equity;
    const yourSPEquity = apportion.you.equity;
    const herSPEquity = apportion.her.equity;

    const yourBaseline = yourSPEquity + (cpEquity / 2);
    const herBaseline = herSPEquity + (cpEquity / 2);

    // Watts
    const months = watts?.months ?? 0;
    const frv = watts?.fairMonthlyRentalValue ?? 0;
    const occupant = watts?.occupant ?? null; // 'you' | 'her' | null
    const offsetsSumMonthly = (watts?.offsets?.interest ?? 0) + (watts?.offsets?.taxes ?? 0) + (watts?.offsets?.insurance ?? 0) + (watts?.offsets?.repairs ?? 0);
    const grossWatts = 0.5 * frv * months;
    const offsetsTotal = offsetsSumMonthly * months;
    const netWatts = Math.max(grossWatts - offsetsTotal, 0);

    let yourWattsDelta = 0;
    let herWattsDelta = 0;
    if (occupant === 'you') {
        yourWattsDelta -= netWatts;
        herWattsDelta += netWatts;
    } else if (occupant === 'her') {
        herWattsDelta -= netWatts;
        yourWattsDelta += netWatts;
    }

    // Epstein
    const epsteinYou = epstein?.you ?? 0;
    const epsteinHer = epstein?.her ?? 0;

    const yourNet = yourBaseline + yourWattsDelta + epsteinYou;
    const herNet = herBaseline + herWattsDelta + epsteinHer;

    const out = {
        regime: apportion.regime,
        mm: apportion.mm,
        baseline: {
            community: cpEquity,
            yourSP: yourSPEquity,
            herSP: herSPEquity,
            yourBaseline,
            herBaseline,
            totalEquity,
        },
        credits: {
            watts: { occupant, gross: grossWatts, offsets: offsetsTotal, net: netWatts },
            epstein: { you: epsteinYou, her: epsteinHer },
        },
        net: { your: yourNet, her: herNet },
        buyout: {
            // If you are buying her out, you pay her herNet; vice versa if she buys you out
            yourBuyout: herNet,
            herBuyout: yourNet,
        },
    };

    const sumBaseline = out.baseline.community + out.baseline.yourSP + out.baseline.herSP;
    if (Math.abs((FMV - L2) - sumBaseline) > 0.01) {
        console.warn('Equity mismatch: review L0/L1/L2, PP, improvements, or context selection.');
    }

    return out;
}

/**
 * Compute apportionment shares (MM three-bucket), credits (Watts/Epstein), and buyout from inputs.
 * @param {{
 *   houseValueAtPurchase:number,
 *   yourSeparateInterest:number,
 *   herSeparateInterest:number,
 *   mortgageAtPurchase:number,
 *   principalPaidDuringMarriage:number,
 *   mortgageAtSeparation:number,
 *   appraisedValue:number,
 *   principalPaidAfterSeparationByHer?:number,
 *   principalPaidAfterSeparationByYou?:number,
 *   monthsSinceSeparation?:number,
 *   fairMonthlyRentalValue?:number,
 *   occupant?:'you'|'her',
 *   monthlyMortgageInterest?:number,
 *   monthlyPropertyTaxes?:number,
 *   monthlyInsurance?:number,
 *   monthlyNecessaryRepairs?:number,
 * }} p
 * @returns {{ inputs: object, mm: object, baseline: object, credits: object, net: object, buyout: object, check: object }}
 */
function computeApportionment(p) {
    const PP = p.houseValueAtPurchase;
    const FMV = p.appraisedValue;
    const L0 = p.mortgageAtPurchase;
    const L1 = p.mortgageAtSeparation;
    const acquisitionContext = p.acquisitionContext || 'premaritalOwner';
    const Sy = p.yourSeparateInterest;
    const Sh = p.herSeparateInterest;

    const postSepYou = p.principalPaidAfterSeparationByYou ?? 0;
    const postSepHer = p.principalPaidAfterSeparationByHer ?? 0;
    const L2 = (p.mortgageAtSeparation - postSepYou - postSepHer);

    // optional improvements
    const cpImpr = p.cpImpr ?? 0;
    const spImprYou = p.spImprYou ?? 0;
    const spImprHer = p.spImprHer ?? 0;

    const watts = {
        occupant: p.occupant ?? null,
        fairMonthlyRentalValue: p.fairMonthlyRentalValue ?? 0,
        months: p.monthsSinceSeparation ?? 0,
        offsets: {
            interest: p.monthlyMortgageInterest ?? 0,
            taxes: p.monthlyPropertyTaxes ?? 0,
            insurance: p.monthlyInsurance ?? 0,
            repairs: p.monthlyNecessaryRepairs ?? 0,
        },
    };

    const epstein = { you: postSepYou, her: postSepHer };

    const result = calculateBuyout({
        PP,
        FMV,
        L0,
        L1,
        L2,
        Sy,
        Sh,
        acquisitionContext,
        cpImpr,
        spImprYou,
        spImprHer,
        principalPaidDuringMarriageProvided: p.principalPaidDuringMarriage,
        watts,
        epstein,
    });

    const approxCheck = {
        equityAtValuation: FMV - L2,
        baselineSum: result.baseline.community + result.baseline.yourSP + result.baseline.herSP,
        note: 'Baseline sum should be close to equityAtValuation; differences may arise from modeling simplifications.'
    };

    return {
        inputs: p,
        regime: result.regime,
        mm: result.mm,
        baseline: result.baseline,
        credits: result.credits,
        net: result.net,
        buyout: result.buyout,
        check: approxCheck,
    };
}

// CLI config support
function printHelp() {
    console.log(`\nUsage: node apportionment-calc.js [--config <path-to-json>] [--out-json <path>]\n\nNotes:\n  - If --config is not provided, the tool will look for source_files/apportionment.config.json (gitignored).\n\nConfig JSON fields (optional, overrides defaults):\n  houseValueAtPurchase (PP), appraisedValue (FMV), mortgageAtPurchase (L0), mortgageAtSeparation (L1), acquisitionContext,\n  principalPaidDuringMarriage (Cp), yourSeparateInterest (Sy), herSeparateInterest (Sh), cpImpr, spImprYou, spImprHer,\n  principalPaidAfterSeparationByYou, principalPaidAfterSeparationByHer,\n  fairMonthlyRentalValue, monthsSinceSeparation, occupant ('you'|'her'),\n  monthlyMortgageInterest, monthlyPropertyTaxes, monthlyInsurance, monthlyNecessaryRepairs\n`);
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
const principalPaidAfterSeparationByHer = config.principalPaidAfterSeparationByHer ?? 0;
const principalPaidAfterSeparationByYou = config.principalPaidAfterSeparationByYou ?? 0;
const remainingMortgage = mortgageAtSeparation - principalPaidAfterSeparationByHer - principalPaidAfterSeparationByYou;  // Remaining mortgage after post-separation principal payments.

// Credits
const monthsSinceSeparation = config.monthsSinceSeparation ?? 0;
const fairMonthlyRentalValue = config.fairMonthlyRentalValue ?? 0;
const occupant = config.occupant ?? null; // 'you' | 'her' | null
// Offsets potentially reducing Watts charge
const monthlyMortgageInterest = config.monthlyMortgageInterest ?? 0;
const monthlyPropertyTaxes = config.monthlyPropertyTaxes ?? 0;
const monthlyInsurance = config.monthlyInsurance ?? 0;
const monthlyNecessaryRepairs = config.monthlyNecessaryRepairs ?? 0;

const acquisitionContext = config.acquisitionContext ?? 'premaritalOwner';
const cpImpr = config.cpImpr ?? 0;
const spImprYou = config.spImprYou ?? 0;
const spImprHer = config.spImprHer ?? 0;

const { regime, mm, baseline, credits, net, buyout, check } = computeApportionment({
    houseValueAtPurchase,
    yourSeparateInterest,
    herSeparateInterest,
    mortgageAtPurchase,
    principalPaidDuringMarriage,
    mortgageAtSeparation,
    appraisedValue,
    principalPaidAfterSeparationByHer,
    principalPaidAfterSeparationByYou,
    monthsSinceSeparation,
    fairMonthlyRentalValue,
    occupant,
    monthlyMortgageInterest,
    monthlyPropertyTaxes,
    monthlyInsurance,
    monthlyNecessaryRepairs,
    acquisitionContext,
    cpImpr,
    spImprYou,
    spImprHer,
});

// Logging for verification and clarity
console.log(`Home Details:\n`);
console.log(`House Value at Purchase: $${houseValueAtPurchase}`);
console.log(`Mortgage at Purchase: $${mortgageAtPurchase}`);
console.log(`Your Separate Interest: $${yourSeparateInterest}`);
console.log(`Her Separate Interest: $${herSeparateInterest}`);
console.log(`Mortgage remaining at Separation: $${mortgageAtSeparation}`);

console.log(`\nPrincipal contributions (during marriage):\n`);
console.log(`Community Principal Reduction (Cp): $${principalPaidDuringMarriage}`);
console.log(`Your Separate Contributions (Sy): $${yourSeparateInterest}`);
console.log(`Her Separate Contributions (Sh): $${herSeparateInterest}`);
console.log(`Post-Separation Principal by You (Epstein): $${principalPaidAfterSeparationByYou}`);
console.log(`Post-Separation Principal by Her (Epstein): $${principalPaidAfterSeparationByHer}`);

console.log(`\nCalculate current home equity \n`);
console.log(`Appraised Value: $${appraisedValue}`);
console.log(`Current Remaining Mortgage (L2): $${remainingMortgage}`);
console.log(`Current Net Home value after Mortgage: $${(appraisedValue - remainingMortgage)}`);

console.log(`\nRegime: ${regime}`);
if (regime === 'Moore/Marsden' && mm) {
  console.log(`Appreciation during marriage (A): $${(appraisedValue - houseValueAtPurchase)}`);
  console.log(`CP share of appreciation: $${mm.cp.shareOfAppreciation.toFixed(2)}`);
  console.log(`Your SP share of appreciation: $${mm.you.shareOfAppreciation.toFixed(2)}`);
  console.log(`Her SP share of appreciation: $${mm.her.shareOfAppreciation.toFixed(2)}`);
} else if (regime === '2640') {
  console.log(`§2640 reimbursements only (no SP share of appreciation).`);
  console.log(`Note: Title in joint form → CP under Fam. Code §2581; appreciation and remaining equity are CP absent a written transmutation (anti‑Lucas/§2640).`);
}

console.log(`\nEquities (before Watts/Epstein credits): \n`);
console.log(`Community equity (Cp + CP share of A): $${baseline.community.toFixed(2)}`);
console.log(`Your SP equity (Sy + SP_y share of A): $${baseline.yourSP.toFixed(2)}`);
console.log(`Her SP equity (Sh + SP_h share of A): $${baseline.herSP.toFixed(2)}`);
console.log(`Your baseline (SP + 1/2 CP): $${baseline.yourBaseline.toFixed(2)}`);
console.log(`Her baseline (SP + 1/2 CP): $${baseline.herBaseline.toFixed(2)}`);

console.log(`\nCredits (applied after MM):\n`);
console.log(`Watts occupant: ${occupant ?? 'n/a'}`);
console.log(`Watts gross (0.5 x FRV x months): $${(0.5 * fairMonthlyRentalValue * monthsSinceSeparation).toFixed(2)}`);
const offsetsMonthlyTotal = monthlyMortgageInterest + monthlyPropertyTaxes + monthlyInsurance + monthlyNecessaryRepairs;
console.log(`Watts offsets monthly (interest+taxes+insurance+repairs): $${offsetsMonthlyTotal.toFixed(2)}`);
console.log(`Watts net charge: $${credits.watts.net.toFixed(2)}`);
console.log(`Epstein (You): $${credits.epstein.you}`);
console.log(`Epstein (Her): $${credits.epstein.her}`);

// Step 4: Calculate Buyout Amounts with Watts and Epstein Credits
// Legal References for buyout adjustments: Moore/Marsden, Watts, Epstein, and Family Code Section 2030 for attorney fees.
const buyoutAmounts = buyout;

console.log(`\nBuyout amounts after credits:\n`);
// Calculate the buyout amounts after credits, factoring in Moore/Marsden calculations and other adjustments.
console.log(`You would need to pay her: $${buyoutAmounts.yourBuyout.toFixed(2)} to buy her out.`);
console.log(`She would need to pay you: $${buyoutAmounts.herBuyout.toFixed(2)} to buy you out.`);

if (Math.abs((check.baselineSum) - (check.equityAtValuation)) > 0.01) {
    console.warn(`\nEquity mismatch: baseline sum $${check.baselineSum.toFixed(2)} vs equity at valuation $${check.equityAtValuation.toFixed(2)}.\nReview L0/L1/L2, PP, improvements, or context selection.`);
}

// Optional JSON output
const jsonOutIdx = argv.indexOf('--out-json');
if (jsonOutIdx !== -1 && argv[jsonOutIdx + 1]) {
    const outPath = argv[jsonOutIdx + 1];
    try {
        const { writeJson } = require('./utils/fs');
        writeJson(outPath, { inputs: config, regime, mm, baseline, credits, net, buyout, check });
        console.log(`\nWrote detailed results to ${outPath}`);
    } catch (e) {
        console.error('Failed to write --out-json file:', e.message);
    }
}

module.exports = { computeMooreMarsdenThreeBucket, calculateBuyout, apportionEquity };
