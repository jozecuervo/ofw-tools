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

// Accepts either:
// 1) ISO range: YYYY-MM-DD – YYYY-MM-DD (em dash or hyphen)
// 2) Short month range: Jan 01 - Jan 07, 2025 (as produced by getWeekString)
function parseWeekLabelToStartEnd(label) {
  if (!label || typeof label !== 'string') return { startISO: '', endISO: '' };
  // Try ISO first (em dash or hyphen)
  const isoMatch = label.match(/(\d{4}-\d{2}-\d{2})\s*[–-]\s*(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { startISO: isoMatch[1], endISO: isoMatch[2] };
  }

  // Try "Mon dd - Mon dd, yyyy"
  const m = label.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*-\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return { startISO: '', endISO: '' };

  const monthToIndex = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const startMon = monthToIndex[m[1].toLowerCase()];
  const startDay = Number(m[2]);
  const endMon = monthToIndex[m[3].toLowerCase()];
  const endDay = Number(m[4]);
  const endYear = Number(m[5]);

  // Determine start year (week can cross the year boundary)
  let startYear = endYear;
  if (startMon === 11 && endMon === 0) {
    // Dec → Jan transition
    startYear = endYear - 1;
  }

  const startDate = new Date(startYear, startMon, startDay);
  const endDate = new Date(endYear, endMon, endDay);

  return {
    startISO: toISODate(startDate),
    endISO: toISODate(endDate),
  };
}

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = { formatWeeklyCsv };

// Build a second CSV focused on the global top 2 senders across all weeks
function formatWeeklyTop2Csv(stats) {
  const [first, second] = getGlobalTopNSenders(stats, 2);
  const nameA = first || '';
  const nameB = second || '';
  const initialA = nameA.charAt(0).toUpperCase();
  const initialB = nameB.charAt(0).toUpperCase();

  let csvOutput = `Week Start,Sent ${nameA},Sent ${nameB},Total Words ${nameA},Total Words ${nameB},Read Time ${nameA},Read Time ${nameB},Sentiment ${nameA},Sentiment ${nameB},Sentiment Natural ${nameA},Sentiment Natural ${nameB},Tone ${nameA},Tone ${nameB}` + "\n";

  const weeks = Object.keys(stats);
  weeks.forEach(week => {
    const w = stats[week] || {};
    const a = w[nameA] || {};
    const b = w[nameB] || {};
    const { startISO, endISO } = parseWeekLabelToStartEnd(week);
    const toneA = (w[nameA] && Number.isFinite(Number(w[nameA].tone))) ? w[nameA].tone : 0;
    const toneB = (w[nameB] && Number.isFinite(Number(w[nameB].tone))) ? w[nameB].tone : 0;
    const row = [
      startISO || '',
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
