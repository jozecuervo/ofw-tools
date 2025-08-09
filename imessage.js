/**
 * iMessage Parser with Sentiment
 *
 * Purpose
 * - Parse a plain-text export of iMessage conversations into structured JSON messages,
 *   grouped by year, and perform basic sentiment analysis.
 *
 * Expected Input Format (typical macOS export)
 * - Messages are separated by timestamp lines of the form: `MMM DD, YYYY HH:MM:SS AM/PM (Status)`
 * - Next line is the sender name.
 * - Following lines (until the next timestamp line) are the message content.
 * - Empty lines are ignored.
 *
 * Outputs
 * - Per-year JSON files written to an output directory (default: `./output`).
 * - Console summary of counts per year and totals.
 *
 * CLI
 * - node imessage.js <path-to-imessage.txt> [--out-dir <directory>]
 */
// Required Imports (CommonJS)
const fs = require('fs');
const path = require('path');
const Sentiment = require('sentiment');
const natural = require('natural');
const { polarity } = require('polarity');

// Initialize sentiment analysis tools
const sentiment = new Sentiment();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

// Helper function to extract year from timestamp
/**
 * Extract a 4-digit year from a timestamp line.
 * Falls back to current year if none found.
 * @param {string} timestamp
 * @returns {string}
 */
function getYearFromTimestamp(timestamp) {
    const match = String(timestamp).match(/\b(\d{4})\b/);
    return match ? match[1] : String(new Date().getFullYear());
}

// Function to perform sentiment analysis
/**
 * Compute sentiment metrics over message content.
 * @param {string} content
 * @returns {{ sentimentScore: number, naturalScore: number, polarityScore: number }}
 */
function analyzeSentiment(content) {
    const sentimentResult = sentiment.analyze(content);
    const naturalResult = analyzer.getSentiment(content.split(/\s+/));
    const contentArray = content.split(/\s+/);
    const polarityResult = polarity(contentArray);

    return {
        sentimentScore: sentimentResult.score,
        naturalScore: naturalResult,
        polarityScore: polarityResult.polarity,
    };
}


/**
 * Parse iMessage-exported text content and extract messages grouped by year.
 * @param {string} data - Raw text content of the export file.
 * @returns {Record<string, Array>} groupedMessages by year
 */
function parseIMessageText(data) {
    let messages = [];
    let currentMessage = null;
    const lines = data.split('\n');

    lines.forEach((line) => {
        if (line.match(/^\s*$/)) {
            return; // Skip empty lines
        }

        if (line.match(/\d{1,2}:\d{2}:\d{2} [AP]M/)) {
            // Save previous message and start a new one
            if (currentMessage) {
                messages.push(currentMessage);
            }
            currentMessage = {
                timestamp: line.split('(')[0].trim(),
                readInfo: line.split('(')[1]?.split(')')[0]?.trim() || null,
                sender: null,
                content: ''
            };
        } else if (currentMessage && !currentMessage.sender) {
            currentMessage.sender = line.trim();
        } else if (currentMessage) {
            currentMessage.content += line.trim() + '\n';
        }
    });

    if (currentMessage) {
        messages.push(currentMessage);
    }

    // Perform sentiment analysis and group by year
    const enriched = messages.map(message => ({
        ...message,
        year: getYearFromTimestamp(message.timestamp),
        ...analyzeSentiment(message.content || ''),
    }));

    const groupedMessages = enriched.reduce((acc, message) => {
        (acc[message.year] = acc[message.year] || []).push(message);
        return acc;
    }, {});

    return groupedMessages;
}

/**
 * Parses an iMessage-exported text file and extracts message data grouped by year.
 * @param {string} filePath - The path to the text file.
 * @return {Promise<Record<string, Array>>} - grouped messages by year.
 */
function parseIMessageFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                const grouped = parseIMessageText(data);
                resolve(grouped);
            } catch (e) {
                reject(e);
            }
        });
    });
}

// Function to write output to JSON files
/**
 * Write grouped messages to per-year JSON files.
 * @param {Record<string, Array>} groupedMessages
 * @param {string} outDir
 */
function writeMessagesToFile(groupedMessages, outDir) {
    try {
        fs.mkdirSync(outDir, { recursive: true });
    } catch (e) {
        console.error(`Failed to create output directory ${outDir}:`, e);
        process.exit(1);
    }
    Object.entries(groupedMessages).forEach(([year, messages]) => {
        const outPath = path.join(outDir, `imessage-export-${year}.json`);
        fs.writeFile(
            outPath,
            JSON.stringify(messages, null, 2),
            (err) => {
                if (err) {
                    console.error(`Error writing file for year ${year}:`, err);
                    return;
                }
                console.log(`Messages for year ${year} written to ${outPath}`);
            }
        );
    });
}

/**
 * Compute a simple summary of counts per year.
 * @param {Record<string, Array>} groupedMessages
 * @returns {{ totalMessages: number, byYear: Record<string, number> }}
 */
function summarizeGroupedMessages(groupedMessages) {
    const byYear = Object.fromEntries(Object.entries(groupedMessages).map(([year, msgs]) => [year, msgs.length]));
    const totalMessages = Object.values(byYear).reduce((a, b) => a + b, 0);
    return { totalMessages, byYear };
}

function printHelp() {
    console.log(`\nUsage: node imessage.js <path-to-imessage.txt> [--out-dir <directory>]\n\nOptions:\n  --out-dir   Output directory for JSON files (default: input file directory)\n  -h, --help  Show this help\n`);
}

const rawArgs = process.argv.slice(2);
if (rawArgs.includes('-h') || rawArgs.includes('--help') || rawArgs.length === 0) {
    printHelp();
    process.exit(rawArgs.length === 0 ? 1 : 0);
}

const inputPath = rawArgs[0];
let outDir = path.join(__dirname, 'output');
for (let i = 1; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--out-dir') {
        outDir = rawArgs[++i];
    }
}

function runCli() {
    parseIMessageFile(inputPath)
        .then(groupedMessages => {
            console.log(`Writing parsed messages to directory: ${path.resolve(outDir)}`);
            writeMessagesToFile(groupedMessages, outDir);
            const summary = summarizeGroupedMessages(groupedMessages);
            console.log(`Summary: ${summary.totalMessages} messages across ${Object.keys(summary.byYear).length} years`);
            Object.entries(summary.byYear).sort(([a],[b]) => a.localeCompare(b)).forEach(([year, count]) => {
                console.log(` - ${year}: ${count}`);
            });
        })
        .catch(error => {
            console.error('Error parsing iMessage file:', error);
            process.exit(1);
        });
}

if (require.main === module) {
    runCli();
}

module.exports = {
    analyzeSentiment,
    getYearFromTimestamp,
    parseIMessageText,
    parseIMessageFile,
    writeMessagesToFile,
    summarizeGroupedMessages,
};
