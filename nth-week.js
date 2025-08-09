function findFifthWeeks(year, startDayOrdinal, verbose = false) {
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
                    if (verbose) console.log(date.toISOString().substring(0, 10));
                    fifthWeeksStartDates.push(new Date(date));
                }
            }
            date.setDate(date.getDate() + 1); // Go to the next day
        }
    }

    // Format the dates for output
    // return fifthWeeksStartDates.map(date => date.toISOString().substring(0, 10));
    if (verbose) console.log(year, fifthWeeksStartDates.length);
    return fifthWeeksStartDates.length;
}

function tallyFifthWeeks(startYear, endYear, startDayOrdinal, verbose = false) {
    let totalFifthWeeks = 0;

    for (let year = startYear; year <= endYear; year++) {
        totalFifthWeeks += findFifthWeeks(year, startDayOrdinal, verbose);
    }

    return totalFifthWeeks;
}

function printHelp() {
    console.log(`\nUsage: node nth-week.js [--start <year>] [--end <year>] [--weekday <0-6|csv>] [--list]\n\nOptions:\n  --start     Start year (default: 2024)\n  --end       End year inclusive (default: 2035)\n  --weekday   Weekday ordinal 0=Sun ... 6=Sat or CSV of ordinals (default: 5,6)\n  --list      Print each 5th-occurrence date found (verbose)\n  -h, --help  Show this help\n`);
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
}

let start = 2024;
let end = 2035;
let weekdays = [5, 6];
let verbose = false;
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--start') start = Number(args[++i]);
    else if (a === '--end') end = Number(args[++i]);
    else if (a === '--weekday') {
        const val = args[++i];
        weekdays = val.split(',').map(n => Number(n.trim())).filter(n => !Number.isNaN(n));
    }
    else if (a === '--list') verbose = true;
}

weekdays.forEach(wd => {
    const total = tallyFifthWeeks(start, end, wd, verbose);
    console.log(`Weekday ${wd}: ${total} months with a 5th occurrence between ${start}-${end}`);
});
