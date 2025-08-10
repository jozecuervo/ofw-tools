const fs = require('fs');
const pdf = require('pdf-parse');

/**
 * Parse a PDF file into text using pdf-parse.
 * @param {string} filePath - Absolute or relative path to the PDF file
 * @returns {Promise<string>} Full text content extracted from the PDF
 */
async function parsePdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Failed to parse PDF at ${filePath}:`, error);
    throw error;
  }
}

module.exports = { parsePdf };


