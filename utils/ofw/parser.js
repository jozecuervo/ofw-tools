// Sentiment processing moved to `utils/ofw/metrics.js` to keep this parser pure.

const { parseDate } = require('../date');

/**
 * Parse a single OFW message block into a message object.
 * @param {string} messageBlock
 * @returns {{
 *  sentDate: Date,
 *  sender: string,
 *  recipientReadTimes: Record<string, Date|'Never'>,
 *  subject: string,
 *  body: string,
 *  wordCount: number,
 *  sentiment: number,
 *  sentiment_natural: number,
 * }}
 */
function parseMessage(messageBlock) {
  const message = { body: '', wordCount: 0, recipientReadTimes: {} };

  function normalize(raw) {
    return String(raw)
      .replace(/\u00A0/g, ' ')
      .replace(/\u200E|\u200F/g, '')
      .replace(/\uFF1A/g, ':')
      .trim();
  }
  const lines = messageBlock.split('\n').map(normalize);
  const metaRegex = /^(Sent|From|To|Subject)\s*:\s*(.*)$/i;

  let subjectIdx = -1, toIdx = -1, fromIdx = -1, sentIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(metaRegex);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = (m[2] || '').trim();
    if (subjectIdx === -1 && key === 'subject') { subjectIdx = i; message.subject = val || ''; }
    else if (toIdx === -1 && key === 'to') { toIdx = i; }
    else if (fromIdx === -1 && key === 'from') { fromIdx = i; message.sender = val || ''; }
    else if (sentIdx === -1 && key === 'sent') { sentIdx = i; if (val) message.sentDate = parseDate(val); }
  }

  if (toIdx !== -1) {
    const end = subjectIdx !== -1 ? subjectIdx : lines.length;
    for (let j = toIdx; j < end; j++) {
      const line = lines[j];
      const m = line.match(metaRegex);
      if (m && m[1].toLowerCase() !== 'to') break;
      const fv = line.match(/(.+?)\(First Viewed: (.+?)\)/);
      if (fv) {
        const recipient = fv[1].trim();
        const firstViewed = fv[2].trim();
        message.recipientReadTimes[recipient] = firstViewed !== 'Never' ? parseDate(firstViewed) : 'Never';
      }
    }
  }

  const isMetaAt = (idx) => idx >= 0 && idx < lines.length && metaRegex.test(lines[idx]);
  const nextNonEmpty = (idx) => {
    let j = idx + 1;
    while (j < lines.length && !lines[j]) j++;
    return j < lines.length ? lines[j] : '';
  };
  if (!message.sentDate && sentIdx !== -1) {
    const v = nextNonEmpty(sentIdx);
    if (v && !metaRegex.test(v)) message.sentDate = parseDate(v);
  }
  if (!message.sender && fromIdx !== -1) {
    const v = nextNonEmpty(fromIdx);
    if (v && !metaRegex.test(v)) message.sender = v.trim();
  }
  if (!message.subject && subjectIdx !== -1) {
    const v = nextNonEmpty(subjectIdx);
    if (v && !metaRegex.test(v)) message.subject = v.trim();
  }

  const metaIdxs = [subjectIdx, toIdx, fromIdx, sentIdx].filter(i => i !== -1).sort((a,b)=>a-b);
  const firstMetaIdx = metaIdxs.length ? metaIdxs[0] : -1;
  const lastMetaIdx = metaIdxs.length ? metaIdxs[metaIdxs.length - 1] : -1;

  const nextNonEmptyIndex = (idx) => {
    let j = idx + 1;
    while (j < lines.length && !lines[j]) j++;
    return j;
  };

  let bodyStart = 0;
  let bodyEnd = lines.length;
  const looksLikeHeadMeta = firstMetaIdx !== -1 && firstMetaIdx < 10; // metadata block at top
  if (looksLikeHeadMeta && subjectIdx !== -1) {
    const subjValIdx = nextNonEmptyIndex(subjectIdx);
    bodyStart = (subjValIdx < lines.length && !metaRegex.test(lines[subjValIdx])) ? subjValIdx + 1 : subjectIdx + 1;
  } else if (firstMetaIdx !== -1) {
    bodyEnd = firstMetaIdx;
  }

  const bodyLines = lines
    .slice(bodyStart, bodyEnd)
    .filter(l => {
      if (!l) return false;
      if (metaRegex.test(l)) return false;
      if (/Page\s+\d+\s+of\s+\d+/i.test(l)) return false;
      if (/^\s*\|\s*Message ReportPage/i.test(l)) return false;
      return true;
    });
  message.body = bodyLines.join('\n').trim();
  message.wordCount = message.body ? message.body.split(/\s+/).filter(Boolean).length : 0;
  // Defer sentiment computation to metrics stage; initialize with zeros for type stability.
  message.sentiment_natural = 0;
  message.sentiment = 0;
  if (!message.sender) message.sender = 'Unknown';
  if (!message.subject) message.subject = 'No subject';
  return message;
}

/**
 * Convert OFW PDF text into an array of messages.
 * @param {string} text
 * @returns {Array<object>}
 */
function processMessages(text) {
  const messages = [];
  const lines = text.split('\n');
  const boundaryRegex = /^\s*Message\s+\d+\s+of\s+\d+\s*$/;
  let current = [];
  const hasMeta = (block) => /(\n|^)Sent\s*:|\nFrom\s*:|\nTo\s*:|\nSubject\s*:/m.test(block);
  const createPlaceholder = () => ({
    _nonMessage: true,
    sender: 'OFW Report',
    recipientReadTimes: {},
    subject: 'Page Banner',
    body: '',
    wordCount: 0,
    sentiment: 0,
    sentiment_natural: 0,
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (boundaryRegex.test(line)) {
      if (current.length) {
        const blockText = current.join('\n');
        messages.push(hasMeta(blockText) ? parseMessage(blockText) : createPlaceholder());
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) {
    const blockText = current.join('\n');
    if (hasMeta(blockText)) messages.push(parseMessage(blockText));
  }
  return messages;
}

module.exports = { parseMessage, processMessages };


