function findFifthWeeks(year, startDayOrdinal) {
    const fifthWeeksStartDates = [];

    for (let month = 0; month < 12; month++) { // Loop through each month
        let date = new Date(year, month, 1); // Start at the first day of the month
        let firstOccurrenceFound = false;
        let weekCount = 0;

        // Find the first occurrence of the specified start day in the month
        while (month === date.getMonth()) {
            if (date.getDay() === startDayOrdinal) {
                weekCount++;
                if (!firstOccurrenceFound) {
                    firstOccurrenceFound = true;
                } else if (weekCount === 5) {
                    // If it's the fifth occurrence, add to the result array
                    console.log(date.toISOString().substring(0, 10));
                    fifthWeeksStartDates.push(new Date(date));
                }
            }
            date.setDate(date.getDate() + 1); // Go to the next day
        }
    }

    // Format the dates for output
    // return fifthWeeksStartDates.map(date => date.toISOString().substring(0, 10));
    console.log(year, fifthWeeksStartDates.length);
    return fifthWeeksStartDates.length;
}

function tallyFifthWeeks(startYear, endYear, startDayOrdinal) {
    let totalFifthWeeks = 0;

    for (let year = startYear; year <= endYear; year++) {
        totalFifthWeeks += findFifthWeeks(year, startDayOrdinal);
    }

    return totalFifthWeeks;
}

// Example usage: Tally up the total number of fifth weeks where the week starts on a Friday, from 2024 to 2039
console.log(tallyFifthWeeks(2024, 2035, 5));
// Example usage: Tally up the total number of fifth weeks where the week starts on a Saturday, from 2024 to 2039
console.log(tallyFifthWeeks(2024, 2035, 6));
