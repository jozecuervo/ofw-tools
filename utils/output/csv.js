const { parseWeekLabelToStartEnd, toISODate } = require('../date');

function formatWeeklyCsv(stats) {
  let csvOutput = 'Week Start,Week End,Name,Messages Sent,Messages Read,Average Read Time (minutes),Total Words, Sentiment, Sentiment_natural, Tone\n';
  for (const [week, weekStats] of Object.entries(stats)) {
    const { startISO, endISO } = parseWeekLabelToStartEnd(week);
    for (const [person, personStats] of Object.entries(weekStats)) {
      const wordCount = (personStats.totalWords !== undefined) ? personStats.totalWords : '';
      const tone = Number.isFinite(Number(personStats.tone)) ? Number(personStats.tone).toFixed(2) : '0.00';
      const naturalAvg = (personStats.avgSentimentNatural !== undefined)
        ? Number(personStats.avgSentimentNatural)
        : Number(personStats.sentiment_natural);
      const naturalAvgStr = Number.isFinite(naturalAvg) ? naturalAvg.toFixed(2) : '0.00';
      csvOutput += `${startISO ? `"${startISO}"` : ''},${endISO ? `"${endISO}"` : ''},"${person}",${personStats.messagesSent},${personStats.messagesRead},${personStats.averageReadTime.toFixed(2)},${wordCount},${personStats.avgSentiment.toFixed(2)},${naturalAvgStr},${tone}\n`;
    }
  }
  return csvOutput;
}

module.exports = { formatWeeklyCsv };

// Build a second CSV focused on the global top 2 senders across all weeks
function formatWeeklyTop2Csv(stats) {
  const [first, second] = getGlobalTopNSenders(stats, 2);
  const nameA = first || '';
  const nameB = second || '';
  const initialA = nameA.charAt(0).toUpperCase();
  const initialB = nameB.charAt(0).toUpperCase();

  // Header A: Week Start first
  let csvOutput = `Week Start,Sent ${nameA},Sent ${nameB},Total Words ${nameA},Total Words ${nameB},Read Time ${nameA},Read Time ${nameB},Sentiment ${nameA},Sentiment ${nameB},Sentiment Natural ${nameA},Sentiment Natural ${nameB},Tone ${nameA},Tone ${nameB}` + "\n";

  const weeks = Object.keys(stats);
  weeks.forEach(week => {
    const w = stats[week] || {};
    const a = w[nameA] || {};
    const b = w[nameB] || {};
    const { startISO } = parseWeekLabelToStartEnd(week);
    const weekLabel = startISO || week; // Fallback to original label if not parseable
    const toneA = (w[nameA] && Number.isFinite(Number(w[nameA].tone))) ? w[nameA].tone : 0;
    const toneB = (w[nameB] && Number.isFinite(Number(w[nameB].tone))) ? w[nameB].tone : 0;
    const row = [
      weekLabel,
      safeInt(a.messagesSent),
      safeInt(b.messagesSent),
      safeInt(a.totalWords),
      safeInt(b.totalWords),
      safeNum(a.averageReadTime),
      safeNum(b.averageReadTime),
      safeNum(a.avgSentiment),
      safeNum(b.avgSentiment),
      safeNum(a.avgSentimentNatural !== undefined ? a.avgSentimentNatural : a.sentiment_natural),
      safeNum(b.avgSentimentNatural !== undefined ? b.avgSentimentNatural : b.sentiment_natural),
      safeNum(toneA),
      safeNum(toneB),
    ];
    csvOutput += row.map(csvCell).join(',') + '\n';
  });

  return csvOutput;
}

function getGlobalTopNSenders(stats, n) {
  const totals = {};
  for (const week of Object.keys(stats)) {
    const w = stats[week];
    for (const person of Object.keys(w)) {
      const s = w[person];
      const sent = typeof s.messagesSent === 'number' ? s.messagesSent : 0;
      if (sent > 0) totals[person] = (totals[person] || 0) + sent;
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
}

function csvCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
}

function safeInt(val) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function safeNum(val) {
  const n = Number(val);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

module.exports.formatWeeklyTop2Csv = formatWeeklyTop2Csv;
