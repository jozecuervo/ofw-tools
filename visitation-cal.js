// This function calculates the first Friday of a given month
function getFirstFridayOfMonth(year, month) {
    // Create a new date object for the first day of the month
    let date = new Date(year, month - 1, 1);
    // Loop until the day of the week is Friday (5)
    while (date.getDay() !== 5) {
        // Increment the date by one day
        date.setDate(date.getDate() + 1);
    }
    // Log the first Friday
    return date;
}

// This function calculates the start date of the first week of a given month
function getFirstWeekStart(year, month) {
    // Get the first Friday of the month
    let firstFriday = getFirstFridayOfMonth(year, month);
    // console.log(`First Friday of the month: ${firstFriday.toDateString()}`);
    // Create a new date object for the first week start
    let firstWeekStart = new Date(firstFriday);
    // Subtract the day of the week from the date to get the start of the week
    firstWeekStart.setDate(firstFriday.getDate() - firstFriday.getDay());
    // Log the first week start
    return firstWeekStart;
}

// This function calculates the weeks of a given month
function getWeeksInfo(year, month) {
    // Get the start date of the first week
    let firstWeekStart = getFirstWeekStart(year, month);
    // console.log(`Start of the first week: ${firstWeekStart.toDateString()}`);
    // Initialize an array to hold the weeks info
    let weeksInfo = [];
    // Loop for each week of the month
    for (let i = 0; i < 5; i++) {
        // Create a new date object for the start of the week
        let startOfWeek = new Date(firstWeekStart);
        // Add the number of weeks to the date to get the start of the current week
        startOfWeek.setDate(firstWeekStart.getDate() + (i * 7));
        // If the start of the week is in the next month and it's the last iteration, break the loop
        if (startOfWeek.getMonth() + 1 !== month && i === 4) break;
        // Create a new date object for the end of the week
        let endOfWeek = new Date(startOfWeek);
        // Add six days to the start of the week to get the end of the week
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        // Create a new date object for Wednesday
        let wednesday = new Date(startOfWeek);
        // Add three days to the start of the week to get Wednesday
        wednesday.setDate(startOfWeek.getDate() + 3);
        // If Wednesday is in the current month or it's not the last iteration, add the week info to the array
        if (wednesday.getMonth() + 1 === month || i < 4) {
            // Log the week info
            // console.log(`Week ${i + 1}: ${startOfWeek.toDateString()} - ${endOfWeek.toDateString()}`);
            // Add the week info to the array
            weeksInfo.push({
                startOfWeek: startOfWeek,
                endOfWeek: endOfWeek,
                wednesday: wednesday
            });
        }
    }
    // Return the weeks info
    return weeksInfo;
}
// console.log(getWeeksInfo(2024, 5));
function printWeeksInfo(weeksInfo, month) {
    weeksInfo.forEach((info, index) => {
        console.log(`\nWeek ${index + 1}: ${info.startOfWeek.toDateString()} - ${info.endOfWeek.toDateString()}`);
        let friday = new Date(info.wednesday);
        friday.setDate(info.wednesday.getDate() + 2); // Friday after Wednesday
        if ([0, 2].includes(index)) {
            console.log(` - 1st/3rd Wed Visit: ${info.wednesday.toDateString()}`);
        } else if ([1, 3].includes(index) || (index === 4 && friday.getMonth() + 1 === month)) {
            console.log(` - 2nd/4th/5th Wed Zoom: ${info.wednesday.toDateString()}`);
        }
        // Add weekend visits for the second and fourth weeks
        if (index === 1 || index === 3) {
            let saturday = new Date(info.wednesday);
            saturday.setDate(saturday.getDate() + 3); // Saturday after Wednesday
            let sunday = new Date(saturday);
            sunday.setDate(saturday.getDate() + 1); // Sunday after Saturday
            console.log(` - Weekend Visit: ${saturday.toDateString()}, ${sunday.toDateString()}`);
        }
    });
}

// Example usage for April 2024
const weeksInfo = getWeeksInfo(2024, 5);
printWeeksInfo(weeksInfo, 5);

