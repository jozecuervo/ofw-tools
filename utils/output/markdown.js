const { formatDate } = require('../date');

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
  return `
-----------------------------------------------------
## Message ${index + 1} of ${total}
- Sent: ${formatDate(sentDate)}
- From: ${sender}
- To:
${Object.entries(recipientReadTimes).map(([recipient, firstViewed]) => `   - ${recipient}: ${formatDate(firstViewed)}`).join('\n')}
- Word Count: ${wordCount}, Sentiment: ${sentiment}, ${sentiment_natural}
- Subject: ${subject}

${body}
`;
}

function formatTotalsMarkdown(totals, options = {}) {
  const excludePatterns = Array.isArray(options.excludePatterns) ? options.excludePatterns : [];
  const shouldHide = (name) => {
    if (!name || name === 'undefined') return true;
    if (/^\s*To:/i.test(name)) return true;
    const lower = name.toLowerCase();
    return excludePatterns.some(p => p && lower.includes(p));
  };
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
    const paddedSentiment_natural = personTotals.sentiment_natural.toFixed(2).toString().padStart(14);
    const row = `| ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedTotalTime} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
    out.push(row);
  }
  out.push('\n');
  return out.join('\n');
}

function formatWeeklyMarkdown(stats, options = {}) {
  const excludePatterns = Array.isArray(options.excludePatterns) ? options.excludePatterns : [];
  const shouldHide = (name) => {
    if (!name || name === 'undefined') return true;
    if (/^\s*To:/i.test(name)) return true;
    const lower = name.toLowerCase();
    return excludePatterns.some(p => p && lower.includes(p));
  };

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
      const paddedSentiment_natural = personStats.sentiment_natural.toFixed(2).toString().padStart(14);
      const row = `| ${paddedWeek} | ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
      out.push(row);
      previousWeek = week;
    }
  }
  out.push(separator);
  return out.join('\n');
}

module.exports = { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown };


