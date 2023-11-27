// Required Imports
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Sentiment from 'sentiment';
import natural from 'natural';
import { polarity } from 'polarity';

// Initialize sentiment analysis tools
const sentiment = new Sentiment();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

// Helper function to extract year from timestamp
function getYearFromTimestamp(timestamp) {
    // Assuming the format is 'MMM DD, YYYY HH:MM:SS AM/PM'
    const yearPart = timestamp.split(' ')[2];
    return yearPart;
}

// Function to perform sentiment analysis
function analyzeSentiment(content) {
    const sentimentResult = sentiment.analyze(content);
    const naturalResult = analyzer.getSentiment(content.split(/\s+/));
    const contentArray = content.split(/\s+/);
    const polarityResult = polarity(contentArray);

    return {
        sentimentScore: sentimentResult.score,
        naturalScore: naturalResult,
        polarityScore: polarityResult,
    };
}


/**
 * 
 * Parses an iMessage-exported text file and extracts message data.
 * @param {string} filePath - The path to the text file.
 * @return {Promise<Array>} - A promise that resolves to an array of message objects.
 */
function parseIMessageFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            let messages = [];
            let currentMessage = null;
            const lines = data.split('\n');

            lines.forEach((line, index) => {
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
                } else if (!currentMessage.sender) {
                    currentMessage.sender = line.trim();
                } else {
                    currentMessage.content += line.trim() + '\n';
                }
            });

            // Perform sentiment analysis on each message
            messages = messages.map(message => ({
                ...message,
                sentiment: analyzeSentiment(message.content),
                year: getYearFromTimestamp(message.timestamp)
            }));

            // Group messages by year
            const groupedMessages = messages.reduce((acc, message) => {
                (acc[message.year] = acc[message.year] || []).push(message);
                return acc;
            }, {});

            resolve(groupedMessages);
        });
    });
}

// Function to write output to JSON files
function writeMessagesToFile(groupedMessages) {
    Object.entries(groupedMessages).forEach(([year, messages]) => {
        fs.writeFile(
            path.join(__dirname, `output_${year}.json`),
            JSON.stringify(messages, null, 2),
            (err) => {
                if (err) {
                    console.error(`Error writing file for year ${year}:`, err);
                    return;
                }
                console.log(`Messages for year ${year} written to output_${year}.json`);
            }
        );
    });
}

// Calculate directory name for file output
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Example usage
const filePath = '/Users/jose/projects/ofw-tools/source_files/imessage.txt';
parseIMessageFile(filePath)
    .then(groupedMessages => {
        console.log('Messages parsed successfully!', groupedMessages);
        writeMessagesToFile(groupedMessages);
    })
    .catch(error => {
        console.error('Error parsing iMessage file:', error);
    });
