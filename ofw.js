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
 * - node ofw.js <path-to-ofw-pdf> [--no-markdown] [--no-csv] [--ollama] [--ollama-max <n>] [--ollama-numeric] [--exclude <csv>]
 *   --no-markdown: skip writing per-message Markdown file
 *   --no-csv: skip writing weekly CSV summary
 *   --ollama: run Ollama-based LLM sentiment post-processing on the generated JSON
 *   --ollama-max <n>: limit Ollama-processed messages (default 6)
 *   --ollama-numeric: preserve numeric scores in sentiment output (adds *_num fields)
 */
const path = require('path');

const { parsePdf } = require('./utils');
const { processMessages } = require('./utils/ofw/parser');
const { computeDerivedMetrics } = require('./utils/ofw/metrics');
const { assignThreads } = require('./utils/ofw/threads');
const { accumulateStats } = require('./utils/ofw/stats');
const { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown, formatThreadTreeMarkdown } = require('./utils/output/markdown');
const { formatWeeklyCsv, formatWeeklyTop2Csv, formatThreadsCsv } = require('./utils/output/csv');
const { summarizeThreads } = require('./utils/ofw/threads');
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
            // Also write thread tree view
            const threadMd = formatThreadTreeMarkdown(messages);
            const threadFilePath = path.join(outDir, `${fileNameWithoutExt}.threads.md`);
            console.log(`Writing thread tree to ${threadFilePath}`);
            writeFile(threadFilePath, threadMd);
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
    console.log(formatWeeklyMarkdown(stats, options));
    // output threaded message tree to console
    // console.log(formatThreadStatsMarkdown(totals, options));
    console.log(formatTotalsMarkdown(totals, options));
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
    const csvFilePath = options.writeCsv && fileNameWithoutExt ? path.join(outDir, `${fileNameWithoutExt}-senders.csv`) : null;
    const top2CsvPath = options.writeCsv && fileNameWithoutExt ? path.join(outDir, `${fileNameWithoutExt}-top2-comparison.csv`) : null;
    const threadsCsvPath = options.writeCsv && fileNameWithoutExt ? path.join(outDir, `${fileNameWithoutExt}-threads.csv`) : null;
    outputCsvWith(formatWeeklyCsv, weekly, csvFilePath, 'CSV');
    outputCsvWith(formatWeeklyTop2Csv, weekly, top2CsvPath, 'Top2 CSV');
    const threadSummaries = summarizeThreads(messages);
    outputCsvWith(formatThreadsCsv, threadSummaries, threadsCsvPath, 'Threads CSV');
    // Augment threadStats with richer averages from summaries
    const nThreads = threadSummaries.length || 0;
    const sumMsgs = threadSummaries.reduce((a, t) => a + (Number(t.messages) || 0), 0);
    const sumDays = threadSummaries.reduce((a, t) => a + (Number(t.spanDays) || 0), 0);
    const sumWords = threadSummaries.reduce((a, t) => a + (Number(t.totalWords) || 0), 0);
    const enrichedThreadStats = {
      ...threadStats,
      totals: {
        ...(threadStats && threadStats.totals ? threadStats.totals : {}),
        avgMessagesPerThread: nThreads ? Number((sumMsgs / nThreads).toFixed(2)) : 0,
        avgDaysPerThread: nThreads ? Number((sumDays / nThreads).toFixed(2)) : 0,
        avgWordsPerThread: nThreads ? Number((sumWords / nThreads).toFixed(2)) : 0,
      },
    };
    outputMarkdownSummary(totals, weekly, { excludePatterns: options.excludePatterns, threadStats: enrichedThreadStats });
}


function printHelp() {
    console.log(`\nUsage: node ofw.js <path-to-ofw-pdf> [--no-markdown] [--no-csv] [--ollama] [--ollama-max <n>] [--ollama-numeric] [--exclude <csv>]\n\nOptions:\n  --no-markdown           Skip writing the per-message Markdown file\n  --no-csv                Skip writing the weekly CSV summary\n  --ollama                Run Ollama-based sentiment analysis on the generated JSON (requires local Ollama)\n  --ollama-max <n>        Limit how many messages are sent to Ollama (default: 6)\n  --ollama-numeric        Preserve numeric scores in sentiment output (adds *_num fields)\n  --exclude <csv>         Comma-separated substrings to hide in printed tables (case-insensitive)\n  -h, --help              Show this help\n`);
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

    // Accept args in any order; pick the first non-flag token as input path
    const nonFlagIdx = rawArgs.findIndex(a => !a.startsWith('-'));
    if (nonFlagIdx === -1) {
        printHelp();
        return;
    }
    const INPUT_FILE_PATH = rawArgs[nonFlagIdx];
    const flags = {
        writeMarkdown: !rawArgs.includes('--no-markdown'),
        writeCsv: !rawArgs.includes('--no-csv'),
        excludePatterns: [],
    };
    const enableOllama = rawArgs.includes('--ollama');
    const preserveNumeric = rawArgs.includes('--ollama-numeric');
    // Parse --ollama-max <n> or --ollama-max=<n>
    let ollamaMax = 6;
    const maxIdx = rawArgs.indexOf('--ollama-max');
    if (maxIdx !== -1) {
        const maybe = rawArgs[maxIdx + 1];
        if (maybe && !maybe.startsWith('--')) {
            const n = Number(maybe);
            if (!Number.isNaN(n) && n > 0) ollamaMax = n;
        }
    }
    const eqArg = rawArgs.find(a => a.startsWith('--ollama-max='));
    if (eqArg) {
        const val = Number(eqArg.split('=')[1]);
        if (!Number.isNaN(val) && val > 0) ollamaMax = val;
    }

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
        .then(async data => {
            if (enableOllama) {
                try {
                    // Verify Ollama availability early
                    try {
                        const { default: ollama } = require('ollama');
                        await ollama.chat({ model: 'llama3.1', messages: [{ role: 'user', content: 'ping' }] });
                    } catch (e) {
                        console.error('Ollama server not reachable. Run `ollama serve` and ensure model `llama3.1` is pulled.');
                        throw e;
                    }
                    const fileNameWithoutExt = data && data.fileNameWithoutExt ? data.fileNameWithoutExt : path.basename(INPUT_FILE_PATH, path.extname(INPUT_FILE_PATH));
                    const jsonPath = path.resolve(process.cwd(), 'output', `${fileNameWithoutExt}.json`);
                    const outputDir = path.resolve(process.cwd(), 'output');
                    console.log('Running Ollama sentiment analysis...');
                    const { MessageProcessor } = require('./ollama-sentiment');
                    const processor = new MessageProcessor('llama3.1', 3, { preserveNumeric });
                    await processor.processJsonFile(jsonPath, outputDir, { maxMessages: ollamaMax, preserveNumeric });
                } catch (e) {
                    console.error('Ollama sentiment analysis failed:', e && e.message ? e.message : e);
                }
            }
            return data;
        })
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
