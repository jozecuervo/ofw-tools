const { accumulateStats } = require('../utils/ofw/stats');

describe('utils/ofw/stats', () => {
  test('accumulateStats computes totals and weekly', () => {
    const base = new Date('2025-01-05T10:00:00Z');
    const msgs = [
      { sentDate: base, sender: 'A', recipientReadTimes: { B: new Date(base.getTime()+600000) }, wordCount: 10, sentiment: 1, sentiment_natural: 2 },
      { sentDate: new Date(base.getTime()+86400000), sender: 'A', recipientReadTimes: { B: 'Never' }, wordCount: 20, sentiment: -1, sentiment_natural: 0 },
    ];
    const { totals, weekly } = accumulateStats(msgs);
    expect(totals['A'].messagesSent).toBe(2);
    expect(totals['A'].totalWords).toBe(30);
    // One read (10 min)
    expect(totals['B'].messagesRead).toBe(1);
    expect(totals['B'].totalReadTime).toBeGreaterThan(0);
    // Weekly buckets exist
    const weeks = Object.keys(weekly);
    expect(weeks.length).toBeGreaterThan(0);
  });
});


