const fs = require("fs");
const moment = require("moment");
const pdf = require("pdf-parse");

/**
 * Returns a string representation of the week of a given date.
 * @param {Date} date - The date.
 * @return {string} - The string representation of the week (e.g., "Oct 03 - Oct 09, 2023").
*/
function getWeekString(date) {
    const startOfWeek = moment(date).startOf('week').day(0); // Set week start on Sunday
    const endOfWeek = moment(date).endOf('week').day(6); // Set week end on Saturday
    return `${startOfWeek.format('MMM DD')} - ${endOfWeek.format('MMM DD, YYYY')}`;
}

/**
 * Helper function to parse date strings from the PDF into Date objects.
 * @param {string} dateStr - The date string from the PDF.
 * @return {Date} - A JavaScript Date object.
 */
function parseDate(dateStr) {
    const formattedDateStr = dateStr.replace(' at ', ' ').replace(/(AM|PM)/, ' $1');
    return new Date(moment(formattedDateStr, 'MM/DD/YYYY hh:mm A').toDate());
}

/**
 * Writes the provided data to a file at the provided file path, and logs a
 * confirmation message to the console.
*
* @param {string} filePath - The path to the output file.
* @param {string} data - The data to write to the file.
*/
function writeFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, data);
        console.log(`Data written to ${filePath}`);
    } catch (error) {
        console.error(`Failed to write to ${filePath}:`, error);
    }
}

/**
 * Parses the PDF file at the specified file path.
 * @param {string} filePath - The path to the PDF file.
 * @return {Promise<string>} - A promise that resolves to the text content of the PDF file.
*/
async function parsePdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error(`Failed to parse PDF at ${filePath}:`, error);
        throw error; // Re-throw the error to be caught by the calling function
    }
}

exports.getWeekString = getWeekString;
exports.parsePdf = parsePdf;
exports.parseDate = parseDate;
exports.writeFile = writeFile;
