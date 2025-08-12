const { formatMessageMarkdown, formatTotalsMarkdown, formatWeeklyMarkdown } = require('../utils/output/markdown');
const { formatWeeklyCsv, formatWeeklyTop2Csv } = require('../utils/output/csv');
const { computeTone } = require('../utils/ofw/stats');

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
    expect(header).toMatch(/, Tone$/);
    // Expect ISO date columns present
    expect(csv).toMatch(/"2025-01-01"/);
    expect(csv).toMatch(/"2025-01-07"/);
  });
});

describe('utils/output top2', () => {
  test('formatWeeklyTop2Csv uses global top 2 senders and outputs weekly rows with week start/end', () => {
    const weekly = {
      'Week1': {
        Alice: { messagesSent: 3, messagesRead: 2, totalReadTime: 30, totalWords: 100, avgSentiment: 1.5, sentiment_natural: 0.2 },
        Bob: { messagesSent: 5, messagesRead: 4, totalReadTime: 40, totalWords: 200, avgSentiment: 0.5, sentiment_natural: 0.1 },
        Carol: { messagesSent: 1, messagesRead: 1, totalReadTime: 10, totalWords: 50, avgSentiment: 0.1, sentiment_natural: -0.1 },
      },
      'Week2': {
        Alice: { messagesSent: 7, messagesRead: 3, totalReadTime: 20, totalWords: 150, avgSentiment: 2.5, sentiment_natural: 0.4 },
        Bob: { messagesSent: 2, messagesRead: 1, totalReadTime: 15, totalWords: 80, avgSentiment: -0.5, sentiment_natural: -0.2 },
      },
    };
    const csv = formatWeeklyTop2Csv(weekly);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toMatch(/^Week,Week Start,Week End,Sent (Alice|Bob),Sent (Alice|Bob),Total Words/);
    expect(lines[0]).toMatch(/,Tone (Alice|Bob),Tone (Alice|Bob)$/);
    // Ensure both weeks are present
    expect(lines[1]).toMatch(/^"?Week1"?,/);
    expect(lines[2]).toMatch(/^"?Week2"?,/);
  });

  test('computeTone blends libraries into [-1,1] range', () => {
    const t1 = computeTone({ avgSentiment: 10, sentiment_natural: 2 });
    expect(t1).toBeGreaterThan(0);
    const t2 = computeTone({ avgSentiment: -10, sentiment_natural: -2 });
    expect(t2).toBeLessThan(0);
    const t3 = computeTone(null);
    expect(t3).toBe(0);
  });
});


