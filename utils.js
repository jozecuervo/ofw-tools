const fs = require("fs");
const pdf = require("pdf-parse");
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
exports.formatDate = formatDate;
exports.writeFile = writeFile;
