/**
 * Convert date string to epoch milliseconds.
 * @param {string|Date} dateLike
 * @returns {number}
 */
function toEpochMs(dateLike) {
  return new Date(dateLike).getTime();
}

/**
 * Find rapid-fire clusters for a given sender where consecutive messages are within a threshold.
 * @param {Array<{sentDate:string|Date,sender:string,wordCount?:number,subject?:string}>} messages
 * @param {string} senderName
 * @param {number} thresholdSeconds - max gap between msgs in a cluster (default 1800s)
 * @returns {Array<Array<object>>} clusters (each cluster is an array of messages)
 */
function analyzeRapidFireMessages(messages, senderName, thresholdSeconds = 60 * 30) {
  const senderMessages = messages
    .filter(msg => msg.sender === senderName)
    .sort((a, b) => toEpochMs(a.sentDate) - toEpochMs(b.sentDate));

  const clusters = [];
  let currentCluster = [];

  senderMessages.forEach((msg, idx) => {
    if (currentCluster.length === 0) {
      currentCluster.push(msg);
    } else {
      const lastMessageTime = toEpochMs(currentCluster[currentCluster.length - 1].sentDate);
      const currentMessageTime = toEpochMs(msg.sentDate);

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

module.exports = { analyzeRapidFireMessages };


