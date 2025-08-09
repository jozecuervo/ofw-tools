function findFifthWeeks(year, startDayOrdinal, options = { verboseDates: false, perYear: false }) {
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
                    if (options.verboseDates) console.log(date.toISOString().substring(0, 10));
                    fifthWeeksStartDates.push(new Date(date));
                }
            }
            date.setDate(date.getDate() + 1); // Go to the next day
        }
    }

    // Format the dates for output
    // return fifthWeeksStartDates.map(date => date.toISOString().substring(0, 10));
    if (options.perYear) console.log(`Year ${year}: ${fifthWeeksStartDates.length} months`);
    return fifthWeeksStartDates.length;
}

function tallyFifthWeeks(startYear, endYear, startDayOrdinal, options = { verboseDates: false, perYear: false }) {
    let totalFifthWeeks = 0;

    for (let year = startYear; year <= endYear; year++) {
        totalFifthWeeks += findFifthWeeks(year, startDayOrdinal, options);
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
let verboseDates = false;
let perYear = false;
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--start') start = Number(args[++i]);
    else if (a === '--end') end = Number(args[++i]);
    else if (a === '--weekday') {
        const val = args[++i];
        weekdays = val.split(',').map(n => Number(n.trim())).filter(n => !Number.isNaN(n));
    }
    else if (a === '--list') verboseDates = true;
    else if (a === '--per-year') perYear = true;
}

const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const nameToOrdinal = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
};

// Backward-compat: allow --anchor as name(s)
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--anchor') {
        const v = (args[++i] || '').split(',').map(s => s.trim().toLowerCase());
        const ords = v.map(n => nameToOrdinal[n]).filter(v => v !== undefined);
        if (ords.length > 0) weekdays = ords;
    }
}

console.log(`\n5th week counter (court-style)`);
console.log(`Range: ${start}–${end}`);
const humanList = weekdays.map(wd => weekdayNames[wd]).join(' and ');
console.log(`Definition: Week 1 is the first week that contains a ${weekdays.length > 1 ? humanList : humanList}. A month has a "5th week" if it contains 5 such ${weekdays.length > 1 ? 'anchor days' : 'anchor day'} in that month.`);
if (!verboseDates && !perYear) console.log('Use --list for each date; --per-year for yearly counts.');

weekdays.forEach(wd => {
    const total = tallyFifthWeeks(start, end, wd, { verboseDates, perYear });
    const name = weekdayNames[wd];
    console.log(`${name} (${wd}) → Months with a 5th week (first week contains ${name}): ${total} (between ${start} and ${end}).`);
});
