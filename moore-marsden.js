// Calculation functions
function subtractLine1FromLine4(purchasePrice, fairMarketAtMarriage) {
    return fairMarketAtMarriage - purchasePrice;
}

function subtractLine4FromLine6(fairMarketAtMarriage, fairMarketAtDivision) {
    return fairMarketAtDivision - fairMarketAtMarriage;
}

function divideLine5ByLine1(paymentsWithCommunityFunds, purchasePrice) {
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
function calculateMooreMarsden(purchasePrice, downPayment, paymentsWithSeparateFunds, fairMarketAtMarriage, paymentsWithCommunityFunds, fairMarketAtDivision) {
    const line7Result = subtractLine1FromLine4(purchasePrice, fairMarketAtMarriage); // Line 7 appreciation before marriage.
    const line8Result = subtractLine4FromLine6(fairMarketAtMarriage, fairMarketAtDivision); // Line 8 appreciation during the marriage.
    const line9Result = divideLine5ByLine1(paymentsWithCommunityFunds, purchasePrice); // Line 9 proportion of community payments 
    const line10Result = multiplyLine8ByLine9(line8Result, line9Result); // Line 10 community share of appreciation.
    const line11Result = subtractLine10FromLine8(line8Result, line10Result); // Line 11 separate property share of appreciation
    const spInterest = calculateSPInterest(downPayment, paymentsWithSeparateFunds, line7Result, line11Result); // SP Interest
    const cpInterest = calculateCPInterest(paymentsWithCommunityFunds, line10Result); // CP Interest

    // Formatting functions
    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const percentageFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });

    // Logging results with formatting
    console.log(`1. Purchase price:                              ${currencyFormatter.format(purchasePrice)}`);
    console.log(`2. Down payment:                                ${currencyFormatter.format(downPayment)}`);
    console.log(`3. Principal payments made with separate funds: ${currencyFormatter.format(paymentsWithSeparateFunds)}`);
    console.log(`4. Fair Market Value at Date of Marriage :      ${currencyFormatter.format(fairMarketAtMarriage)}`);
    console.log(`5. Principal payments with community funds:     ${currencyFormatter.format(paymentsWithCommunityFunds)}`);
    console.log(`6. Fair Market Value at Date of Division:       ${currencyFormatter.format(fairMarketAtDivision)}`);
    console.log(`---------------------------------------------------------------`);
    console.log(`7. Appreciation before marriage:                ${currencyFormatter.format(line7Result)}`);
    console.log(`8. Appreciation during marriage:                ${currencyFormatter.format(line8Result)}`);
    console.log(`9. Proportion of community payments:            ${percentageFormatter.format(line9Result)}`);
    console.log(`10. Community share of appreciation:            ${currencyFormatter.format(line10Result)}`);
    console.log(`11. Separate property share of appreciation:    ${currencyFormatter.format(line11Result)}`);
    console.log(`---------------------------------------------------------------`);
    console.log(`12. Separate Property Interest (SP Interest):   ${currencyFormatter.format(spInterest)}`);
    console.log(`13. Community Property Interest (CP Interest):  ${currencyFormatter.format(cpInterest)}
    `);
}

// Sharon Street Condo
calculateMooreMarsden(
    435000, // Purchase price
    132179.18, // Down payment
    20645.55, // Principal payments made with separate funds
    665000, // Fair Market Value at Date of Marriage
    10274.73, // Principal payments with community funds
    750225.81 // Fair Market Value at Date of Division
);


// // Gilbert Street House
// calculateMooreMarsden(
//     770000, // Purchase price
//     560000, // Down payment
//     441000, // Principal payments made with separate funds
//     770000, // Fair Market Value at Date of Marriage
//     210000, // Principal payments with community funds
//     1050000 // Fair Market Value at Date of Division
// );