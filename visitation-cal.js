/**
 * Visitation Calendar Helper
 *
 * Purpose
 * - Generate a month view in court-style terms where "Week 1" is the first calendar week
 *   (Sun–Sat) that contains the anchor weekday (default: Friday).
 * - Label Wednesday activities per a common pattern: 1st/3rd in-person visit; 2nd/4th Zoom;
 *   and weekend visits on 2nd/4th weeks.
 *
 * CLI
 * - node visitation-cal.js <year> <month> [--grid] [--anchor <weekday>]
 *   - --anchor accepts names (Friday, Saturday, etc.). Default: Friday
 *   - --grid prints an ASCII calendar grid annotated with V (visit), Z (Zoom)
 */

// Configuration for visitation intervals (0-indexed weeks relative to Week 1)
const VISITATION_CONFIG = {
    WEEKS_PER_MONTH: 5,
    ZOOM_WEEKS: [1, 3], // Weeks with Wednesday Zoom (default: 2nd, 4th)
    VISIT_WEEKS: [0, 2], // Weeks with in-person Wednesday visit (default: 1st, 3rd)
    WEEKEND_VISIT_WEEKS: [1, 3] // Weeks with weekend visits (default: 2nd, 4th)
};

const {
    weekdayNames,
    nameToOrdinal,
    getFirstAnchorOfMonth,
    getFirstWeekStart,
} = require('./utils/date');

/**
 * Get the first occurrence of the anchor weekday in a month.
 * @param {number} year - Four-digit year
 * @param {number} month - 1-based (1=Jan ... 12=Dec)
 * @param {number} anchorOrdinal - 0=Sun ... 6=Sat
 * @returns {Date}
 */
function getFirstAnchorOfMonthLocal(year, month, anchorOrdinal) {
    return getFirstAnchorOfMonth(year, month, anchorOrdinal);

/**
 * Calculate the start (Sunday) of Week 1 (first week containing the anchor weekday).
 * @param {number} year - Four-digit year
 * @param {number} month - 1-based
 * @param {number} anchorOrdinal - 0=Sun ... 6=Sat
 * @returns {Date}
 */
function getFirstWeekStartLocal(year, month, anchorOrdinal) {
    return getFirstWeekStart(year, month, anchorOrdinal);
}

/**
 * Calculate the 5 court weeks for a given month.
 * @param {number} year - Four-digit year
 * @param {number} month - 1-based
 * @param {number} [anchorOrdinal=5] - 0=Sun ... 6=Sat (default: Friday=5)
 * @returns {Array<{startOfWeek: Date, endOfWeek: Date, wednesday: Date, visitType: 'Visit'|'Zoom'|'None', weekendVisit: boolean}>}
 */
function getWeeksInfo(year, month, anchorOrdinal = 5) {
    // Get the start date of the first week
    let firstWeekStart = getFirstWeekStartLocal(year, month, anchorOrdinal);
    // Initialize an array to hold the weeks info
    let weeksInfo = [];
    // Loop for each week of the month
    for (let i = 0; i < VISITATION_CONFIG.WEEKS_PER_MONTH; i++) {
        // Create a new date object for the start of the week
        let startOfWeek = new Date(firstWeekStart);
        // Add the number of weeks to the date to get the start of the current week
        startOfWeek.setDate(firstWeekStart.getDate() + (i * 7));
        // Create a new date object for the end of the week
        let endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        // Create a new date object for Wednesday
        let wednesday = new Date(startOfWeek);
        wednesday.setDate(startOfWeek.getDate() + 3);
        // If the start of the week is in the next month and it's the last iteration, break the loop
        if (startOfWeek.getMonth() + 1 !== month && i === VISITATION_CONFIG.WEEKS_PER_MONTH - 1) break;
        // Determine the type of Wednesday visit for the week
        let visitType = VISITATION_CONFIG.ZOOM_WEEKS.includes(i) ? 'Zoom' : (VISITATION_CONFIG.VISIT_WEEKS.includes(i) ? 'Visit' : 'None');
        // Determine if there is a weekend visit
        let weekendVisit = VISITATION_CONFIG.WEEKEND_VISIT_WEEKS.includes(i);
        // Add the week info to the array
        weeksInfo.push({
            startOfWeek: startOfWeek,
            endOfWeek: endOfWeek,
            wednesday: wednesday,
            visitType: visitType,
            weekendVisit: weekendVisit
        });
    }
    // Return the weeks info
    return weeksInfo;
}

/**
 * Print a human readable list of weeks, with Wednesday and weekend details.
 * Also prints a monthly summary of counts and dates.
 * @param {Array} weeksInfo - Output of getWeeksInfo
 * @param {number} month - 1-based month
 * @param {number} anchorOrdinal - 0=Sun ... 6=Sat
 */
function printWeeksInfo(weeksInfo, month, anchorOrdinal) {
    const wedVisitDates = [];
    const wedZoomDates = [];
    const weekendDates = [];
    weeksInfo.forEach((info, index) => {
        console.log(`\nWeek ${index + 1}: ${info.startOfWeek.toDateString()} - ${info.endOfWeek.toDateString()}`);
        let friday = new Date(info.wednesday);
        friday.setDate(info.wednesday.getDate() + 2); // Friday after Wednesday
        if (info.visitType === 'Visit') {
            console.log(` - Wednesday Visit: ${info.wednesday.toDateString()}`);
            wedVisitDates.push(info.wednesday.toDateString());
        } else if (info.visitType === 'Zoom') {
            console.log(` - Wednesday Zoom: ${info.wednesday.toDateString()}`);
            wedZoomDates.push(info.wednesday.toDateString());
        }
        // Add weekend visits for the second and fourth weeks
        if (info.weekendVisit) {
            let saturday = new Date(info.wednesday);
            saturday.setDate(saturday.getDate() + 3); // Saturday after Wednesday
            let sunday = new Date(saturday);
            sunday.setDate(saturday.getDate() + 1); // Sunday after Saturday
            console.log(` - Weekend Visit: ${saturday.toDateString()}, ${sunday.toDateString()}`);
            weekendDates.push(`${saturday.toDateString()} / ${sunday.toDateString()}`);
        }
    });
    console.log(`\nSummary (Anchor: ${weekdayNames[anchorOrdinal]}):`);
    console.log(` - Wednesday Visits: ${wedVisitDates.length}${wedVisitDates.length ? ' → ' + wedVisitDates.join(', ') : ''}`);
    console.log(` - Wednesday Zooms:  ${wedZoomDates.length}${wedZoomDates.length ? ' → ' + wedZoomDates.join(', ') : ''}`);
    console.log(` - Weekend Visits:   ${weekendDates.length}${weekendDates.length ? ' → ' + weekendDates.join(' | ') : ''}`);
}

/**
 * Print an ASCII calendar grid annotated with V (visit), Z (Zoom), weekend visits.
 * @param {number} year - Four-digit year
 * @param {number} month - 1-based month
 * @param {Array} weeksInfo - Output of getWeeksInfo
 */
function printMonthCalendar(year, month, weeksInfo) {
    // Get the first day of the month
    let firstDay = new Date(year, month - 1, 1).getDay();
    // Get the number of days in the month
    let daysInMonth = new Date(year, month, 0).getDate();
    // Initialize the calendar as a 2D array
    let calendar = Array.from({ length: 6 }, () => Array(7).fill(['       ', '       ']));
    // Fill the calendar with the days of the month
    let day = 1;
    for (let i = 0; i < 6; i++) {
        let weekendVisit = '';
        let week = Math.floor((day + firstDay - 1) / 7);
        if (week < weeksInfo.length && weeksInfo[week].weekendVisit) {
            weekendVisit = 'V';
        }
        for (let j = (i === 0 ? firstDay : 0); j < 7 && day <= daysInMonth; j++) {
            // Check if the day is a Wednesday and if there is a visit or Zoom
            let visit = '';
            if (j === 3 && week < weeksInfo.length) {
                visit = weeksInfo[week].visitType === 'Zoom' ? 'Z' : (weeksInfo[week].visitType === 'Visit' ? 'V' : ' ');
            }
            // Add the day to the calendar
            calendar[i][j] = [` ${day < 10 ? ' ' : ''}${day++} `, `  ${j === 5 || j === 6 ? weekendVisit : ''}${visit}  `];
            // Pad the cell with spaces to ensure it's always the same length
            while (calendar[i][j][0].length < 7) {
                calendar[i][j][0] += ' ';
            }
            while (calendar[i][j][1].length < 7) {
                calendar[i][j][1] += ' ';
            }
        }
    }
    // Print the calendar
    console.log('  Su      Mo       Tu      We       Th      Fr       Sa');
    console.log('---------------------------------------------------------');
    for (let i = 0; i < 6; i++) {
        console.log('|' + calendar[i].map(cell => cell[0]).join('|') + '|');
        console.log('|' + calendar[i].map(cell => cell[1]).join('|') + '|');
        console.log('---------------------------------------------------------');
    }
}

/**
 * Print CLI usage help.
 */
function printHelp() {
    console.log(`\nUsage: node visitation-cal.js <year> <month> [--grid] [--anchor <weekday>]\n\nOptions:\n  --anchor  Anchor weekday for Week 1 (default: Friday). Accepts names like Friday/Saturday.\n  --grid    Prints a month grid in addition to the list of weeks\n  -h, --help  Show this help\n`);
}

function runCli() {
    const argv = process.argv.slice(2);
    if (argv.includes('-h') || argv.includes('--help') || argv.length < 2) {
        printHelp();
        process.exit(argv.length < 2 ? 1 : 0);
    }

    // Get the year and month from the command line arguments
    const year = parseInt(argv[0]);
    const month = parseInt(argv[1]);
    const showGrid = argv.includes('--grid');
    let anchorOrdinal = 5; // Friday default
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--anchor') {
            const name = (argv[i+1] || '').toLowerCase();
            if (name in nameToOrdinal) {
                anchorOrdinal = nameToOrdinal[name];
            }
        }
    }

    // Check if the year and month are valid
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        console.error('Please provide a valid year and month as command line arguments.');
        process.exit(1);
    }

    // Get the weeks info for the given year and month
    const weeksInfo = getWeeksInfo(year, month, anchorOrdinal);
    // Print the weeks info and the month calendar
    printWeeksInfo(weeksInfo, month, anchorOrdinal);
    if (showGrid) {
        printMonthCalendar(year, month, weeksInfo);
    }
}

if (require.main === module) {
    runCli();
}

module.exports = {
    getFirstAnchorOfMonth: getFirstAnchorOfMonthLocal,
    getFirstWeekStart: getFirstWeekStartLocal,
    getWeeksInfo,
};