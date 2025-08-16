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
    tone,
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
    `- Message ${index + 1} of ${total}`,
    `- Word Count: **${wordCount}**, Sentiment: **${sentiment}**, Natural: **${sentiment_natural}**, Tone: **${tone}**`,
    '',
    body || '',
    '',
    ''
  ].join('\n');
}

function formatTotalsMarkdown(totals, options = {}) {
  const shouldHide = createNameFilter(options.excludePatterns);
  let out = [];
  // All-time totals summary (messages, threads, words)
  const entries = Object.entries(totals || {});
  const totalMessages = entries.reduce((acc, [, t]) => acc + (t && t.messagesSent ? t.messagesSent : 0), 0);
  const totalWords = entries.reduce((acc, [, t]) => acc + (t && t.totalWords ? t.totalWords : 0), 0);
  const ts = options && options.threadStats && options.threadStats.totals ? options.threadStats.totals : null;
  
  let header = '| Name             | Sent | Words | View Time (hrs) | Avg View Time (hrs) | Avg. Sentiment | Sentiment ntrl |';
  let separator = '|------------------|------|-------|-----------------|---------------------|----------------|----------------|';
  out.push('\n');
  out.push(separator);
  out.push(header);
  out.push(separator);
  for (const [person, personTotals] of Object.entries(totals)) {
    if (shouldHide(person)) continue;
    const paddedName = person.padEnd(16);
    const paddedSent = personTotals.messagesSent.toString().padStart(5);
    const paddedTotalTime = (personTotals.totalReadTime).toFixed(1).toString().padStart(16);
    const paddedAvgTime = (personTotals.averageReadTime).toFixed(1).toString().padStart(20);
    const wordCountDisplay = personTotals.messagesSent > 0 ? personTotals.totalWords.toString().padStart(6) : ' '.padStart(6);
    const paddedSentiment = personTotals.avgSentiment.toFixed(2).toString().padStart(14);
    const naturalAvg = (personTotals.avgSentimentNatural !== undefined) ? personTotals.avgSentimentNatural : personTotals.sentiment_natural;
    const paddedSentiment_natural = Number(naturalAvg).toFixed(2).toString().padStart(14);
    const row = `| ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedTotalTime} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} |`;
    out.push(row);
  }
  // Totals row inside the table for Messages and Words
  out.push(separator);
  const nameBlank = ''.padEnd(16);
  const sentTotal = String(totalMessages).padStart(5);
  const wordsTotal = String(totalWords).padStart(6);
  const totalTimeBlank = ''.padStart(16);
  const avgTimeBlank = ''.padStart(20);
  const avgSentBlank = ''.padStart(14);
  const avgNatBlank = ''.padStart(14);
  const totalsRow = `| ${nameBlank} |${sentTotal} |${wordsTotal} |${totalTimeBlank} |${avgTimeBlank} | ${avgSentBlank} | ${avgNatBlank} |`;
  out.push(totalsRow);
  out.push(separator);
  if (ts) {
    const parts = [
      `Threads: ${ts.totalThreads}`,
      `Avg Messages / Thread: ${Number(ts.averageThreadLength).toFixed(2)}`,
    ];
    if (typeof ts.avgDaysPerThread === 'number') parts.push(`Avg days per thread: ${Number(ts.avgDaysPerThread).toFixed(2)}`);
    if (typeof ts.avgWordsPerThread === 'number') parts.push(`Avg words per thread: ${Number(ts.avgWordsPerThread).toFixed(0)}`);
    out.push(`All-time totals —  ${parts.join(', ')}`);
    out.push('');
  }
  out.push('\n');
  return out.join('\n');
}

function formatWeeklyMarkdown(stats, options = {}) {
  const shouldHide = createNameFilter(options.excludePatterns);

  let out = [];
  let header = '| Week                  | Name             | Sent | Words | Avg View Time | Avg. Sentiment | Sentiment ntrl | Threads | Avg Thread |';
  let separator = '|-----------------------|------------------|------|-------|---------------|----------------|----------------|---------|------------|';
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
      const row = `| ${paddedWeek} | ${paddedName} |${paddedSent} |${wordCountDisplay} |${paddedAvgTime} | ${paddedSentiment} | ${paddedSentiment_natural} | ${''.padStart(7)} | ${''.padStart(10)} |`;
      out.push(row);
      previousWeek = week;
    }
    // Add weekly thread summary row if available
    const weeklyThreads = options && options.threadStats && options.threadStats.weekly ? options.threadStats.weekly[week] : null;
    if (weeklyThreads) {
      const paddedThreads = String(weeklyThreads.totalThreads).padStart(7);
      const avgStr = Number(weeklyThreads.averageThreadLength).toFixed(2).toString().padStart(10);
      const paddedAvgTime = ' '.padStart(14);
      const row = `| ${''.padEnd(21)} | ${''.padEnd(16)} |${''.padEnd(5)} |${''.padStart(6)} |${paddedAvgTime} | ${' '.padStart(14)} | ${' '.padStart(14)} | ${paddedThreads} | ${avgStr} |`;
      out.push(row);
    }
  }
  out.push(separator);
  return out.join('\n');
}

function truncate(text, max = 80) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function formatThreadTreeMarkdown(messages, options = {}) {
  if (!Array.isArray(messages)) return '';
  const threads = new Map(); // id -> { messages: [], subjectCounts: Map, participants: Set }
  messages.forEach(m => {
    if (!m || m._nonMessage) return;
    const id = m.threadId != null ? m.threadId : m.threadKey || 'unknown';
    if (!threads.has(id)) threads.set(id, { messages: [], subjectCounts: new Map(), participants: new Set() });
    const t = threads.get(id);
    t.messages.push(m);
    const subj = String(m.subject || '').trim();
    if (subj) t.subjectCounts.set(subj, (t.subjectCounts.get(subj) || 0) + 1);
    if (m.sender) t.participants.add(String(m.sender).trim());
    if (m.recipientReadTimes && typeof m.recipientReadTimes === 'object') {
      Object.keys(m.recipientReadTimes).forEach(name => name && t.participants.add(String(name).trim()));
    }
  });

  const pickSubject = (map) => {
    let best = '';
    let bestCount = -1;
    for (const [k, v] of map.entries()) {
      if (v > bestCount) { best = k; bestCount = v; }
    }
    return best || 'No subject';
  };

  const lines = [];
  lines.push('# Threads');
  const sortedIds = Array.from(threads.keys()).sort((a, b) => {
    const ma = threads.get(a).messages;
    const mb = threads.get(b).messages;
    const ta = ma.length ? new Date(ma[0].sentDate).getTime() : 0;
    const tb = mb.length ? new Date(mb[0].sentDate).getTime() : 0;
    return ta - tb;
  });
  sortedIds.forEach(id => {
    const t = threads.get(id);
    t.messages.sort((a, b) => new Date(a.sentDate) - new Date(b.sentDate));
    const subject = pickSubject(t.subjectCounts);
    const participants = Array.from(t.participants).sort((a, b) => a.localeCompare(b)).join(', ');
    lines.push('');
    lines.push(`### Thread ${id}: ${subject} (${t.messages.length})`);
    if (participants) lines.push(`Participants: ${participants}`);
    t.messages.forEach((m, idx) => {
      const last = idx === t.messages.length - 1;
      const branch = last ? '└─' : '├─';
      const ts = formatDate(m.sentDate);
      const preview = truncate(m.body || '', 100) || '(no body)';
      lines.push(`${branch} ${m.sender || 'Unknown'} — ${ts} — ${preview}`);
    });
  });
  lines.push('');
  return lines.join('\n');
}

module.exports = { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown, formatThreadTreeMarkdown, createNameFilter };


