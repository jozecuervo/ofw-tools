const fs = require("fs");
const { parsePdf } = require("./utils/pdf");
const {
    getWeekString,
    parseDate,
    formatDate,
} = require('./utils/date');

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
        // console.log(`File written to: ${filePath}`);
    } catch (error) {
        console.error(`Failed to write to ${filePath}:`, error);
    }
}

// parsePdf moved to `utils/pdf.js`

exports.getWeekString = getWeekString;
exports.parsePdf = parsePdf;
exports.parseDate = parseDate;
exports.formatDate = formatDate;
exports.writeFile = writeFile;
