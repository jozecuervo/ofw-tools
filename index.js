    const fs = require('fs');
    const pdf = require('pdf-parse');
    const moment = require('moment');  // Import moment.js library

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
     * Returns a string representation of the week of a given date.
     * @param {Date} date - The date.
     * @return {string} - The string representation of the week (e.g., "Oct 03 - Oct 09, 2023").
     */
    function getWeekString(date) {
        const startOfWeek = moment(date).startOf('week').day(0);  // Set week start on Sunday
        const endOfWeek = moment(date).endOf('week').day(6);  // Set week end on Saturday
        return `${startOfWeek.format('MMM DD')} - ${endOfWeek.format('MMM DD, YYYY')}`;
    }

    async function parsePdf(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
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
     * Inner function to parse individual messages and extract metadata.
     * @param {string} messageBlock - The text block representing a single message.
     * @return {Object} - An object containing message data and calculated read times.
     */
    function parseMessage(messageBlock) {
        const message = {};

        // Extracting sender, subject, and other metadata using regex
        const senderMatch = messageBlock.match(/From:(.+)\n/);
        const subjectMatch = messageBlock.match(/Subject:(.+)\n/);
        const sentMatch = messageBlock.match(/Sent:(.+)\n/);

        message.sender = senderMatch ? senderMatch[1].trim() : null;
        message.subject = subjectMatch ? subjectMatch[1].trim() : null;
        message.sentDate = sentMatch ? parseDate(sentMatch[1].trim()) : null;  // Use parseDate function

        // Extracting recipient view times and calculating read times
        message.recipientReadTimes = {};
        const recipientMatches = messageBlock.matchAll(/To:(.+)\(First Viewed: (.+?)\)\n/g);

        for (const match of recipientMatches) {
            const recipient = match[1].trim();
            const firstViewed = match[2].trim();  // Store firstViewed as a string
            message.recipientReadTimes[recipient] = firstViewed !== 'Never' ? parseDate(firstViewed) : 'Never';
        }

        return message;
    }


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

    function outputCSV(stats) {
        console.log('Week,Name,Messages Sent,Messages Read,Average Read Time (minutes)');
        for (const [week, weekStats] of Object.entries(stats)) {
            for (const [person, personStats] of Object.entries(weekStats)) {
                console.log(`"${week}",${person},${personStats.messagesSent},${personStats.messagesRead},${personStats.averageReadTime.toFixed(2)}`);
            }
        }
    }


    /**
     * Compiles and outputs message statistics based on the array of messages.
     * @param {Array} messages - The array of message objects.
     */
    function compileAndOutputStats(messages, outputFormat = 'csv') {
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
        // Output the statistics based on the specified output format
        if (outputFormat === 'markdown') {
            outputMarkdown(stats);
        } else if (outputFormat === 'csv') {
            outputCSV(stats);
        } else {
            console.error('Unsupported output format. Please choose either "markdown" or "csv".');
        }
    }

    let messages = [];
    parsePdf('source_files/test2.pdf').then(pdfText => {
        messages = processMessages(pdfText);
        // console.log(messages);
        messages && compileAndOutputStats(messages);
    });
