// Function to calculate proportionate interest in the property
function calculateShare(contribution, totalContribution, propertyValue) {
    return (contribution / totalContribution) * propertyValue;
}

// Function to calculate the fair buyout amount
function calculateBuyout(netPropertyValue, yourSeparateShare, herSeparateShare, communityShare, postSeparationShare, wattsCredit, epsteinCredit) {
    const totalCommunityValue = communityShare + postSeparationShare;
    const totalYourInterest = yourSeparateShare + (totalCommunityValue / 2) + wattsCredit - epsteinCredit;
    const totalHerInterest = herSeparateShare + (totalCommunityValue / 2) + epsteinCredit - wattsCredit;
    
    console.log(`Net Property Value after Mortgage: ${netPropertyValue.toFixed(2)}`);
    console.log(`Your Total Interest (after credits): ${totalYourInterest.toFixed(2)}`);
    console.log(`Her Total Interest (after credits): ${totalHerInterest.toFixed(2)}`);
    
    return {
        yourBuyout: totalHerInterest,  // How much you need to pay to buy her out
        herBuyout: totalYourInterest   // How much she needs to pay to buy you out
    };
}

// Home purchase details
const houseValueAtPurchase = 770000;
const yourSeparateInterest = 441000;
const herSeparateInterest = 131000;
const mortgageAtPurchase = 210000;

// Home details at separation
const principalPaidDuringMarriage = 170000;
const mortgageAtSeparation = 40000;

// Home details at division of assets
const appraisedValue = 1005000;
const principalPaidAfterSeparationByHer = 21800;
const remaningMortgage = mortgageAtSeparation - principalPaidAfterSeparationByHer;
// Credits
const monthsSinceSeparation = 14.5;
const monthlyRent = 3000;
const wattsCredit = monthsSinceSeparation * (monthlyRent / 2); // Watts credits owed to you
const epsteinCredit = principalPaidAfterSeparationByHer; // Epstein credits owed to her

// Total Contributions (Separate + Community)
const totalContribution = yourSeparateInterest + herSeparateInterest + principalPaidDuringMarriage;

// Net Property Value after mortgage
const netPropertyValue = appraisedValue - remaningMortgage;

// Step 1: Separate Property Shares (Pro Rata)
const yourSeparateShare = calculateShare(yourSeparateInterest, totalContribution, netPropertyValue);
const herSeparateShare = calculateShare(herSeparateInterest, totalContribution, netPropertyValue);

// Step 2: Community Property Share
const communityShare = calculateShare(principalPaidDuringMarriage, totalContribution, netPropertyValue);

// Step 3: Post-Separation Payments (Her Separate Contribution)
const postSeparationShare = calculateShare(principalPaidAfterSeparationByHer, totalContribution, netPropertyValue);

// Log the results
console.log(``);
console.log(`Home Purchase Details:\n`);
console.log(`House Value at Purchase: $${houseValueAtPurchase}`);
console.log(`Your Separate Interest: $${yourSeparateInterest}`);
console.log(`Her Separate Interest: $${herSeparateInterest}`);

console.log(`\nHome Details at Separation:\n`);

console.log(`Community Paid Principal: $${principalPaidDuringMarriage}`);
console.log(`Mortgage remaining at Separation: $${mortgageAtSeparation}`);

console.log(`\nHome Details at Division of Assets:\n`);

console.log(`Appraised Value: $${appraisedValue}`);
console.log(`Principal Paid after Separation by Her: $${principalPaidAfterSeparationByHer}`);
console.log(`Remaining Mortgage: $${remaningMortgage}`);
console.log(`Net Home value after mortgage: $${netPropertyValue}`);

console.log(`\nCalculated interests\n`);
console.log(`Community Property Interest: $${communityShare.toFixed(2)}`);
console.log(`Your Separate Property Share of Current Value: $${yourSeparateShare.toFixed(2)}`);
console.log(`Her Separate Property Share of Current Value: $${herSeparateShare.toFixed(2)}`);
console.log(`Her Post-Separation Property Share: $${postSeparationShare.toFixed(2)}`);
console.log(`Your total interest: $${(yourSeparateShare + (communityShare / 2)).toFixed(2)}`);
console.log(`Her total interest: $${(herSeparateShare + (communityShare / 2) + postSeparationShare).toFixed(2)}`);

console.log(`\nCredits:\n`);
console.log(`Months since Separation: ${monthsSinceSeparation}`);
console.log(`Watts Credit: $${wattsCredit}`);
console.log(`Epstein Credit: $${epsteinCredit}`);

console.log(`\nResults:\n`);


// Step 4: Calculate Buyout Amounts with Watts and Epstein Credits
const buyoutAmounts = calculateBuyout(
    netPropertyValue, 
    yourSeparateShare, herSeparateShare, communityShare, postSeparationShare,
    wattsCredit, epsteinCredit
);

console.log(`You would need to pay her: $${buyoutAmounts.yourBuyout.toFixed(2)} to buy her out.`);
console.log(`She would need to pay you: $${buyoutAmounts.herBuyout.toFixed(2)} to buy you out.`);
