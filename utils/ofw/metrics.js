const Sentiment = require('sentiment');
const natural = require('natural');

const sentiment = new Sentiment();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

/**
 * Ensure derived metrics exist on each message and add per-word normalized scores.
 * - wordCount: computed from body when missing
 * - sentiment: Sentiment package score
 * - sentiment_natural: Natural AFINN score
 * - sentiment_per_word: sentiment ÷ max(1, wordCount)
 * - natural_per_word: sentiment_natural ÷ max(1, wordCount)
 *
 * @param {Array<object>} messages
 * @returns {Array<object>} same array (mutated) for convenience
 */
function computeDerivedMetrics(messages) {
  if (!Array.isArray(messages)) return [];
  messages.forEach(message => {
    if (!message || typeof message !== 'object') return;
    const body = String(message.body || '');
    const wordCount = (typeof message.wordCount === 'number' && Number.isFinite(message.wordCount))
      ? message.wordCount
      : (body ? body.split(/\s+/).filter(Boolean).length : 0);
    message.wordCount = wordCount;

    // Always compute sentiments from body to avoid stale placeholders
    const s = body ? sentiment.analyze(body).score : 0;
    message.sentiment = s;

    const n = body ? analyzer.getSentiment(body.split(/\s+/)) : 0;
    message.sentiment_natural = n;

    const denom = Math.max(1, wordCount);
    message.sentiment_per_word = s / denom;
    message.natural_per_word = n / denom;
  });
  return messages;
}

module.exports = { computeDerivedMetrics };


