// Configuration for visitation intervals
const VISITATION_CONFIG = {
    WEEKS_PER_MONTH: 5,
    ZOOM_WEEKS: [2, 4], // 0-indexed weeks for Zoom visits
    VISIT_WEEKS: [1, 3], // 0-indexed weeks for in-person visits
    WEEKEND_VISIT_WEEKS: [1, 3] // 0-indexed weeks for weekend visits
};

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
        // Determine the type of visit for the week
        let visitType = VISITATION_CONFIG.ZOOM_WEEKS.includes(i) ? 'Zoom' : 'Visit';
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
        if (week < weeksInfo.length && weeksInfo[week].weekendVisitType === 'Visit') {
            weekendVisit = 'V';
        }
        for (let j = (i === 0 ? firstDay : 0); j < 7 && day <= daysInMonth; j++) {
            // Check if the day is a Wednesday and if there is a visit or Zoom
            let visit = '';
            if (j === 3 && week < weeksInfo.length) {
                visit = weeksInfo[week].visitType === 'Zoom' ? 'Z' : 'V';
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

// Get the year and month from the command line arguments
const year = parseInt(process.argv[2]);
const month = parseInt(process.argv[3]);

// Check if the year and month are valid
if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    console.error('Please provide a valid year and month as command line arguments.');
    process.exit(1);
}

// Get the weeks info for the given year and month
const weeksInfo = getWeeksInfo(year, month);
// console.log(weeksInfo);

// Print the weeks info and the month calendar
printWeeksInfo(weeksInfo, month);
printMonthCalendar(year, month, weeksInfo);