/**
 * Fifth-Week Counter (Court-Style Definition)
 *
 * Purpose
 * - Quantify how often a month has a "5th week" under common family court definitions
 *   of weekly visitation schedules.
 *
 * Definition
 * - Week 1 is the first calendar week that contains the specified anchor weekday(s)
 *   (for example, Friday and/or Saturday).
 * - A month is said to have a "5th week" when that month contains 5 occurrences of the anchor weekday.
 *   (Example: a month with 5 Fridays qualifies as having a 5th week when Friday is the anchor.)
 *
 * Defaults
 * - Start year: current year
 * - End year: start year + 18
 * - Anchor weekdays: Friday (5) and Saturday (6)
 * - Output includes: all 5th-occurence dates, per-year counts, and a summary
 *
 * CLI (pass flags after `--` when using npm scripts)
 * - --start <year>         Start year (inclusive). Default: current year
 * - --end <year>           End year (inclusive). Default: start + 18
 * - --weekday <0-6|csv>   Anchor weekday ordinal(s). 0=Sun ... 6=Sat. Example: --weekday 5,6
 * - --anchor <names>      Anchor weekday name(s). Example: --anchor Friday or --anchor Friday,Saturday
 * - --list                Print each date that represents the 5th occurrence (on by default)
 * - --per-year            Print a yearly count summary (on by default)
 * - -h, --help            Show usage help
 *
 * Usage Examples
 *   node nth-week.js
 *   node nth-week.js --start 2024 --end 2030 --anchor Friday
 *   node nth-week.js --weekday 3 --start 2024 --end 2026
 */
// Pure computation helpers

/**
 * Return the number of days in a given month/year.
 * @param {number} year
 * @param {number} monthIndex - Zero-based month index (0=Jan ... 11=Dec)
 * @returns {number}
 */
function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Get the Date of the 5th occurrence of a weekday in a given month, if any.
 * @param {number} year
 * @param {number} monthIndex - Zero-based month index (0=Jan ... 11=Dec)
 * @param {number} weekdayOrdinal - Anchor weekday (0=Sun ... 6=Sat)
 * @returns {Date|null}
 */
function getFifthOccurrenceDate(year, monthIndex, weekdayOrdinal) {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const firstOccurDate = 1 + ((weekdayOrdinal - firstDay + 7) % 7);
    const fifthDate = firstOccurDate + 28; // 4 additional weeks
    return fifthDate <= daysInMonth(year, monthIndex) ? new Date(year, monthIndex, fifthDate) : null;
}

/**
 * Compute the set of months (and yearly counts) that have a 5th occurrence.
 * @param {number} startYear
 * @param {number} endYear
 * @param {number} weekdayOrdinal
 * @returns {{ monthsSet: Set<string>, perYear: Record<number,number>, total: number }}
 */
function computeMonthsWithFifth(startYear, endYear, weekdayOrdinal) {
    const monthsSet = new Set(); // keys like YYYY-MM
    const perYear = {};
    for (let y = startYear; y <= endYear; y++) {
        let c = 0;
        for (let m = 0; m < 12; m++) {
            const fifth = getFifthOccurrenceDate(y, m, weekdayOrdinal);
            if (fifth) { monthsSet.add(`${y}-${String(m + 1).padStart(2, '0')}`); c++; }
        }
        perYear[y] = c;
    }
    return { monthsSet, perYear, total: Array.from(monthsSet).length };
}

/**
 * List ISO dates for each 5th occurrence in the range.
 * @param {number} startYear
 * @param {number} endYear
 * @param {number} weekdayOrdinal
 * @returns {{ datesByYear: Record<number,string[]>, total: number }}
 */
function listFifthOccurrenceDates(startYear, endYear, weekdayOrdinal) {
    const datesByYear = {};
    let total = 0;
    for (let y = startYear; y <= endYear; y++) {
        const arr = [];
        for (let m = 0; m < 12; m++) {
            const d = getFifthOccurrenceDate(y, m, weekdayOrdinal);
            if (d) { arr.push(d.toISOString().substring(0,10)); total++; }
        }
        datesByYear[y] = arr;
    }
    return { datesByYear, total };
}

/**
 * Compute and optionally print the 5th occurrence dates for a given year and anchor weekday.
 * Uses getFifthOccurrenceDate for accuracy and performance.
 *
 * @param {number} year - Four-digit year (e.g., 2025).
 * @param {number} startDayOrdinal - Anchor weekday ordinal (0=Sun ... 6=Sat).
 * @param {{ verboseDates?: boolean, perYear?: boolean }} [options]
 * @returns {number} The number of months in the given year that contain a 5th occurrence.
 */
function findFifthWeeks(year, startDayOrdinal, options = { verboseDates: false, perYear: false }) {
    let count = 0;
    for (let month = 0; month < 12; month++) {
        const d = getFifthOccurrenceDate(year, month, startDayOrdinal);
        if (d) {
            if (options.verboseDates) console.log(d.toISOString().substring(0,10));
            count++;
        }
    }
    if (options.perYear) console.log(`Year ${year}: ${count} months`);
    return count;
}

/**
 * Tally months with a 5th occurrence across a year range.
 *
 * @param {number} startYear - Inclusive start year.
 * @param {number} endYear - Inclusive end year.
 * @param {number} startDayOrdinal - Anchor weekday ordinal (0=Sun ... 6=Sat).
 * @param {{ verboseDates?: boolean, perYear?: boolean }} [options]
 * @returns {number} Total count of months in the range that have a 5th occurrence.
 */
function tallyFifthWeeks(startYear, endYear, startDayOrdinal, options = { verboseDates: false, perYear: false }) {
    let total = 0;
    for (let y = startYear; y <= endYear; y++) {
        total += findFifthWeeks(y, startDayOrdinal, options);
    }
    return total;
}

/**
 * Print CLI usage help to stdout.
 */
function printHelp() {
    console.log(`\nUsage: node nth-week.js [--start <year>] [--end <year>] [--weekday <0-6|csv>] [--list]\n\nOptions:\n  --start     Start year (default: current year)\n  --end       End year inclusive (default: start + 18)\n  --weekday   Weekday ordinal 0=Sun ... 6=Sat or CSV of ordinals (default: 5,6)\n  --list      Print each 5th-occurrence date found (verbose)\n  -h, --help  Show this help\n`);
}

/**
 * Raw CLI arguments (excluding `node` and script path).
 * @type {string[]}
 */
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
}

let start = new Date().getFullYear();
let end = start + 18;
let weekdays = [5, 6];
let verboseDates = true;
let perYear = true;
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

function runCli() {
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
    console.log('Showing dates and per-year summary.');

    weekdays.forEach(wd => {
        const name = weekdayNames[wd];
        // Print dates and per-year via legacy path for continuity
        const total = tallyFifthWeeks(start, end, wd, { verboseDates, perYear });
        // Compute analytics and print summary
        const { total: distinctMonths, perYear: perYearCounts } = computeMonthsWithFifth(start, end, wd);
        const yearSpan = end - start + 1;
        const avgPerYear = distinctMonths / yearSpan;
        const medianPerYear = (() => {
            const arr = Object.values(perYearCounts).sort((a,b)=>a-b);
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
        })();
        const minPerYear = Math.min(...Object.values(perYearCounts));
        const maxPerYear = Math.max(...Object.values(perYearCounts));

        console.log(`${name} (${wd}) → Months with a 5th week (first week contains ${name}): ${total} (between ${start} and ${end}).`);
        console.log(`Summary for ${name}: total months=${distinctMonths}, years=${yearSpan}, avg/year=${avgPerYear.toFixed(2)}, median/year=${medianPerYear}, min/year=${minPerYear}, max/year=${maxPerYear}`);
    });
}

if (require.main === module) {
    runCli();
}

module.exports = {
    daysInMonth,
    getFifthOccurrenceDate,
    computeMonthsWithFifth,
    listFifthOccurrenceDates,
    tallyFifthWeeks,
};
