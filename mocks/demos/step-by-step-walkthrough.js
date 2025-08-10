#!/usr/bin/env node

/**
 * Step-by-Step Moore/Marsden Walkthrough
 * 
 * This demo provides a detailed, educational walkthrough of the Moore/Marsden
 * calculation process, explaining each step and the legal reasoning behind it.
 * 
 * LEGAL DISCLAIMER: This is for educational purposes only and does not constitute legal advice.
 */

const { computeMooreMarsden } = require('../../moore-marsden');

console.log('📚 MOORE/MARSDEN STEP-BY-STEP EDUCATIONAL WALKTHROUGH');
console.log('=====================================================\n');

console.log('⚠️  LEGAL DISCLAIMER: This walkthrough is for educational purposes only.');
console.log('   Always consult a qualified family law attorney for actual property division matters.\n');

// Educational scenario with clear, round numbers
const scenario = {
    purchasePrice: 400000,
    downPayment: 100000,
    paymentsWithSeparateFunds: 20000,
    fairMarketAtMarriage: 600000,
    paymentsWithCommunityFunds: 30000,
    fairMarketAtDivision: 800000
};

console.log('🏠 PROPERTY SCENARIO:');
console.log('A spouse owned a home before marriage and made the down payment from separate funds.');
console.log('During marriage, both separate and community funds were used for mortgage payments.');
console.log('The property appreciated both before and during the marriage.\n');

console.log('📊 INPUT VALUES:');
console.log(`1. Purchase Price: $${scenario.purchasePrice.toLocaleString()}`);
console.log(`2. Down Payment (Separate): $${scenario.downPayment.toLocaleString()}`);
console.log(`3. SP Principal Payments: $${scenario.paymentsWithSeparateFunds.toLocaleString()}`);
console.log(`4. FMV at Marriage: $${scenario.fairMarketAtMarriage.toLocaleString()}`);
console.log(`5. CP Principal Payments: $${scenario.paymentsWithCommunityFunds.toLocaleString()}`);
console.log(`6. FMV at Division: $${scenario.fairMarketAtDivision.toLocaleString()}\n`);

console.log('🧮 STEP-BY-STEP CALCULATION:');
console.log('═'.repeat(60));

// Step 1: Pre-marital appreciation
const premaritalAppreciation = scenario.fairMarketAtMarriage - scenario.purchasePrice;
console.log(`\nSTEP 1: Pre-marital Appreciation`);
console.log(`Formula: FMV@Marriage - Purchase Price`);
console.log(`Calculation: $${scenario.fairMarketAtMarriage.toLocaleString()} - $${scenario.purchasePrice.toLocaleString()} = $${premaritalAppreciation.toLocaleString()}`);
console.log(`Legal basis: Separate property appreciation before marriage remains separate (Fam. Code § 770)`);

// Step 2: Appreciation during marriage
const appreciationDuringMarriage = scenario.fairMarketAtDivision - scenario.fairMarketAtMarriage;
console.log(`\nSTEP 2: Appreciation During Marriage`);
console.log(`Formula: FMV@Division - FMV@Marriage`);
console.log(`Calculation: $${scenario.fairMarketAtDivision.toLocaleString()} - $${scenario.fairMarketAtMarriage.toLocaleString()} = $${appreciationDuringMarriage.toLocaleString()}`);
console.log(`Legal basis: This appreciation is subject to Moore/Marsden apportionment`);

// Step 3: Community proportion
const communityProportion = scenario.paymentsWithCommunityFunds / scenario.purchasePrice;
console.log(`\nSTEP 3: Community Proportion of Purchase Price`);
console.log(`Formula: CP Principal ÷ Purchase Price`);
console.log(`Calculation: $${scenario.paymentsWithCommunityFunds.toLocaleString()} ÷ $${scenario.purchasePrice.toLocaleString()} = ${(communityProportion * 100).toFixed(2)}%`);
console.log(`Legal basis: Moore/Marsden uses purchase price as denominator, not current value`);
console.log(`Key principle: Each dollar of principal reduction "buys" a fixed percentage of the property`);

// Step 4: Community share of appreciation
const communityShareOfAppreciation = appreciationDuringMarriage * communityProportion;
console.log(`\nSTEP 4: Community Share of Appreciation During Marriage`);
console.log(`Formula: Appreciation During Marriage × Community Proportion`);
console.log(`Calculation: $${appreciationDuringMarriage.toLocaleString()} × ${(communityProportion * 100).toFixed(2)}% = $${communityShareOfAppreciation.toLocaleString()}`);
console.log(`Legal basis: Community gets proportional share based on its contribution to acquisition`);

// Step 5: Separate share of appreciation
const separateShareOfAppreciation = appreciationDuringMarriage - communityShareOfAppreciation;
console.log(`\nSTEP 5: Separate Property Share of Appreciation During Marriage`);
console.log(`Formula: Appreciation During Marriage - Community Share`);
console.log(`Calculation: $${appreciationDuringMarriage.toLocaleString()} - $${communityShareOfAppreciation.toLocaleString()} = $${separateShareOfAppreciation.toLocaleString()}`);
console.log(`Legal basis: Remaining appreciation stays with separate property`);

// Step 6: Final separate property interest
const totalSeparateInterest = scenario.downPayment + scenario.paymentsWithSeparateFunds + premaritalAppreciation + separateShareOfAppreciation;
console.log(`\nSTEP 6: Total Separate Property Interest`);
console.log(`Components:`);
console.log(`  • Down Payment: $${scenario.downPayment.toLocaleString()}`);
console.log(`  • SP Principal Payments: $${scenario.paymentsWithSeparateFunds.toLocaleString()}`);
console.log(`  • Pre-marital Appreciation: $${premaritalAppreciation.toLocaleString()}`);
console.log(`  • SP Share of Marital Appreciation: $${separateShareOfAppreciation.toLocaleString()}`);
console.log(`Total SP Interest: $${totalSeparateInterest.toLocaleString()}`);

// Step 7: Final community property interest
const totalCommunityInterest = scenario.paymentsWithCommunityFunds + communityShareOfAppreciation;
console.log(`\nSTEP 7: Total Community Property Interest`);
console.log(`Components:`);
console.log(`  • CP Principal Payments: $${scenario.paymentsWithCommunityFunds.toLocaleString()}`);
console.log(`  • CP Share of Marital Appreciation: $${communityShareOfAppreciation.toLocaleString()}`);
console.log(`Total CP Interest: $${totalCommunityInterest.toLocaleString()}`);

// Verification
const totalEquity = totalSeparateInterest + totalCommunityInterest;
const currentEquity = scenario.fairMarketAtDivision - 0; // Assuming no mortgage for simplicity
console.log(`\n✅ VERIFICATION:`);
console.log(`SP Interest + CP Interest = $${totalEquity.toLocaleString()}`);
console.log(`Current Property Value = $${scenario.fairMarketAtDivision.toLocaleString()}`);
console.log(`${totalEquity === scenario.fairMarketAtDivision ? '✓ Calculation verified!' : '⚠ Manual verification needed'}`);

console.log(`\n🎯 KEY LEGAL PRINCIPLES:`);
console.log(`1. Purchase price denominator: Moore/Marsden uses original purchase price, not current value`);
console.log(`2. Pro tanto interest: Community acquires proportional interest based on contributions`);
console.log(`3. Appreciation allocation: Both SP and CP share in appreciation during marriage`);
console.log(`4. Principal only: Only principal payments count, not interest, taxes, or insurance`);
console.log(`5. Tracing required: Must trace separate property sources with clear documentation`);

console.log(`\n⚠️  WHAT THIS DOESN'T COVER:`);
console.log(`• Refinancing complications`);
console.log(`• Capital improvements`);
console.log(`• Transmutation agreements`);
console.log(`• Post-separation issues (Watts/Epstein)`);
console.log(`• Attorney fees under Fam. Code § 2030`);

console.log(`\n📖 FURTHER STUDY:`);
console.log(`• Read the full Moore decision: 28 Cal.3d 366 (1980)`);
console.log(`• Review Marsden clarifications: 130 Cal.App.3d 426 (1982)`);
console.log(`• Study Family Code §§ 760, 770, 2640 for statutory framework`);
console.log(`• Consider taking a family law CLE course for practical application`);

console.log(`\n🧪 TEST YOUR UNDERSTANDING:`);
console.log(`Try modifying the numbers and running the calculation again:`);
console.log(`npm run moore-marsden -- --config ./mocks/data/moore-marsden-basic.json`);