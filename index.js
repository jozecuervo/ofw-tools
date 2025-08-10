/**
 * Our Family Wizard (OFW) PDF Analyzer
 *
 * Purpose
 * - Parse an OFW Messages PDF export and extract messages with metadata (sent date, sender,
 *   recipients and first-view times, subject, body), compute word counts and sentiment, and
 *   produce weekly statistics and console-friendly Markdown/CSV summaries.
 *
 * Pipeline
 * 1) parsePdfFile: read PDF → text
 * 2) processMessages: split text by "Message N of M" → parseMessage for each block
 * 3) writeJsonFile: persist parsed messages alongside the PDF basename
 * 4) writeMarkDownFile: write a per-message Markdown file (optional)
 * 5) compileAndOutputStats: compute per-week/person stats; write CSV (optional); print Markdown tables
 *
 * CLI
 * - node index.js <path-to-ofw-pdf> [--no-markdown] [--no-csv]
 *   --no-markdown: skip writing per-message Markdown file
 *   --no-csv: skip writing weekly CSV summary
 */
const path = require('path');

const { parsePdf } = require('./utils');
const { writeFile } = require('./utils');
const { formatDate } = require('./utils');
const { processMessages } = require('./utils/ofw/parser');
const { accumulateStats } = require('./utils/ofw/stats');
const { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown } = require('./utils/output/markdown');
const { formatWeeklyCsv } = require('./utils/output/csv');

/**
 * Parse a single OFW message block into a message object.
 *
 * Expected format
 * - Lines in order: 'Sent:' then the sent datetime line; 'From:' line with sender; 'To:' line(s) with
 *   recipients annotated like "Name (First Viewed: <datetime|Never>)"; 'Subject:' followed by body lines.
 *
 * @param {string} messageBlock - The text block representing a single message.
 * @returns {{
 *   sentDate: Date,
 *   sender: string,
 *   recipientReadTimes: Record<string, Date|'Never'>,
 *   subject: string,
 *   body: string,
 *   wordCount: number,
 *   sentiment: number,
 *   sentiment_natural: number,
 * }} Parsed message with derived metrics
 */
// parseMessage moved to utils/ofw/parser

/**
 * Convert OFW PDF text into an array of messages.
 * @param {string} text - Full text extracted from the PDF.
 * @returns {Array<object>} messages
 */
// processMessages moved to utils/ofw/parser

// Expose selected internals for testing if needed
module.exports = {
    // parseMessage is intentionally not exported to keep surface small
    __processMessages: processMessages,
    __parseMessage: undefined,
    parsePdfFile,
};

/**
 * Read a PDF file and parse messages.
 * @param {string} inputFilePath - Absolute or relative path to an OFW messages PDF
 * @returns {Promise<{ messages: Array<object>, directory: string, fileNameWithoutExt: string }>} Data bundle
 */
async function parsePdfFile(inputFilePath) {
    try {
        const pdfText = await parsePdf(inputFilePath);
        console.log('PDF text parsed');
        const messages = processMessages(pdfText);
        console.log(`Processed ${messages.length} messages`);
        const directory = path.dirname(inputFilePath);
        const fileNameWithoutExt = path.basename(inputFilePath, path.extname(inputFilePath));
        return { messages, directory, fileNameWithoutExt };
    } catch (error) {
        console.error(`Failed to process PDF at ${inputFilePath}:`, error);
        throw error;
    }
}

/**
 * Write parsed messages to a JSON file next to the input PDF.
 * @param {{ messages:Array<object>, directory:string, fileNameWithoutExt:string }} data
 * @returns {Promise<typeof data>}
 */
function writeJsonFile(data) {
    return new Promise((resolve, reject) => {
        try {
            const { messages, directory, fileNameWithoutExt } = data;
            const jsonData = JSON.stringify(messages, null, 2);
            const jsonFilePath = path.join(directory, `${fileNameWithoutExt}.json`);
            console.log(`Writing JSON to ${jsonFilePath}`);
            writeFile(jsonFilePath, jsonData);
            resolve(data);  // Pass the data object along for further processing
        } catch (error) {
            reject(`Failed to write JSON file: ${error}`);
        }
    });
}
const messageTemplate = (message, index, total) => {
    const {
        sentDate,
        sender,
        recipientReadTimes,
        wordCount,
        sentiment,
        sentiment_natural,
        subject,
        body,
    } = message;
    return `
-----------------------------------------------------
## Message ${index + 1} of ${total}
- Sent: ${formatDate(sentDate)}
- From: ${sender}
- To:
${Object.entries(recipientReadTimes).map(([recipient, firstViewed]) => `   - ${recipient}: ${formatDate(firstViewed)}`).join('\n')}
- Word Count: ${wordCount}, Sentiment: ${sentiment}, ${sentiment_natural}
- Subject: ${subject}

${body}
`};


/**
 * Write a per-message Markdown file next to the input PDF.
 * @param {{ messages:Array<object>, directory:string, fileNameWithoutExt:string }} data
 * @returns {Promise<typeof data>}
 */
function writeMarkDownFile(data) {
    return new Promise((resolve, reject) => {
        try {
            const { messages, directory, fileNameWithoutExt } = data;
            let markdownContent = '';
            messages.forEach((message, index) => {
                const messageContent = messageTemplate(message, index, messages.length);
                markdownContent += messageContent;
            });
            const markdownFilePath = path.join(directory, `${fileNameWithoutExt}.md`);
            console.log(`Writing all messages to ${markdownFilePath}`);
            writeFile(markdownFilePath, markdownContent);
            resolve(data);  // Pass the data object along for further processing
        } catch (error) {
            reject(`Failed to write Markdown file: ${error}`);
        }
    });
}

/**
 * Print totals and weekly statistics as Markdown tables to console.
 * @param {Record<string, any>} totals - Aggregate per-person totals
 * @param {Record<string, Record<string, any>>} stats - Per-week per-person stats
 */
function outputMarkdownSummary(totals, stats, options = {}) {
    console.log(formatTotalsMarkdown(totals, options));
    console.log(formatWeeklyMarkdown(stats, options));
}



/**
 * Write weekly stats to CSV.
 * @param {Record<string, Record<string, any>>} stats
 * @param {string|null} filePath - Destination CSV path (null disables write)
 */
function outputCSV(stats, filePath) {
    if (!filePath) {
        console.log('CSV output disabled.');
        return;
    }
    const csvOutput = formatWeeklyCsv(stats);
    console.log(`Writing CSV to ${filePath}`);
    writeFile(filePath, csvOutput);
}

/**
 * Compile weekly statistics and render console/CSV outputs.
 * @param {{ messages:Array<object>, directory:string, fileNameWithoutExt:string }} bundle
 * @param {{ writeCsv?: boolean }} options
 */
function compileAndOutputStats({ messages, directory, fileNameWithoutExt }, options = { writeCsv: true, excludePatterns: [] }) {
    const { totals, weekly } = accumulateStats(messages);
    const csvFilePath = options.writeCsv && directory && fileNameWithoutExt ? path.join(directory, `${fileNameWithoutExt}.csv`) : null;
    outputCSV(weekly, csvFilePath);
    outputMarkdownSummary(totals, weekly, { excludePatterns: options.excludePatterns });
}


function printHelp() {
    console.log(`\nUsage: node index.js <path-to-ofw-pdf> [--no-markdown] [--no-csv] [--exclude <csv>]\n\nOptions:\n  --no-markdown           Skip writing the per-message Markdown file\n  --no-csv                Skip writing the weekly CSV summary\n  --exclude <csv>         Comma-separated substrings to hide in printed tables (case-insensitive)\n  -h, --help              Show this help\n`);
}

if (require.main === module) {
    const rawArgs = process.argv.slice(2);
    if (rawArgs.includes('-h') || rawArgs.includes('--help')) {
        printHelp();
        process.exit(0);
    }
    if (rawArgs.length === 0) {
        printHelp();
        process.exit(1);
    }

    const INPUT_FILE_PATH = rawArgs[0];
    const flags = {
        writeMarkdown: !rawArgs.includes('--no-markdown'),
        writeCsv: !rawArgs.includes('--no-csv'),
        excludePatterns: [],
    };

    // Parse --exclude <csv>
    const excludeIdx = rawArgs.indexOf('--exclude');
    if (excludeIdx !== -1) {
        const value = rawArgs[excludeIdx + 1] || '';
        if (value && !value.startsWith('--')) {
            flags.excludePatterns = value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        }
    }

    // Entry Point
    parsePdfFile(INPUT_FILE_PATH)
        .then(writeJsonFile)
        .then(data => flags.writeMarkdown ? writeMarkDownFile(data) : data)
        .then(data => compileAndOutputStats(data, { writeCsv: flags.writeCsv, excludePatterns: flags.excludePatterns }))
        .catch(error => {
            console.error('Error:', error);
        });
}
