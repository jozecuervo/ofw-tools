#!/usr/bin/env node

/**
 * Interactive Regime Comparison Demo
 * 
 * This script demonstrates the differences between Moore/Marsden apportionment
 * and Family Code §2640 reimbursement by running the same property data through
 * both regimes and showing the contrasting results.
 * 
 * LEGAL DISCLAIMER: This is for educational purposes only and does not constitute legal advice.
 */

const { computeApportionment } = require('../../apportionment-calc');
const { computeMooreMarsden } = require('../../moore-marsden');

console.log('🏠 PROPERTY DIVISION REGIME COMPARISON DEMO');
console.log('==========================================\n');

console.log('⚠️  LEGAL DISCLAIMER: This demonstration is for educational purposes only.');
console.log('   Property division involves complex legal issues. Always consult a qualified');
console.log('   family law attorney before making decisions based on these calculations.\n');

// Sample property scenario that could apply to either regime
const baseScenario = {
    houseValueAtPurchase: 600000,
    appraisedValue: 900000,
    downPayment: 120000,
    principalPaidDuringMarriage: 80000,
    yourSeparateInterest: 120000,  // Down payment from your separate funds
    herSeparateInterest: 0,
    mortgageAtPurchase: 480000,
    mortgageAtSeparation: 400000,
    fairMarketAtMarriage: 750000
};

console.log('📊 PROPERTY DETAILS:');
console.log(`Purchase Price: $${baseScenario.houseValueAtPurchase.toLocaleString()}`);
console.log(`Current Value: $${baseScenario.appraisedValue.toLocaleString()}`);
console.log(`Down Payment (Your SP): $${baseScenario.yourSeparateInterest.toLocaleString()}`);
console.log(`Community Principal Paid: $${baseScenario.principalPaidDuringMarriage.toLocaleString()}`);
console.log(`Total Appreciation: $${(baseScenario.appraisedValue - baseScenario.houseValueAtPurchase).toLocaleString()}\n`);

console.log('🔍 SCENARIO 1: MOORE/MARSDEN REGIME');
console.log('(Property owned separately before marriage)');
console.log('═'.repeat(50));

try {
    const mooreMarsdenResult = computeApportionment({
        ...baseScenario,
        acquisitionContext: 'premaritalOwner'
    });

    console.log(`Regime Applied: ${mooreMarsdenResult.regime}`);
    if (mooreMarsdenResult.baseline) {
        console.log(`Your SP Interest: $${mooreMarsdenResult.baseline.yourSP.toLocaleString()}`);
        console.log(`Community Interest: $${mooreMarsdenResult.baseline.community.toLocaleString()}`);
        console.log(`Your Total (SP + ½ CP): $${mooreMarsdenResult.baseline.yourBaseline.toLocaleString()}`);
        console.log(`Her Total (½ CP): $${mooreMarsdenResult.baseline.herBaseline.toLocaleString()}`);
        
        if (mooreMarsdenResult.metadata) {
            console.log(`\n💡 ${mooreMarsdenResult.metadata.explanation}`);
        }
    }
} catch (error) {
    console.error(`Error in Moore/Marsden calculation: ${error.message}`);
}

console.log('\n🔍 SCENARIO 2: FAMILY CODE §2640 REGIME');
console.log('(Property acquired during marriage in joint title)');
console.log('═'.repeat(50));

try {
    const section2640Result = computeApportionment({
        ...baseScenario,
        acquisitionContext: 'jointTitleDuringMarriage'
    });

    console.log(`Regime Applied: ${section2640Result.regime}`);
    console.log(`Your SP Reimbursement: $${section2640Result.baseline.yourSP.toLocaleString()}`);
    console.log(`Community Equity: $${section2640Result.baseline.community.toLocaleString()}`);
    console.log(`Your Total (Reimb + ½ CP): $${section2640Result.baseline.yourBaseline.toLocaleString()}`);
    console.log(`Her Total (½ CP): $${section2640Result.baseline.herBaseline.toLocaleString()}`);
    
    if (section2640Result.metadata) {
        console.log(`\n💡 ${section2640Result.metadata.explanation}`);
    }
} catch (error) {
    console.error(`Error in §2640 calculation: ${error.message}`);
}

console.log('\n📋 COMPARISON SUMMARY');
console.log('═'.repeat(50));

try {
    const mm = computeApportionment({ ...baseScenario, acquisitionContext: 'premaritalOwner' });
    const s2640 = computeApportionment({ ...baseScenario, acquisitionContext: 'jointTitleDuringMarriage' });
    
    const mmTotal = mm.baseline.yourBaseline;
    const s2640Total = s2640.baseline.yourBaseline;
    const difference = mmTotal - s2640Total;
    
    console.log(`Moore/Marsden Result: $${mmTotal.toLocaleString()}`);
    console.log(`§2640 Result: $${s2640Total.toLocaleString()}`);
    console.log(`Difference: $${Math.abs(difference).toLocaleString()} ${difference >= 0 ? '(M/M favors you)' : '(§2640 favors you)'}`);
    
    console.log('\n🎯 KEY DIFFERENCES:');
    console.log('Moore/Marsden: Separate property gets proportional share of appreciation');
    console.log('§2640: Separate contributions reimbursed dollar-for-dollar, no share of appreciation');
    
} catch (error) {
    console.error(`Error in comparison: ${error.message}`);
}

console.log('\n⚖️  LEGAL CONSIDERATIONS:');
console.log('• Title history and acquisition context determine which regime applies');
console.log('• Transmutation agreements can override default characterization');
console.log('• Refinancing and improvements may complicate analysis');
console.log('• Professional legal advice is essential for actual property division');

console.log('\n🔧 TRY IT YOURSELF:');
console.log('Run these commands to test with the sample data:');
console.log('npm run apportionment -- --config ./mocks/data/moore-marsden-basic.json');
console.log('npm run apportionment -- --config ./mocks/data/section-2640-basic.json');