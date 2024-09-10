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

// Example inputs based on your provided details
const houseValueAtPurchase = 770000;
const yourSeparateInterest = 441000;
const herSeparateInterest = 1300000
const mortgageAtPurchase = 205000;
const principalPaidDuringMarriage = 170000;
const principalPaidAfterSeparationByHer = 20000;
const mortgageAtSeparation = 40000;
const houseValueAtSeparation = 1100000;
const wattsCredit = 21000; // Watts credits owed to you
const epsteinCredit = 20000; // Epstein credits owed to her

// Total Contributions (Separate + Community)
const totalContribution = yourSeparateInterest + herSeparateInterest + principalPaidDuringMarriage;

// Net Property Value after mortgage
const netPropertyValue = houseValueAtSeparation - mortgageAtSeparation; 

// Step 1: Separate Property Shares (Pro Rata)
const yourSeparateShare = calculateShare(yourSeparateInterest, totalContribution, netPropertyValue);
const herSeparateShare = calculateShare(herSeparateInterest, totalContribution, netPropertyValue);

// Step 2: Community Property Share
const communityShare = calculateShare(principalPaidDuringMarriage, totalContribution, netPropertyValue);

// Step 3: Post-Separation Payments (Her Separate Contribution)
const postSeparationShare = calculateShare(principalPaidAfterSeparationByHer, totalContribution, netPropertyValue);

// Log the results
console.log(`House Value at Purchase: $${houseValueAtPurchase}`);
console.log(`House Value at Separation: $${houseValueAtSeparation}`);
console.log(`------------------------------------------------`);
console.log(`Your Separate Interest: $${yourSeparateInterest}`);
console.log(`Her Separate Interest: $${herSeparateInterest}`);
console.log(`Community Paid Principal: $${principalPaidDuringMarriage}`);
console.log(`Post-Separation Payment by Her: $${principalPaidAfterSeparationByHer}`);
console.log(`------------------------------------------------`);
console.log(`Your Separate Property Share of Current Value: $${yourSeparateShare.toFixed(2)}`);
console.log(`Her Separate Property Share of Current Value: $${herSeparateShare.toFixed(2)}`);
console.log(`Community Property Share of Current Value: $${communityShare.toFixed(2)}`);
console.log(`Her Post-Separation Property Share: $${postSeparationShare.toFixed(2)}`);
console.log(`------------------------------------------------`);

// Step 4: Calculate Buyout Amounts with Watts and Epstein Credits
const buyoutAmounts = calculateBuyout(
    netPropertyValue, 
    yourSeparateShare, herSeparateShare, communityShare, postSeparationShare,
    wattsCredit, epsteinCredit
);

console.log(`You would need to pay her: $${buyoutAmounts.yourBuyout.toFixed(2)} to buy her out.`);
console.log(`She would need to pay you: $${buyoutAmounts.herBuyout.toFixed(2)} to buy you out.`);
