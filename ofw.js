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
 * 3) computeDerivedMetrics: compute word counts and sentiment per message
 * 4) writeJsonFile: persist parsed messages
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
const { processMessages } = require('./utils/ofw/parser');
const { computeDerivedMetrics } = require('./utils/ofw/metrics');
const { assignThreads } = require('./utils/ofw/threads');
const { accumulateStats } = require('./utils/ofw/stats');
const { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown } = require('./utils/output/markdown');
const { formatWeeklyCsv, formatWeeklyTop2Csv } = require('./utils/output/csv');
const { writeFile, writeJson } = require('./utils');

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
    // High-level API
    parsePdfFile,
    writeJsonFile,
    writeMarkDownFile,
    compileAndOutputStats,
    outputMarkdownSummary,
    outputCSV,
    // CLI entry
    runCli,
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
        const parsed = processMessages(pdfText);
        console.log(`Processed ${parsed.length} messages`);
        assignThreads(parsed);
        const messages = computeDerivedMetrics(parsed);
        console.log('Computed derived metrics');
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
            const outDir = path.resolve(process.cwd(), 'output');
            const jsonFilePath = path.join(outDir, `${fileNameWithoutExt}.json`);
            console.log(`Writing JSON to ${jsonFilePath}`);
            writeJson(jsonFilePath, messages);
            resolve(data);  // Pass the data object along for further processing
        } catch (error) {
            reject(`Failed to write JSON file: ${error}`);
        }
    });
}
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
                if (message && message._nonMessage) return;
                const messageContent = formatMessageMarkdown(message, index, messages.length);
                markdownContent += messageContent + '\n';
            });
            const outDir = path.resolve(process.cwd(), 'output');
            const markdownFilePath = path.join(outDir, `${fileNameWithoutExt}.md`);
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
    if (options && options.threadStats) {
        const ts = options.threadStats;
        if (ts && ts.totals) {
            const avg = Number(ts.totals.averageThreadLength);
            console.log(`Threads: ${ts.totals.totalThreads} (avg length: ${Number.isFinite(avg) ? avg.toFixed(2) : '0.00'})`);
        }
        if (ts && ts.weekly && typeof ts.weekly === 'object') {
            console.log('Weekly thread summary:');
            Object.keys(ts.weekly).forEach(week => {
                const w = ts.weekly[week] || {};
                const avgW = Number(w.averageThreadLength);
                console.log(`- ${week}: ${w.totalThreads} threads, avg length ${Number.isFinite(avgW) ? avgW.toFixed(2) : '0.00'}`);
            });
        }
    }
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

// Generic CSV writer
function outputCsvWith(formatter, data, filePath, label = 'CSV') {
  if (!filePath) {
    console.log(`${label} output disabled.`);
    return;
  }
  const csvOutput = formatter(data);
  console.log(`Writing ${label} to ${filePath}`);
  writeFile(filePath, csvOutput);
}

/**
 * Compile weekly statistics and render console/CSV outputs.
 * @param {{ messages:Array<object>, directory:string, fileNameWithoutExt:string }} bundle
 * @param {{ writeCsv?: boolean }} options
 */
function compileAndOutputStats({ messages, directory, fileNameWithoutExt }, options = { writeCsv: true, excludePatterns: [] }) {
    const { totals, weekly, threadStats } = accumulateStats(messages);
    const outDir = path.resolve(process.cwd(), 'output');
    const csvFilePath = options.writeCsv && fileNameWithoutExt ? path.join(outDir, `${fileNameWithoutExt}.csv`) : null;
    const top2CsvPath = options.writeCsv && fileNameWithoutExt ? path.join(outDir, `${fileNameWithoutExt}.top2.csv`) : null;
    outputCsvWith(formatWeeklyCsv, weekly, csvFilePath, 'CSV');
    outputCsvWith(formatWeeklyTop2Csv, weekly, top2CsvPath, 'Top2 CSV');
    outputMarkdownSummary(totals, weekly, { excludePatterns: options.excludePatterns, threadStats });
}


function printHelp() {
    console.log(`\nUsage: node ofw.js <path-to-ofw-pdf> [--no-markdown] [--no-csv] [--exclude <csv>]\n\nOptions:\n  --no-markdown           Skip writing the per-message Markdown file\n  --no-csv                Skip writing the weekly CSV summary\n  --exclude <csv>         Comma-separated substrings to hide in printed tables (case-insensitive)\n  -h, --help              Show this help\n`);
}

function runCli(rawArgs) {
    if (rawArgs.includes('-h') || rawArgs.includes('--help')) {
        printHelp();
        return;
    }
    if (rawArgs.length === 0) {
        printHelp();
        return;
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
    return parsePdfFile(INPUT_FILE_PATH)
        .then(writeJsonFile)
        .then(data => flags.writeMarkdown ? writeMarkDownFile(data) : data)
        .then(data => compileAndOutputStats(data, { writeCsv: flags.writeCsv, excludePatterns: flags.excludePatterns }))
        .catch(error => {
            console.error('Error:', error);
        });
}

if (require.main === module) {
    const rawArgs = process.argv.slice(2);
    const result = runCli(rawArgs);
    // If runCli returned a promise, attach a terminal catch to avoid unhandled rejections
    if (result && typeof result.then === 'function') {
        result.catch(() => {});
    }
}
