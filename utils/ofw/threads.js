/**
 * Thread assignment for OFW messages.
 * Strategy: subject-based normalization with participant set and safeguards for "No subject".
 */

function normalizeWhitespace(input) {
  return String(input || '')
    .replace(/[\u00A0\u200E\u200F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove common reply/forward prefixes and normalize subject for grouping.
 * Examples: "Re: Re: Update" -> "update"; "FW: Notice" -> "notice".
 */
function normalizeSubject(subjectRaw) {
  let s = normalizeWhitespace(subjectRaw).toLowerCase();
  // Iteratively remove prefixes like re:, fw:, fwd:
  // Limit loops to prevent pathological cases
  for (let i = 0; i < 5; i++) {
    const next = s.replace(/^(re|fw|fwd)\s*:\s*/i, '');
    if (next === s) break;
    s = next;
  }
  // After removing prefixes, strip one or more leading bracket tags like [External]
  for (let i = 0; i < 5; i++) {
    const next = s.replace(/^\[[^\]]+\]\s*/i, '');
    if (next === s) break;
    s = next;
  }
  // Collapse punctuation that rarely differentiates threads
  s = s.replace(/[\-–—_~*\[\](){}<>"'`.,!?#:;]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s || 'no subject';
}

function getParticipants(message) {
  const participants = new Set();
  if (message && message.sender) participants.add(String(message.sender).trim());
  if (message && message.recipientReadTimes && typeof message.recipientReadTimes === 'object') {
    Object.keys(message.recipientReadTimes).forEach(name => {
      if (name) participants.add(String(name).trim());
    });
  }
  return Array.from(participants).sort((a, b) => a.localeCompare(b));
}

function yyyymmdd(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'unknown';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute a stable thread key for a message using subject and participants.
 * For "no subject", include the day to avoid over-grouping across long timespans.
 */
function computeThreadKey(message) {
  const subjectNorm = normalizeSubject(message && message.subject);
  const participants = getParticipants(message).join('|');
  if (subjectNorm === 'no subject') {
    const day = yyyymmdd(message && message.sentDate);
    return `nosubj|${day}|${participants}`;
  }
  return `${subjectNorm}|${participants}`;
}

/**
 * Assign thread identifiers to messages in-place and return the same array for convenience.
 * Adds: message.threadId (number), message.threadKey (string), message.threadIndex (0-based order within thread)
 *
 * @param {Array<object>} messages
 * @returns {Array<object>}
 */
function assignThreads(messages, options = {}) {
  if (!Array.isArray(messages)) return [];
  const inactivityDays = Number.isFinite(Number(options.inactivityDays)) ? Number(options.inactivityDays) : 30;
  const maxGapMs = Math.max(0, inactivityDays) * 24 * 60 * 60 * 1000;

  const keyToMessages = new Map();
  messages.forEach(msg => {
    if (!msg || typeof msg !== 'object') return;
    const key = computeThreadKey(msg);
    if (!keyToMessages.has(key)) keyToMessages.set(key, []);
    keyToMessages.get(key).push(msg);
  });

  let nextId = 1;
  keyToMessages.forEach((list, key) => {
    list.sort((a, b) => {
      const at = a && a.sentDate instanceof Date ? a.sentDate.getTime() : new Date(a.sentDate || 0).getTime();
      const bt = b && b.sentDate instanceof Date ? b.sentDate.getTime() : new Date(b.sentDate || 0).getTime();
      if (at !== bt) return at - bt;
      const abody = String(a && a.body || '');
      const bbody = String(b && b.body || '');
      return abody.localeCompare(bbody);
    });

    let segmentIndex = 1;
    let segmentStartIdx = 0;
    let lastTime = null;
    for (let i = 0; i < list.length; i++) {
      const msg = list[i];
      const t = msg && msg.sentDate instanceof Date ? msg.sentDate.getTime() : new Date(msg.sentDate || 0).getTime();
      const gap = (lastTime != null && Number.isFinite(lastTime) && Number.isFinite(t)) ? (t - lastTime) : 0;
      const shouldSplit = maxGapMs > 0 && gap > maxGapMs;
      if (i === 0 || shouldSplit) {
        // Start new segment
        if (i > 0) {
          segmentIndex += 1;
        }
        const segId = nextId++;
        msg.threadId = segId;
        msg.threadKey = `${key}#${segmentIndex}`;
        msg.threadIndex = 0;
        segmentStartIdx = i;
      } else {
        // Continue current segment; inherit segment id from previous
        const prev = list[i - 1];
        msg.threadId = prev.threadId;
        msg.threadKey = prev.threadKey;
        msg.threadIndex = (prev.threadIndex || 0) + 1;
      }
      lastTime = t;
    }
  });

  return messages;
}

module.exports = { normalizeSubject, assignThreads, computeThreadKey };

/**
 * Build per-thread summaries for reporting/CSV.
 * @param {Array<object>} messages
 * @returns {Array<object>} summaries
 */
function summarizeThreads(messages) {
  if (!Array.isArray(messages)) return [];
  const byId = new Map();
  function ensure(threadId) {
    if (!byId.has(threadId)) {
      byId.set(threadId, {
        threadId,
        threadKey: null,
        subject: '',
        messagesCount: 0,
        firstSent: null,
        lastSent: null,
        totalWords: 0,
        sentimentTotal: 0,
        toneTotal: 0,
        participants: new Set(),
        subjectCounts: new Map(),
      });
    }
    return byId.get(threadId);
  }

  messages.forEach(m => {
    if (!m || m._nonMessage) return;
    const id = (m.threadId != null) ? m.threadId : (m.threadKey || 'unknown');
    const t = ensure(id);
    if (!t.threadKey && m.threadKey) t.threadKey = m.threadKey;
    const sd = m.sentDate instanceof Date ? m.sentDate : new Date(m.sentDate);
    if (!t.firstSent || sd < t.firstSent) t.firstSent = sd;
    if (!t.lastSent || sd > t.lastSent) t.lastSent = sd;
    t.messagesCount += 1;
    t.totalWords += Number(m.wordCount) || 0;
    t.sentimentTotal += Number(m.sentiment) || 0;
    t.toneTotal += Number(m.tone) || 0;
    if (m.sender) t.participants.add(String(m.sender).trim());
    if (m.recipientReadTimes && typeof m.recipientReadTimes === 'object') {
      Object.keys(m.recipientReadTimes).forEach(name => name && t.participants.add(String(name).trim()));
    }
    const subj = String(m.subject || '').trim();
    if (subj) t.subjectCounts.set(subj, (t.subjectCounts.get(subj) || 0) + 1);
  });

  function pickSubject(map) {
    let best = '';
    let bestCount = -1;
    for (const [k, v] of map.entries()) {
      if (v > bestCount) { best = k; bestCount = v; }
    }
    return best || 'No subject';
  }

  const out = Array.from(byId.values()).map(t => {
    const spanMs = (t.firstSent && t.lastSent) ? (t.lastSent - t.firstSent) : 0;
    const spanDays = spanMs > 0 ? (spanMs / (1000 * 60 * 60 * 24)) : 0;
    return {
      threadId: t.threadId,
      threadKey: t.threadKey,
      subject: pickSubject(t.subjectCounts),
      messages: t.messagesCount,
      firstSentISO: t.firstSent ? t.firstSent.toISOString() : '',
      lastSentISO: t.lastSent ? t.lastSent.toISOString() : '',
      spanDays: Number(spanDays.toFixed(2)),
      participants: Array.from(t.participants).sort((a, b) => a.localeCompare(b)),
      totalWords: t.totalWords,
      avgSentiment: t.messagesCount ? Number((t.sentimentTotal / t.messagesCount).toFixed(2)) : 0,
      tone: t.messagesCount ? Number((t.toneTotal / t.messagesCount).toFixed(2)) : 0,
    };
  });

  out.sort((a, b) => (new Date(a.firstSentISO)) - (new Date(b.firstSentISO)));
  return out;
}

module.exports.summarizeThreads = summarizeThreads;


