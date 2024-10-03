// Function to calculate proportionate interest in the property
// This function implements the principle of pro-rata apportionment,
// dividing the total property value based on the proportion of each contribution (separate/community).
function calculateShare(contribution, totalContribution, propertyValue) {
    return (contribution / totalContribution) * propertyValue;
}

// Function to calculate the fair buyout amount using Moore/Marsden and credits for Watts, Epstein, and attorney fees.
// Legal Reference: In re Marriage of Moore (1980) 28 Cal.3d 366; In re Marriage of Marsden (1982) 130 Cal.App.3d 426.
// It calculates the proportionate interests of both parties and adjusts for credits.
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

// Home purchase details
const houseValueAtPurchase = 770000;  // The original purchase price of the home during the marriage.
const yourSeparateInterest = 441000;  // Your separate contribution (pre-marriage or inherited property).
const herSeparateInterest = 131000;   // Her separate contribution.
const mortgageAtPurchase = 210000;    // The mortgage amount at the time of purchase.

// Home details at separation
const principalPaidDuringMarriage = 170000;  // Community payments made during the marriage.
const mortgageAtSeparation = 40000;          // Remaining mortgage at the time of separation.

// Home details at division of assets (current value at division)
const appraisedValue = 1005000;              // Current appraised value of the home.
const principalPaidAfterSeparationByHer = 21800;  // Payments made by her post-separation (Epstein credit).
const remainingMortgage = mortgageAtSeparation - principalPaidAfterSeparationByHer;  // Remaining mortgage after her post-separation payments.

// Credits
const monthsSinceSeparation = 14.5;
const monthlyRent = 3000;  // Fair market rent value for the home post-separation.
// Watts Credit: Rent owed to you for her exclusive use of the home post-separation.
// Legal Reference: In re Marriage of Watts (1985) 171 Cal.App.3d 366.
const wattsCredit = monthsSinceSeparation * (monthlyRent / 2);  // Watts credit calculation.

// Epstein Credit: Reimbursement owed to her for paying community obligations (mortgage) post-separation.
// Legal Reference: In re Marriage of Epstein (1979) 24 Cal.3d 76.
const epsteinCredit = principalPaidAfterSeparationByHer;  

// Attorney Fees: These can be factored into the buyout as well.
// Legal Reference: Family Code Section 2030.
const attorneyFees = 20000;  // Hypothetical attorney fees for clarity.

// Total Contributions (Separate + Community) at the time of separation.
const totalContribution = yourSeparateInterest + herSeparateInterest + principalPaidDuringMarriage;

// Net Property Value after mortgage.
const netPropertyValue = appraisedValue - remainingMortgage;

// Step 1: Calculate Separate Property Shares (Pro Rata)
// Legal Reference: Moore/Marsden principles for pro-rata apportionment of separate vs. community property interests.
const yourInterestRatio = yourSeparateInterest / totalContribution;
const yourSeparateShare = calculateShare(yourSeparateInterest, totalContribution, netPropertyValue);

const herSeparateInterestRatio = herSeparateInterest / totalContribution;
const herSeparateShare = calculateShare(herSeparateInterest, totalContribution, netPropertyValue);

// Step 2: Community Property Share
// Community interest is based on the mortgage principal paid during the marriage.
const communityRatio = principalPaidDuringMarriage / totalContribution;
const communityShare = calculateShare(principalPaidDuringMarriage, totalContribution, netPropertyValue);

// Step 3: Post-Separation Payments (Her Separate Contribution)
// Legal Reference: Epstein credits for post-separation payments toward community obligations.
const herPostSeparationRatio = principalPaidAfterSeparationByHer / totalContribution;
const postSeparationShare = calculateShare(principalPaidAfterSeparationByHer, totalContribution, netPropertyValue);

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
console.log(`Total principal contributions: $${totalContribution}`);

console.log(`\nCalculate current home equity \n`);
console.log(`Appraised Value: $${appraisedValue}`);
console.log(`Current Remaining Mortgage: $${remainingMortgage}`);
console.log(`Current Net Home value after Mortgage: $${netPropertyValue}`);

console.log(`\nCalculate pro-rata percentages \n`);
console.log(`Your ratio: ${yourInterestRatio.toFixed(3)}`);
console.log(`Her ratio: ${herPostSeparationRatio.toFixed(3)}`);
console.log(`Community ratio: ${communityRatio.toFixed(3)}`);

console.log(`\nCalculate pro-rated shares \n`);
console.log(`Community Property Interest: $${communityShare.toFixed(2)}`);
console.log(`Your Separate Property Share of Current Value: $${yourSeparateShare.toFixed(2)}`);
console.log(`Her Separate Property Share of Current Value: $${herSeparateShare.toFixed(2)}`);
console.log(`Her Post-Separation Property Share: $${postSeparationShare.toFixed(2)}`);

console.log(`\nCredits:\n`);
console.log(`Months since Separation: ${monthsSinceSeparation}`);
console.log(`Watts Credit: ${monthsSinceSeparation} months x $${monthlyRent / 2} = $${wattsCredit}`);
console.log(`Epstein Credit: $${epsteinCredit}`);
console.log(`Attorney Fees: $${attorneyFees}`);

// Step 4: Calculate Buyout Amounts with Watts and Epstein Credits
// Legal References for buyout adjustments: Moore/Marsden, Watts, Epstein, and Family Code Section 2030 for attorney fees.
const buyoutAmounts = calculateBuyout(
    { 
    yourSeparateShare,
    herSeparateShare,
    communityShare,
    postSeparationShare,
    wattsCredit,
    epsteinCredit,
    attorneyFees,
});

console.log(`\nBuyout amounts after credits:\n`);
// Calculate the buyout amounts after credits, factoring in Moore/Marsden calculations and other adjustments.
console.log(`You would need to pay her: $${buyoutAmounts.yourBuyout.toFixed(2)} to buy her out.`);
console.log(`She would need to pay you: $${buyoutAmounts.herBuyout.toFixed(2)} to buy you out.`);
