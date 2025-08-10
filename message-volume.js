const fs = require('fs');
const {
  formatDateMMMddYYYY,
  formatDateMMDDYYYY,
  formatTimeHHMM,
} = require('./utils/date');

function printHelp() {
  console.log(`\nUsage: node message-volume.js <path-to-json-file> [--sender "Name"] [--threshold-min 30] [--min-messages 3]\n\nOptions:\n  --sender          Sender name to analyze (exact match). Default: "José Hernandez"\n  --threshold-min   Max minutes between consecutive messages to be in the same cluster. Default: 30\n  --min-messages    Minimum messages per cluster to include in output. Default: 3\n  -h, --help        Show this help\n`);
}

// Simple CLI args parser
const rawArgs = process.argv.slice(2);
if (rawArgs.includes('-h') || rawArgs.includes('--help') || rawArgs.length === 0) {
  printHelp();
  process.exit(rawArgs.length === 0 ? 1 : 0);
}

const filePath = rawArgs[0];
const options = { sender: 'José Hernandez', thresholdMin: 30, minMessages: 3 };
for (let i = 1; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--sender') options.sender = rawArgs[++i];
  else if (rawArgs[i] === '--threshold-min') options.thresholdMin = Number(rawArgs[++i]);
  else if (rawArgs[i] === '--min-messages') options.minMessages = Number(rawArgs[++i]);
}

if (!filePath) {
  printHelp();
  process.exit(1);
}

// Load and parse JSON data
const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Helper to parse date strings
const parseSentDate = dateString => new Date(dateString).getTime();

const formatDate = formatDateMMMddYYYY;
const formatDate2 = formatDateMMDDYYYY;
const formatTime = formatTimeHHMM;

function analyzeRapidFireMessages(messages, senderName, thresholdSeconds = 60 * 30) { // Default threshold: 30 minutes
  const senderMessages = messages
    .filter(msg => msg.sender === senderName)
    .sort((a, b) => parseSentDate(a.sentDate) - parseSentDate(b.sentDate));

  const clusters = [];
  let currentCluster = [];

  senderMessages.forEach((msg, idx) => {
    if (currentCluster.length === 0) {
      currentCluster.push(msg);
    } else {
      const lastMessageTime = parseSentDate(currentCluster[currentCluster.length - 1].sentDate);
      const currentMessageTime = parseSentDate(msg.sentDate);

      if ((currentMessageTime - lastMessageTime) / 1000 <= thresholdSeconds) {
        currentCluster.push(msg);
      } else {
        if (currentCluster.length > 1) clusters.push([...currentCluster]);
        currentCluster = [msg];
      }
    }

    if (idx === senderMessages.length - 1 && currentCluster.length > 1) {
      clusters.push([...currentCluster]);
    }
  });

  return clusters;
}

const thresholdSeconds = options.thresholdMin * 60;
let visualization = '';
const rapidFireClusters = analyzeRapidFireMessages(messages, options.sender, thresholdSeconds)
  .filter(cluster => cluster.length >= options.minMessages);

console.log(`\nRapid-fire clusters for ${options.sender} (>=${options.minMessages} msgs, <=${options.thresholdMin} min gaps)`);
// Output the clusters in a visually clear manner
rapidFireClusters.forEach((cluster) => {
  const totalWords = cluster.reduce((acc, msg) => acc + (msg.wordCount || 0), 0);
  const totalTime = (parseSentDate(cluster[cluster.length - 1].sentDate) - parseSentDate(cluster[0].sentDate)) / 1000 / 60;
  visualization += `\n${formatDate2(cluster[0].sentDate)} »`;
  console.log(`\n${formatDate(cluster[0].sentDate)}: ${cluster.length} messages in ${Math.round(totalTime)} mins, ${totalWords} words`);
  cluster.forEach((msg, msgIdx) => {
    if (msgIdx === 0) {
      console.log(` [${formatTime(msg.sentDate)}] - ${msg.subject}`);
      visualization += `[${msg.wordCount || 0}w]`;
    } else {
      const responseTimeMinutes = (parseSentDate(msg.sentDate) - parseSentDate(cluster[msgIdx - 1].sentDate)) / 1000 / 60;
      console.log(` [${formatTime(msg.sentDate)}] - ${Math.round(responseTimeMinutes)} mins later`);
      const scaled = Math.min(50, Math.max(1, Math.round(responseTimeMinutes / 5))); // 1 char per ~5 min, capped
      visualization += `${'-'.repeat(scaled)}[${msg.wordCount || 0}w]`;
    }
  });
});
if (rapidFireClusters.length === 0) {
  console.log('\nNo clusters found with current settings.');
}
console.log(visualization);
