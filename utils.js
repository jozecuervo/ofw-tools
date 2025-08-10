const fs = require("fs");
const { parsePdf } = require("./utils/pdf");
const { writeFile, writeJson, ensureDir } = require('./utils/fs');
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
// writeFile moved to utils/fs; re-exported below

// parsePdf moved to `utils/pdf.js`

exports.getWeekString = getWeekString;
exports.parsePdf = parsePdf;
exports.parseDate = parseDate;
exports.formatDate = formatDate;
exports.writeFile = writeFile;
exports.writeJson = writeJson;
exports.ensureDir = ensureDir;
