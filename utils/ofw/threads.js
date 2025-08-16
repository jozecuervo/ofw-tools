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
function assignThreads(messages) {
  if (!Array.isArray(messages)) return [];
  const keyToId = new Map();
  const idToMessages = new Map();
  let nextId = 1;

  // First pass: compute keys and ids
  messages.forEach(msg => {
    if (!msg || typeof msg !== 'object') return;
    const key = computeThreadKey(msg);
    let id = keyToId.get(key);
    if (!id) {
      id = nextId++;
      keyToId.set(key, id);
      idToMessages.set(id, []);
    }
    msg.threadKey = key;
    msg.threadId = id;
    idToMessages.get(id).push(msg);
  });

  // Second pass: assign index within each thread by sentDate then stable fallback
  idToMessages.forEach(list => {
    list.sort((a, b) => {
      const at = a && a.sentDate instanceof Date ? a.sentDate.getTime() : 0;
      const bt = b && b.sentDate instanceof Date ? b.sentDate.getTime() : 0;
      if (at !== bt) return at - bt;
      const abody = String(a && a.body || '');
      const bbody = String(b && b.body || '');
      return abody.localeCompare(bbody);
    });
    list.forEach((m, idx) => { m.threadIndex = idx; });
  });

  return messages;
}

module.exports = { normalizeSubject, assignThreads, computeThreadKey };


