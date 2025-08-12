const { getWeekString } = require('../date');

const defaultStats = {
  messagesSent: 0,
  messagesRead: 0,
  totalReadTime: 0,
  totalWords: 0,
  sentiment: 0,
  sentiment_natural: 0,
  sentiment_per_word: 0,
  natural_per_word: 0,
  avgSentimentNatural: 0,
  averageReadTime: 0,
};

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
        ...defaultStats,
      };
    }
    if (!stats[weekString]) stats[weekString] = {};
    if (!stats[weekString][sender]) {
      stats[weekString][sender] = {
        ...defaultStats,
      };
    }

    totals[sender].messagesSent++;
    totals[sender].totalWords += message.wordCount;
    totals[sender].sentiment += message.sentiment;
    totals[sender].sentiment_natural += message.sentiment_natural;
    if (Number.isFinite(message.sentiment_per_word)) totals[sender].sentiment_per_word += message.sentiment_per_word;
    if (Number.isFinite(message.natural_per_word)) totals[sender].natural_per_word += message.natural_per_word;

    stats[weekString][sender].messagesSent++;
    stats[weekString][sender].totalWords += message.wordCount;
    stats[weekString][sender].sentiment += message.sentiment;
    stats[weekString][sender].sentiment_natural += message.sentiment_natural;
    if (Number.isFinite(message.sentiment_per_word)) stats[weekString][sender].sentiment_per_word += message.sentiment_per_word;
    if (Number.isFinite(message.natural_per_word)) stats[weekString][sender].natural_per_word += message.natural_per_word;

    for (const [recipient, firstViewed] of Object.entries(message.recipientReadTimes)) {
      if (firstViewed !== 'Never') {
        const firstViewedDate = new Date(firstViewed);
        const readTime = (firstViewedDate - message.sentDate) / 60000;

        if (!totals[recipient]) {
          totals[recipient] = {
            ...defaultStats,
          };
        }
        if (!stats[weekString][recipient]) {
          stats[weekString][recipient] = {
            ...defaultStats,
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
    totals[person].avgSentimentNatural = total.messagesSent === 0 ? 0 : total.sentiment_natural / total.messagesSent;
    totals[person].avgSentimentPerWord = total.messagesSent === 0 ? 0 : total.sentiment_per_word / total.messagesSent;
    totals[person].avgNaturalPerWord = total.messagesSent === 0 ? 0 : total.natural_per_word / total.messagesSent;
    if (!Number.isFinite(totals[person].avgSentiment)) totals[person].avgSentiment = 0;
    if (!Number.isFinite(totals[person].avgSentimentNatural)) totals[person].avgSentimentNatural = 0;
    if (!Number.isFinite(totals[person].avgSentimentPerWord)) totals[person].avgSentimentPerWord = 0;
    if (!Number.isFinite(totals[person].avgNaturalPerWord)) totals[person].avgNaturalPerWord = 0;
    if (!Number.isFinite(totals[person].averageReadTime)) totals[person].averageReadTime = 0;
    totals[person].tone = computeTone(totals[person]);
  });

  for (const week in stats) {
    stats[week] = Object.fromEntries(Object.entries(stats[week]).sort());
    for (const person in stats[week]) {
      const personStats = stats[week][person];
      personStats.averageReadTime = personStats.messagesRead === 0 ? 0 : personStats.totalReadTime / personStats.messagesRead;
      personStats.avgSentiment = personStats.messagesSent > 0 ? (personStats.sentiment / personStats.messagesSent) : 0;
      personStats.avgSentimentNatural = personStats.messagesSent > 0 ? (personStats.sentiment_natural / personStats.messagesSent) : 0;
      personStats.avgSentimentPerWord = personStats.messagesSent > 0 ? (personStats.sentiment_per_word / personStats.messagesSent) : 0;
      personStats.avgNaturalPerWord = personStats.messagesSent > 0 ? (personStats.natural_per_word / personStats.messagesSent) : 0;
      if (!Number.isFinite(personStats.avgSentimentPerWord)) personStats.avgSentimentPerWord = 0;
      if (!Number.isFinite(personStats.avgNaturalPerWord)) personStats.avgNaturalPerWord = 0;
      if (!Number.isFinite(personStats.avgSentimentNatural)) personStats.avgSentimentNatural = 0;
      personStats.tone = computeTone(personStats);
    }
  }

  return { totals, weekly: stats };
}

// Compute a normalized tone value between the two sentiment libraries.
// Approach: clamp scaled values to [-1, 1], then average them equally.
function computeTone(personStats) {
  if (!personStats || typeof personStats !== 'object') return 0;
  const s = Number(personStats.avgSentiment);
  // Prefer averaged Natural score for apples-to-apples blending; fallback to summed if average not available.
  const nAvg = (personStats.avgSentimentNatural !== undefined)
    ? Number(personStats.avgSentimentNatural)
    : Number(personStats.sentiment_natural);
  const sNorm = clamp(s / 12, -1, 1);
  // Boost natural's influence: typical range ~ -0.2..1.1 → scale by ~0.2
  const nNorm = clamp(nAvg / 0.2, -1, 1);
  const avg = (sNorm + nNorm) / 2;
  return clamp(avg, -1, 1);
}

function clamp(x, lo, hi) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(lo, Math.min(hi, x));
}

module.exports = { accumulateStats, computeTone };


