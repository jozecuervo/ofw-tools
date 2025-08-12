const { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown } = require('../utils/output/markdown');
const { formatWeeklyCsv } = require('../utils/output/csv');

describe('utils/output', () => {
  test('formatMessageMarkdown includes subject and body', () => {
    const str = formatMessageMarkdown({
      sentDate: new Date('2025-01-01'),
      sender: 'A',
      recipientReadTimes: {},
      wordCount: 5,
      sentiment: 0,
      sentiment_natural: 0,
      subject: 'Hello',
      body: 'World',
    }, 0, 1);
    expect(str).toMatch(/Message 1 of 1/);
    expect(str).toMatch(/Hello/);
    expect(str).toMatch(/World/);
  });

  test('formatWeeklyCsv outputs header and rows', () => {
    const csv = formatWeeklyCsv({
      '2025-01-01 – 2025-01-07': {
        A: { messagesSent: 1, messagesRead: 1, averageReadTime: 10, totalWords: 5, avgSentiment: 0.5, sentiment_natural: 0.2 },
      }
    });
    const header = csv.split('\n')[0];
    expect(header).toMatch(/Week Start,Week End,Name,Messages Sent/);
    // Expect ISO date columns present
    expect(csv).toMatch(/"2025-01-01"/);
    expect(csv).toMatch(/"2025-01-07"/);
  });
});


