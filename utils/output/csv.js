function formatWeeklyCsv(stats) {
  let csvOutput = 'Week Start,Week End,Name,Messages Sent,Messages Read,Average Read Time (minutes),Total Words, Sentiment, Sentiment_natural\n';
  for (const [week, weekStats] of Object.entries(stats)) {
    const { startISO, endISO } = parseWeekLabelToStartEnd(week);
    for (const [person, personStats] of Object.entries(weekStats)) {
      const wordCount = (personStats.totalWords !== undefined) ? personStats.totalWords : '';
      csvOutput += `${startISO ? `"${startISO}"` : ''},${endISO ? `"${endISO}"` : ''},"${person}",${personStats.messagesSent},${personStats.messagesRead},${personStats.averageReadTime.toFixed(2)},${wordCount},${personStats.avgSentiment.toFixed(2)},${personStats.sentiment_natural.toFixed(2)}\n`;
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


