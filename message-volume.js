const fs = require('fs');

// Load and parse JSON data
const messages = JSON.parse(fs.readFileSync('OFW_Messages_Report_2025-03-04_12-04-15.json', 'utf8'));

// Helper to parse date strings
const parseSentDate = dateString => new Date(dateString).getTime();

const formatDate = dateString => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
  });
};

const formatTime = dateString => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
  });
};

// Analyze rapid-fire message sequences from Susan Plate
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

const rapidFireClusters = analyzeRapidFireMessages(messages, "");

// Output the clusters in a visually clear manner
rapidFireClusters.forEach((cluster, idx) => {
  console.log(`\n#${idx + 1} ${formatDate(cluster[0].sentDate)}:`);
  cluster.forEach((msg, msgIdx) => {
    if (msgIdx === 0) {
      console.log(`  [${formatTime(msg.sentDate)}] - ${msg.subject} - ${msg.wordCount} words`);
    } else {
      const responseTimeSeconds = (parseSentDate(msg.sentDate) - parseSentDate(cluster[msgIdx - 1].sentDate)) / 1000;
      const responseTimeMinutes = responseTimeSeconds / 60;
      console.log(`  [${formatTime(msg.sentDate)}] - ${responseTimeMinutes} minutes later, ${msg.wordCount} words`);
    }
  });
});

// Additional analysis for message volume
const messageVolumeByDate = messages.reduce((acc, msg) => {
  const date = msg.sentDate.split('T')[0];
  acc[date] = (acc[date] || 0) + 1;
  return acc;
}, {});

console.log("\nMessage volume by date:");
console.table(messageVolumeByDate);
