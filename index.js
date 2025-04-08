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
 * Inner function to parse individual messages and extract metadata.
 * @param {string} messageBlock - The text block representing a single message.
 * @return {Object} - An object containing message data and calculated read times.
 */
function parseMessage(messageBlock) {

    // Initialize message object
    const message = {
        body: '',
        wordCount: 0,
        recipientReadTimes: {}
    };

    // Split the message block into lines
    const lines = messageBlock.trim().split('\n');
    
    let inBody = false;
    let bodyLines = [];
    let currentMetadataField = null;
    
    // Process each line to extract metadata
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if we've reached the message body
        if (inBody) {
            bodyLines.push(line);
            continue;
        }
        
        // Process metadata fields
        if (line === 'Sent:') {
            currentMetadataField = 'sent';
        } else if (line === 'From:') {
            currentMetadataField = 'from';
        } else if (line === 'To:') {
            currentMetadataField = 'to';
        } else if (line === 'Subject:') {
            currentMetadataField = 'subject';
        } else if (currentMetadataField === 'sent' && line) {
            message.sentDate = parseDate(line);
            currentMetadataField = null;
        } else if (currentMetadataField === 'from' && line) {
            message.sender = line;
            currentMetadataField = null;
        } else if (currentMetadataField === 'to' && line) {
            const recipientMatch = line.match(/(.+?)\(First Viewed: (.+?)\)/);
            if (recipientMatch) {
                const recipient = recipientMatch[1].trim();
                const firstViewed = recipientMatch[2].trim();
                message.recipientReadTimes[recipient] = firstViewed !== 'Never' ? parseDate(firstViewed) : 'Never';
            }
            // Stay in 'to' field as there might be multiple recipients
        } else if (currentMetadataField === 'subject' && line) {
            message.subject = line;
            currentMetadataField = null;
            inBody = true; // Next non-empty line starts the body
        }
    }
    
    message.body = bodyLines.join('\n').trim();
    
    // Calculate word count
    message.wordCount = message.body ? message.body.split(/\s+/).filter(Boolean).length : 0;

    // Perform sentiment analysis on the message body
    if (message.body) {
        const sentimentResult = analyzer.getSentiment(message.body.split(/\s+/));
        message.sentiment_natural = sentimentResult;
    } else {
        message.sentiment_natural = 0;
    }

    // Perform sentiment analysis on the message body using the sentiment library
    if (message.body) {
        const sentimentResult = sentiment.analyze(message.body);
        message.sentiment = sentimentResult.score;
    } else {
        message.sentiment = 0;
    }

    return message;
}

/**
 * Outer function to iterate through all messages in the PDF text.
 * @param {string} text - The text extracted from the PDF.
 * @return {Array} - An array of message objects with extracted and calculated data.
 */
function processMessages(text) {
    const messages = [];
    const messageBlocks = text.split(/Message \d+ of \d+/).slice(1);  // Assumes each message is separated by 'Message N of M'

    messageBlocks.forEach((messageBlock) => {
        const message = parseMessage(messageBlock);
        messages.push(message);
    });

    return messages;
}

/**
 * Parses the provided PDF file and processes the messages contained within it.
 *
 * @param {string} inputFilePath - The path to the input PDF file.
 * @returns {Promise<Object>} - A promise that resolves to an object containing
 * the processed messages, the directory of the input file, and the base file name
 * without extension.
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
 * Writes the provided messages data to a JSON file in the specified directory, using the base file name.
 *
 * @param {Object} data - The data object containing messages, directory, and base file name.
 * @returns {Promise<Object>} - A promise that resolves to the data object for further processing.
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
 * Outputs the provided message statistics to the console in a single Markdown table.
 *
 * @param {Object} stats - The message statistics object.
 */
function outputMarkdownSummary(totals, stats) {
    console.log('\n');
    // Output the totals to Markdown
    let header = '| Name             | Sent | Words | View Time | Avg View Time | Avg. Sentiment | Sentiment ntrl |';
    // Output the statistics to Markdown
    console.log(header);
    let separator = '|------------------|------|-------|-----------|---------------|----------------|----------------|';
    console.log(separator);
    for (const [person, personTotals] of Object.entries(totals)) {
        // Skip undefined entries or specific people
        if (!person || person === 'undefined' || person.includes('Marie') || person.includes('Nora') || person.includes('Henry') || person.includes('Megan')) {
            continue;
        }
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
            // Skip undefined entries or specific people
            if (!person || person === 'undefined' || person.includes('Marie') || person.includes('Nora') || person.includes('Henry')) {
                continue;
            }
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
 * Generates a CSV string from the provided message statistics object,
 * and writes this string to a CSV file at the provided file path.
 *
 * @param {Object} stats - The message statistics object.
 * @param {string} filePath - The path to the output CSV file.
 */
function outputCSV(stats, filePath) {
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
 * Compiles and outputs message statistics based on the array of messages.
 * @param {Array} messages - The array of message objects.
 */
function compileAndOutputStats({ messages, directory, fileNameWithoutExt }) {
    const stats = {};
    const totals = {};

    messages.forEach(message => {
        const weekString = getWeekString(message.sentDate);
        // Skip messages with undefined senders
        if (!message.sender) {
            console.warn('Found message with undefined sender:', message.subject || 'No subject');
            return;
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
                stats[weekString][recipient].totalReadTime += readTime;
                totals[recipient].totalReadTime += readTime;
            }
        }
    });

    // Calculate total average read time and sentiment for each person
    Object.entries(totals).forEach(([sender, total]) => {
        totals[sender].averageReadTime = totals[sender].totalReadTime / totals[sender].messagesRead;
        totals[sender].avgSentiment = totals[sender].sentiment / totals[sender].messagesSent;
    });
    
    // Calculate weekly average read time ans sentiment for each person in each week
    for (const week in stats) {
        // Sort stats[week] by person's name
        stats[week] = Object.fromEntries(Object.entries(stats[week]).sort());
        for (const person in stats[week]) {
            const personStats = stats[week][person];
            personStats.averageReadTime = personStats.messagesRead === 0 ? 0 : personStats.totalReadTime / personStats.messagesRead;
            // calculate average of sentiment values
            personStats.avgSentiment = personStats.sentiment / personStats.messagesSent;
        }
    }
    // Output the statistics to Markdown (console) and CSV (file)
    const csvFilePath = path.join(directory, `${fileNameWithoutExt}.csv`);
    outputCSV(stats, csvFilePath);
    outputMarkdownSummary(totals, stats);
}


const INPUT_FILE_PATH = process.argv[2];
if (!INPUT_FILE_PATH) {
    console.error('No input file path provided');
    process.exit(1);
}

// Entry Point
parsePdfFile(INPUT_FILE_PATH)
    .then(writeJsonFile)
    .then(writeMarkDownFile)
    .then(compileAndOutputStats)
    .catch(error => {
        console.error('Error:', error);
    });
