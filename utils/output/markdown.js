const { formatDate } = require('../date');

function createNameFilter(excludePatterns = []) {
  const patterns = Array.isArray(excludePatterns)
    ? excludePatterns.filter(Boolean).map(s => String(s).toLowerCase())
    : [];
  return function shouldHide(name) {
    if (!name || name === 'undefined') return true;
    if (/^\s*To:/i.test(name)) return true;
    const lower = String(name).toLowerCase();
    return patterns.some(p => p && lower.includes(p));
  };
}

function formatMessageMarkdown(message, index, total) {
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
  const toLines = Object.entries(recipientReadTimes || {})
    .map(([recipient, firstViewed]) => `   - ${recipient}: ${formatDate(firstViewed)}`)
    .join('\n');
  return [
    `## ${subject}`,
    `- From: **${sender}** ${formatDate(sentDate)}`,
    `- To:`,
    toLines,
    `- Message **${index + 1}** of **${total}**`,
    `- Word Count: **${wordCount}**, Sentiment: **${sentiment}**, ${sentiment_natural}`,
    '',
    body || '',
    '',
    ''
  ].join('\n');
}

function formatTotalsMarkdown(totals, options = {}) {
  const shouldHide = createNameFilter(options.excludePatterns);
  let out = [];
  out.push('\n');
  let header = '| Name             | Sent | Words | View Time | Avg View Time | Avg. Sentiment | Sentiment ntrl |';
  let separator = '|------------------|------|-------|-----------|---------------|----------------|----------------|';
  out.push(header);
  out.push(separator);
  for (const [person, personTotals] of Object.entries(totals)) {
    if (shouldHide(person)) continue;
    const paddedName = person.padEnd(16);
    const paddedSent = personTotals.messagesSent.toString().padStart(5);
    const paddedTotalTime = (personTotals.totalReadTime).toFixed(1).toString().padStart(10);
    const paddedAvgTime = (personTotals.averageReadTime).toFixed(1).toString().padStart(14);
    const wordCountDisplay = personTotals.messagesSent > 0 ? personTotals.totalWords.toString().padStart(6) : ' '.padStart(6);
    const paddedSentiment = personTotals.avgSentiment.toFixed(2).toString().padStart(14);
    const naturalAvg = (personTotals.avgSentimentNatural !== undefined) ? personTotals.avgSentimentNatural : personTotals.sentiment_natural;
    const paddedSentiment_natural = Number(naturalAvg).toFixed(2).toString().padStart(14);
    const row = `| ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedTotalTime} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
    out.push(row);
  }
  out.push('\n');
  return out.join('\n');
}

function formatWeeklyMarkdown(stats, options = {}) {
  const shouldHide = createNameFilter(options.excludePatterns);

  let out = [];
  let header = '| Week                  | Name             | Sent | Words | Avg View Time | Avg. Sentiment | Sentiment ntrl |';
  let separator = '|-----------------------|------------------|------|-------|---------------|----------------|----------------|';
  out.push(separator);
  out.push(header);
  let previousWeek = null;
  for (const [week, weekStats] of Object.entries(stats)) {
    out.push(separator);
    for (const [person, personStats] of Object.entries(weekStats)) {
      if (shouldHide(person)) continue;
      const paddedWeek = (previousWeek !== week ? week : '').padEnd(21);
      const paddedName = person.padEnd(16);
      const paddedSent = personStats.messagesSent.toString().padStart(5);
      const paddedAvgTime = (personStats.averageReadTime).toFixed(1).toString().padStart(14);
      const wordCountDisplay = personStats.messagesSent > 0 ? personStats.totalWords.toString().padStart(6) : ' '.padStart(6);
      const paddedSentiment = personStats.avgSentiment.toFixed(2).toString().padStart(14);
      const naturalAvg = (personStats.avgSentimentNatural !== undefined) ? personStats.avgSentimentNatural : personStats.sentiment_natural;
      const paddedSentiment_natural = Number(naturalAvg).toFixed(2).toString().padStart(14);
      const row = `| ${paddedWeek} | ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
      out.push(row);
      previousWeek = week;
    }
  }
  out.push(separator);
  return out.join('\n');
}

module.exports = { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown, createNameFilter };


