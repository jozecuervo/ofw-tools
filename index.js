// https://chat.openai.com/c/b8db648d-c288-4fc8-9d6f-aa6e240fbe4e
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const moment = require('moment');  // Import moment.js library

const INPUT_FILE_PATH = process.argv[2];

if (!INPUT_FILE_PATH) {
    console.error('No input file path provided');
    process.exit(1);
}

/**
 * Helper function to parse date strings from the PDF into Date objects.
 * @param {string} dateStr - The date string from the PDF.
 * @return {Date} - A JavaScript Date object.
 */
function parseDate(dateStr) {
    const formattedDateStr = dateStr.replace(' at ', ' ').replace(/(AM|PM)/, ' $1');
    return new Date(moment(formattedDateStr, 'MM/DD/YYYY hh:mm A').toDate());
}

/**
 * Writes the provided data to a file at the provided file path, and logs a
 * confirmation message to the console.
 *
 * @param {string} filePath - The path to the output file.
 * @param {string} data - The data to write to the file.
 */
function writeFile(filePath, data) {
    fs.writeFileSync(filePath, data);
    console.log(`Data written to ${filePath}`);
}

/**
 * Returns a string representation of the week of a given date.
 * @param {Date} date - The date.
 * @return {string} - The string representation of the week (e.g., "Oct 03 - Oct 09, 2023").
 */
function getWeekString(date) {
    const startOfWeek = moment(date).startOf('week').day(0);  // Set week start on Sunday
    const endOfWeek = moment(date).endOf('week').day(6);  // Set week end on Saturday
    return `${startOfWeek.format('MMM DD')} - ${endOfWeek.format('MMM DD, YYYY')}`;
}

/**
 * Parses the PDF file at the specified file path.
 * @param {string} filePath - The path to the PDF file.
 * @return {Promise<string>} - A promise that resolves to the text content of the PDF file.
 */
async function parsePdf(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

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
    const bodyMatch = messageBlock.match(/\n\n([\s\S]+?)\nSent:/);

    message.sender = senderMatch ? senderMatch[1].trim() : null;
    message.subject = subjectMatch ? subjectMatch[1].trim() : null;
    message.sentDate = sentMatch ? parseDate(sentMatch[1].trim()) : null;
    message.body = bodyMatch ? bodyMatch[1].trim() : null;

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
 * Parses the provided PDF file, processes the messages contained within it,
 * saves the processed data to a JSON file, and returns the processed messages
 * along with the directory and base file name for further processing.
 *
 * @param {string} inputFilePath - The path to the input PDF file.
 * @returns {Promise<Object>} - A promise that resolves to an object containing
 * the processed messages, the directory of the input file, and the base file name
 * without extension.
 */
async function parsePdfFile(inputFilePath) {
    const pdfText = await parsePdf(inputFilePath);
    const messages = processMessages(pdfText);
    const jsonData = JSON.stringify(messages, null, 2);
    const directory = path.dirname(inputFilePath);
    const fileNameWithoutExt = path.basename(inputFilePath, path.extname(inputFilePath));
    writeFile(path.join(directory, `${fileNameWithoutExt}.json`), jsonData);
    return { messages, directory, fileNameWithoutExt };
}

/**
 * Outputs the provided message statistics to the console in Markdown table format.
 *
 * @param {Object} stats - The message statistics object.
 */
function outputMarkdown(stats) {
    console.log('Message Statistics:');
    for (const [week, weekStats] of Object.entries(stats)) {
        console.log(`\nWeek of ${week}:\n`);
        console.log('| Name | Messages Sent | Messages Read | Average Read Time (minutes) |');
        console.log('|------|---------------|---------------|----------------------------|');
        for (const [person, personStats] of Object.entries(weekStats)) {
            console.log(`| ${person} | ${personStats.messagesSent} | ${personStats.messagesRead} | ${personStats.averageReadTime.toFixed(2)} |`);
        }
    }
}

/**
 * Generates a CSV string from the provided message statistics object,
 * and writes this string to a CSV file at the provided file path.
 *
 * @param {Object} stats - The message statistics object.
 * @param {string} filePath - The path to the output CSV file.
 */
function outputCSV(stats, filePath) {
    let csvOutput = 'Week,Name,Messages Sent,Messages Read,Average Read Time (minutes)\n';
    for (const [week, weekStats] of Object.entries(stats)) {
        for (const [person, personStats] of Object.entries(weekStats)) {
            csvOutput += `"${week}",${person},${personStats.messagesSent},${personStats.messagesRead},${personStats.averageReadTime.toFixed(2)}\n`;
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

        // Increment sent message count for sender
        const sender = message.sender;
        if (!stats[weekString][sender]) {
            stats[weekString][sender] = { messagesSent: 0, messagesRead: 0, totalReadTime: 0 };
        }
        stats[weekString][sender].messagesSent++;

        // Increment read message count and total read time for each recipient
        for (const [recipient, firstViewed] of Object.entries(message.recipientReadTimes)) {
            if (firstViewed !== 'Never') {

                const firstViewedDate = new Date(firstViewed);
                const readTime = (firstViewedDate - message.sentDate) / 60000;
                // console.log(`sentDate: ${message.sentDate}, firstViewedDate: ${firstViewedDate} readTime: ${readTime}`);  // Debugging line

                if (!stats[weekString][recipient]) {
                    stats[weekString][recipient] = { messagesSent: 0, messagesRead: 0, totalReadTime: 0 };
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
        }
    }
    // Output the statistics to Markdown (console) and CSV (file)

    outputMarkdown(stats);
    const csvFilePath = path.join(directory, `${fileNameWithoutExt}.csv`);
    outputCSV(stats, csvFilePath);  // Pass the filePath to outputCSV

}

// Entry Point
parsePdfFile(INPUT_FILE_PATH)
    .then(compileAndOutputStats)  // Pass both messages and directory to compileAndOutputStats
    .catch(error => {
        console.error('Error:', error);
    });
