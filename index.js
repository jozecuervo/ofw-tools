const path = require('path');

const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const natural = require('natural');
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

const {
    parseDate,
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
    const message = {};

    // Extracting sender, subject, sent date, and message body using regex
    const senderMatch = messageBlock.match(/From:(.+)\n/);
    const subjectMatch = messageBlock.match(/Subject:(.+)\n/);
    const sentMatch = messageBlock.match(/Sent:(.+)\n/);
    const bodyMatch = messageBlock.match(/(.*)(?:\nSent:)/s);
    if (!bodyMatch) {
        console.log('Failed to match message body:', messageBlock);
    }
    message.sender = senderMatch ? senderMatch[1].trim() : null;
    message.subject = subjectMatch ? subjectMatch[1].trim() : null;
    message.sentDate = sentMatch ? parseDate(sentMatch[1].trim()) : null;
    message.body = bodyMatch ? bodyMatch[1].trim() : null;

    // Calculate word count
    message.wordCount = message.body ? message.body.split(/\s+/).length : 0;

    // Perform sentiment analysis on the message body
    if (message.body) {
        const sentimentResult = analyzer.getSentiment(message.body.split(/\s+/));
        message.sentiment_natural = sentimentResult;
    } else {
        message.sentiment_natural = 0;
    }

    // Perform sentiment analysis on the message body
    if (message.body) {
        const sentimentResult = sentiment.analyze(message.body);
        message.sentiment = sentimentResult.score; // Add the sentiment score to the message object
    } else {
        message.sentiment = 0; // Default to 0 if there's no message body
    }


    // Extracting recipient view times and calculating read times
    message.recipientReadTimes = {};

    // Identify the section of text containing recipients
    const recipientSectionMatch = messageBlock.match(/To:(.+?)\nSubject:/s);

    if (recipientSectionMatch) {
        const recipientSection = recipientSectionMatch[1];
        const recipientLines = recipientSection.split('\n');

        recipientLines.forEach(line => {
            const recipientMatch = line.match(/(.+?)\(First Viewed: (.+?)\)/);

            if (recipientMatch) {
                const recipient = recipientMatch[1].trim();
                const firstViewed = recipientMatch[2].trim();
                message.recipientReadTimes[recipient] = firstViewed !== 'Never' ? parseDate(firstViewed) : 'Never';
            }
        });
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
        const messages = processMessages(pdfText);
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
            writeFile(jsonFilePath, jsonData);
            console.log(`Data written to ${jsonFilePath}`);
            resolve(data);  // Pass the data object along for further processing
        } catch (error) {
            reject(`Failed to write JSON file: ${error}`);
        }
    });
}

/**
 * Outputs the provided message statistics to the console in a single Markdown table.
 *
 * @param {Object} stats - The message statistics object.
 */
function outputMarkdown(stats) {
    const header = '| Week                  | Name             | Sent | Words | Read | View Time (hrs) | Avg View Time | Avg. Sentiment |\n';
    const separator = '|-----------------------|------------------|------|-------|------|-----------------|---------------|----------------|';
    console.log(header);

    let previousWeek = null;
    for (const [week, weekStats] of Object.entries(stats)) {
        console.log(separator);
        for (const [person, personStats] of Object.entries(weekStats)) {
            const paddedWeek = (previousWeek !== week ? week : '').padEnd(21);
            const paddedName = person.padEnd(16);
            const paddedSent = personStats.messagesSent.toString().padStart(5);
            const paddedRead = personStats.messagesRead.toString().padStart(5);
            const paddedTotalTime = (personStats.totalReadTime / 60).toFixed(1).toString().padStart(16);
            const paddedAvgTime = (personStats.averageReadTime / 60).toFixed(1).toString().padStart(14);
            const wordCountDisplay = personStats.messagesSent > 0 ? personStats.totalWords.toString().padStart(6) : ' '.padStart(6);
            const paddedSentiment = personStats.avgSentiment.toFixed(2).toString().padStart(14);
            const row = `| ${paddedWeek} | ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedRead} |${paddedTotalTime} |${paddedAvgTime} | ${paddedSentiment} |`;
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
    let csvOutput = 'Week,Name,Messages Sent,Messages Read,Average Read Time (minutes),Total Words, Sentiment\n';
    for (const [week, weekStats] of Object.entries(stats)) {
        for (const [person, personStats] of Object.entries(weekStats)) {
            const wordCount = (personStats.totalWords !== undefined) ? personStats.totalWords : '';
            csvOutput += `"${week}","${person}",${personStats.messagesSent},${personStats.messagesRead},${personStats.averageReadTime.toFixed(2)},${wordCount},${personStats.avgSentiment.toFixed(2)}\n`;
        }
    }
    writeFile(filePath, csvOutput);
}

/**
 * Compiles and outputs message statistics based on the array of messages.
 * @param {Array} messages - The array of message objects.
 */
function compileAndOutputStats({ messages, directory, fileNameWithoutExt }) {
    const stats = {};

    messages.forEach(message => {
        const weekString = getWeekString(message.sentDate);
        if (!stats[weekString]) {
            stats[weekString] = {};
        }

        const sender = message.sender;
        if (!stats[weekString][sender]) {
            stats[weekString][sender] = { messagesSent: 0, messagesRead: 0, totalReadTime: 0, totalWords: 0 };
        }
        stats[weekString][sender].messagesSent++;
        stats[weekString][sender].totalWords += message.wordCount;

        const sentiment = message.sentiment;
        if (!stats[weekString][sender].sentiment) {
            stats[weekString][sender].sentiment = 0;
        }
        stats[weekString][sender].sentiment += sentiment;

        // Increment read message count and total read time for each recipient
        for (const [recipient, firstViewed] of Object.entries(message.recipientReadTimes)) {
            if (firstViewed !== 'Never') {
                const firstViewedDate = new Date(firstViewed);
                const readTime = (firstViewedDate - message.sentDate) / 60000;
                

                if (!stats[weekString][recipient]) {
                    stats[weekString][recipient] = {
                        messagesSent: 0,
                        messagesRead: 0,
                        totalReadTime: 0,
                        totalWords: 0,
                        sentiment: 0
                     };
                }
                stats[weekString][recipient].messagesRead++;
                stats[weekString][recipient].totalReadTime += readTime;
            }
        }
    });

    // Calculate average read time for each person in each week
    for (const week in stats) {
        for (const person in stats[week]) {
            const personStats = stats[week][person];
            personStats.averageReadTime = personStats.messagesRead === 0 ? 0 : personStats.totalReadTime / personStats.messagesRead;
            //calculate sentiment
            personStats.avgSentiment = personStats.sentiment / personStats.messagesSent;
        }
    }
    // Output the statistics to Markdown (console) and CSV (file)

    outputMarkdown(stats);
    const csvFilePath = path.join(directory, `${fileNameWithoutExt}.csv`);
    outputCSV(stats, csvFilePath);
}


const INPUT_FILE_PATH = process.argv[2];
if (!INPUT_FILE_PATH) {
    console.error('No input file path provided');
    process.exit(1);
}

// Entry Point
parsePdfFile(INPUT_FILE_PATH)
    .then(writeJsonFile)
    .then(compileAndOutputStats)
    .catch(error => {
        console.error('Error:', error);
    });
