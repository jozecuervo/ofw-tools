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

const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const natural = require('natural');
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

const {
    parseDate,
    formatDate,
    getWeekString,
    writeFile,
    parsePdf
} = require('./utils');

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
function parseMessage(messageBlock) {
    const message = { body: '', wordCount: 0, recipientReadTimes: {} };

    // Normalize lines
    function normalize(raw) {
        return String(raw)
            .replace(/\u00A0/g, ' ')
            .replace(/\u200E|\u200F/g, '')
            .replace(/\uFF1A/g, ':')
            .trim();
    }
    const lines = messageBlock.split('\n').map(normalize);
    const metaRegex = /^(Sent|From|To|Subject)\s*:\s*(.*)$/i;

    // Find last occurrence of each metadata key scanning from bottom
    let subjectIdx = -1, toIdx = -1, fromIdx = -1, sentIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(metaRegex);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const val = (m[2] || '').trim();
        if (subjectIdx === -1 && key === 'subject') { subjectIdx = i; message.subject = val || ''; }
        else if (toIdx === -1 && key === 'to') { toIdx = i; }
        else if (fromIdx === -1 && key === 'from') { fromIdx = i; message.sender = val || ''; }
        else if (sentIdx === -1 && key === 'sent') { sentIdx = i; if (val) message.sentDate = parseDate(val); }
    }

    // Parse To continuation until next metadata/header line
    if (toIdx !== -1) {
        const end = subjectIdx !== -1 ? subjectIdx : lines.length;
        for (let j = toIdx; j < end; j++) {
            const line = lines[j];
            const m = line.match(metaRegex);
            if (m && m[1].toLowerCase() !== 'to') break;
            const fv = line.match(/(.+?)\(First Viewed: (.+?)\)/);
            if (fv) {
                const recipient = fv[1].trim();
                const firstViewed = fv[2].trim();
                message.recipientReadTimes[recipient] = firstViewed !== 'Never' ? parseDate(firstViewed) : 'Never';
            }
        }
    }

    // If Sent/From/Subject values are on the following line, read them
    const isMetaAt = (idx) => idx >= 0 && idx < lines.length && metaRegex.test(lines[idx]);
    const nextNonEmpty = (idx) => {
        let j = idx + 1;
        while (j < lines.length && !lines[j]) j++;
        return j < lines.length ? lines[j] : '';
    };
    if (!message.sentDate && sentIdx !== -1) {
        const v = nextNonEmpty(sentIdx);
        if (v && !metaRegex.test(v)) message.sentDate = parseDate(v);
    }
    if (!message.sender && fromIdx !== -1) {
        const v = nextNonEmpty(fromIdx);
        if (v && !metaRegex.test(v)) message.sender = v.trim();
    }
    if (!message.subject && subjectIdx !== -1) {
        const v = nextNonEmpty(subjectIdx);
        if (v && !metaRegex.test(v)) message.subject = v.trim();
    }

    // Determine body region based on whether metadata is at head or tail
    const metaIdxs = [subjectIdx, toIdx, fromIdx, sentIdx].filter(i => i !== -1).sort((a,b)=>a-b);
    const firstMetaIdx = metaIdxs.length ? metaIdxs[0] : -1;
    const lastMetaIdx = metaIdxs.length ? metaIdxs[metaIdxs.length - 1] : -1;

    const nextNonEmptyIndex = (idx) => {
        let j = idx + 1;
        while (j < lines.length && !lines[j]) j++;
        return j;
    };

    let bodyStart = 0;
    let bodyEnd = lines.length;
    const looksLikeHeadMeta = firstMetaIdx !== -1 && firstMetaIdx < 10; // metadata block at top
    if (looksLikeHeadMeta && subjectIdx !== -1) {
        // Body begins after the subject value line
        const subjValIdx = nextNonEmptyIndex(subjectIdx);
        bodyStart = (subjValIdx < lines.length && !metaRegex.test(lines[subjValIdx])) ? subjValIdx + 1 : subjectIdx + 1;
    } else if (firstMetaIdx !== -1) {
        // Tail metadata: body precedes the first metadata line
        bodyEnd = firstMetaIdx;
    }

    const bodyLines = lines
        .slice(bodyStart, bodyEnd)
        .filter(l => {
            if (!l) return false;
            if (metaRegex.test(l)) return false;
            if (/Page\s+\d+\s+of\s+\d+/i.test(l)) return false; // drop any page header/footer variants
            if (/^\s*\|\s*Message ReportPage/i.test(l)) return false; // drop OFW report banner line
            return true;
        });
    message.body = bodyLines.join('\n').trim();
    message.wordCount = message.body ? message.body.split(/\s+/).filter(Boolean).length : 0;

    // Sentiment metrics
    if (message.body) {
        message.sentiment_natural = analyzer.getSentiment(message.body.split(/\s+/));
        message.sentiment = sentiment.analyze(message.body).score;
    } else {
        message.sentiment_natural = 0;
        message.sentiment = 0;
    }
    if (!message.sender) message.sender = 'Unknown';
    if (!message.subject) message.subject = 'No subject';
    return message;
}

/**
 * Convert OFW PDF text into an array of messages.
 * @param {string} text - Full text extracted from the PDF.
 * @returns {Array<object>} messages
 */
function processMessages(text) {
    const messages = [];
    const lines = text.split('\n');
    const boundaryRegex = /^\s*Message\s+\d+\s+of\s+\d+\s*$/; // strict boundary line only
    let current = [];
    let started = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (boundaryRegex.test(line)) {
            if (started && current.length) {
                const blockText = current.join('\n');
                messages.push(parseMessage(blockText));
                current = [];
            }
            started = true;
            continue; // do not include boundary line in block
        }
        if (started) current.push(line);
    }
    if (started && current.length) {
        const blockText = current.join('\n');
        messages.push(parseMessage(blockText));
    }
    return messages;
}

// Expose selected internals for testing if needed
module.exports = {
    // parseMessage is intentionally not exported to keep surface small
    __processMessages: processMessages,
    __parseMessage: parseMessage,
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
    const excludePatterns = Array.isArray(options.excludePatterns) ? options.excludePatterns : [];
    const shouldHide = (name) => {
        if (!name || name === 'undefined') return true;
        if (/^\s*To:/i.test(name)) return true; // hide recipient pseudo-rows by default
        const lower = name.toLowerCase();
        return excludePatterns.some(p => p && lower.includes(p));
    };
    console.log('\n');
    // Output the totals to Markdown
    let header = '| Name             | Sent | Words | View Time | Avg View Time | Avg. Sentiment | Sentiment ntrl |';
    // Output the statistics to Markdown
    console.log(header);
    let separator = '|------------------|------|-------|-----------|---------------|----------------|----------------|';
    console.log(separator);
    for (const [person, personTotals] of Object.entries(totals)) {
        if (shouldHide(person)) continue;
        const paddedName = person.padEnd(16);
        const paddedSent = personTotals.messagesSent.toString().padStart(5);
        const paddedTotalTime = (personTotals.totalReadTime).toFixed(1).toString().padStart(10);
        const paddedAvgTime = (personTotals.averageReadTime).toFixed(1).toString().padStart(14);
        const wordCountDisplay = personTotals.messagesSent > 0 ? personTotals.totalWords.toString().padStart(6) : ' '.padStart(6);
        const paddedSentiment = personTotals.avgSentiment.toFixed(2).toString().padStart(14);
        const paddedSentiment_natural = personTotals.sentiment_natural.toFixed(2).toString().padStart(14);
        const row = `| ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedTotalTime} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
        console.log(row);
    }
    console.log('\n')
    header = '| Week                  | Name             | Sent | Words | Avg View Time | Avg. Sentiment | Sentiment ntrl |';
    separator = '|-----------------------|------------------|------|-------|---------------|----------------|----------------|';

    console.log(separator);
    console.log(header);

    let previousWeek = null;
    for (const [week, weekStats] of Object.entries(stats)) {
        console.log(separator);
        for (const [person, personStats] of Object.entries(weekStats)) {
            if (shouldHide(person)) continue;
            const paddedWeek = (previousWeek !== week ? week : '').padEnd(21);
            const paddedName = person.padEnd(16);
            const paddedSent = personStats.messagesSent.toString().padStart(5);
            const paddedAvgTime = (personStats.averageReadTime).toFixed(1).toString().padStart(14);
            const wordCountDisplay = personStats.messagesSent > 0 ? personStats.totalWords.toString().padStart(6) : ' '.padStart(6);
            const paddedSentiment = personStats.avgSentiment.toFixed(2).toString().padStart(14);
            const paddedSentiment_natural = personStats.sentiment_natural.toFixed(2).toString().padStart(14);
            const row = `| ${paddedWeek} | ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
            console.log(row);
            previousWeek = week;
        }
    }
    console.log(separator);
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
    let csvOutput = 'Week,Name,Messages Sent,Messages Read,Average Read Time (minutes),Total Words, Sentiment, Sentiment_natural\n';
    for (const [week, weekStats] of Object.entries(stats)) {
        for (const [person, personStats] of Object.entries(weekStats)) {
            const wordCount = (personStats.totalWords !== undefined) ? personStats.totalWords : '';
            csvOutput += `"${week}","${person}",${personStats.messagesSent},${personStats.messagesRead},${personStats.averageReadTime.toFixed(2)},${wordCount},${personStats.avgSentiment.toFixed(2)},${personStats.sentiment_natural.toFixed(2)}\n`;
        }
    }
    console.log(`Writing CSV to ${filePath}`);
    writeFile(filePath, csvOutput);
}

/**
 * Compile weekly statistics and render console/CSV outputs.
 * @param {{ messages:Array<object>, directory:string, fileNameWithoutExt:string }} bundle
 * @param {{ writeCsv?: boolean }} options
 */
function compileAndOutputStats({ messages, directory, fileNameWithoutExt }, options = { writeCsv: true, excludePatterns: [] }) {
    const stats = {};
    const totals = {};

    messages.forEach(message => {
        const weekString = getWeekString(message.sentDate);
        // Skip messages with undefined senders
        if (!message.sender) {
            console.warn('Found message with undefined sender:', message.subject || 'No subject');
            message.sender = 'Unknown';
        }
        
        const sender = message.sender;
        if (!totals[sender]) {
            totals[sender] = {
                messagesSent: 0,
                messagesRead: 0,
                totalReadTime: 0,
                totalWords: 0,
                sentiment: 0,
                sentiment_natural: 0,
                averageReadTime: 0,
            };
        }
        if (!stats[weekString]) {
            stats[weekString] = {};
        }
        if (!stats[weekString][sender]) {
            stats[weekString][sender] = {
                messagesSent: 0,
                messagesRead: 0,
                totalReadTime: 0,
                totalWords: 0,
                sentiment: 0,
                sentiment_natural: 0,
                averageReadTime: 0,
            };
        }
        totals[sender].messagesSent++;
        totals[sender].totalWords += message.wordCount;
        totals[sender].sentiment += message.sentiment;
        totals[sender].sentiment_natural += message.sentiment_natural;

        stats[weekString][sender].messagesSent++;
        stats[weekString][sender].totalWords += message.wordCount;
        stats[weekString][sender].sentiment += message.sentiment;
        stats[weekString][sender].sentiment_natural += message.sentiment_natural;

        // Increment read message count and total read time for each recipient
        for (const [recipient, firstViewed] of Object.entries(message.recipientReadTimes)) {
            // TODO Ignore messages sent to Marie and Nora
            if (recipient.includes('Marie') || recipient.includes('Nora') || recipient.includes('Henry')) {
                continue;
            } 
            if (firstViewed !== 'Never') {
                const firstViewedDate = new Date(firstViewed);
                const readTime = (firstViewedDate - message.sentDate) / 60000;
                
                if (!totals[recipient]) {
                    totals[recipient] = {
                        messagesSent: 0,
                        messagesRead: 0,
                        totalReadTime: 0,
                        totalWords: 0,
                        sentiment: 0,
                        sentiment_natural: 0,
                    };
                }
                if (!stats[weekString][recipient]) {
                    stats[weekString][recipient] = {
                        messagesSent: 0,
                        messagesRead: 0,
                        totalReadTime: 0,
                        totalWords: 0,
                        sentiment: 0,
                        sentiment_natural: 0,
                     };
                }
                stats[weekString][recipient].messagesRead++;
                totals[recipient].messagesRead++;
                if (!Number.isNaN(readTime) && Number.isFinite(readTime) && readTime >= 0) {
                    stats[weekString][recipient].totalReadTime += readTime;
                    totals[recipient].totalReadTime += readTime;
                }
            }
        }
    });

    // Calculate total average read time and sentiment for each person
    Object.entries(totals).forEach(([sender, total]) => {
        totals[sender].averageReadTime = total.messagesRead === 0 ? 0 : total.totalReadTime / total.messagesRead;
        totals[sender].avgSentiment = total.messagesSent === 0 ? 0 : total.sentiment / total.messagesSent;
        // Ensure numeric fields are finite numbers to avoid NaN in printing
        if (!Number.isFinite(totals[sender].avgSentiment)) totals[sender].avgSentiment = 0;
        if (!Number.isFinite(totals[sender].averageReadTime)) totals[sender].averageReadTime = 0;
    });
    
    // Calculate weekly average read time ans sentiment for each person in each week
    for (const week in stats) {
        // Sort stats[week] by person's name
        stats[week] = Object.fromEntries(Object.entries(stats[week]).sort());
        for (const person in stats[week]) {
            const personStats = stats[week][person];
            personStats.averageReadTime = personStats.messagesRead === 0 ? 0 : personStats.totalReadTime / personStats.messagesRead;
            // average sentiment only if messagesSent > 0
            personStats.avgSentiment = personStats.messagesSent > 0 ? (personStats.sentiment / personStats.messagesSent) : 0;
        }
    }
    // Output the statistics to Markdown (console) and CSV (file)
    const csvFilePath = options.writeCsv && directory && fileNameWithoutExt ? path.join(directory, `${fileNameWithoutExt}.csv`) : null;
    outputCSV(stats, csvFilePath);
    outputMarkdownSummary(totals, stats, { excludePatterns: options.excludePatterns });
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
