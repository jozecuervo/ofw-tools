const { getWeekString } = require('../date');

/**
 * Accumulate weekly and total statistics from parsed messages.
 * @param {Array<object>} messages
 * @returns {{ totals: Record<string, any>, weekly: Record<string, Record<string, any>> }}
 */
function accumulateStats(messages) {
  const stats = {};
  const totals = {};

  messages.forEach(message => {
    if (message && (message._nonMessage || !message.sentDate || !message.sender)) {
      return;
    }
    const weekString = getWeekString(message.sentDate);
    const sender = message.sender || 'Unknown';

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
    if (!stats[weekString]) stats[weekString] = {};
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

    for (const [recipient, firstViewed] of Object.entries(message.recipientReadTimes)) {
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

  Object.entries(totals).forEach(([person, total]) => {
    totals[person].averageReadTime = total.messagesRead === 0 ? 0 : total.totalReadTime / total.messagesRead;
    totals[person].avgSentiment = total.messagesSent === 0 ? 0 : total.sentiment / total.messagesSent;
    if (!Number.isFinite(totals[person].avgSentiment)) totals[person].avgSentiment = 0;
    if (!Number.isFinite(totals[person].averageReadTime)) totals[person].averageReadTime = 0;
  });

  for (const week in stats) {
    stats[week] = Object.fromEntries(Object.entries(stats[week]).sort());
    for (const person in stats[week]) {
      const personStats = stats[week][person];
      personStats.averageReadTime = personStats.messagesRead === 0 ? 0 : personStats.totalReadTime / personStats.messagesRead;
      personStats.avgSentiment = personStats.messagesSent > 0 ? (personStats.sentiment / personStats.messagesSent) : 0;
    }
  }

  return { totals, weekly: stats };
}

module.exports = { accumulateStats };


