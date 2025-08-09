jest.mock('polarity', () => ({ polarity: () => ({ polarity: 0 }) }), { virtual: true });

const {
  analyzeSentiment,
  getYearFromTimestamp,
  parseIMessageText,
  summarizeGroupedMessages,
} = require('../imessage');

describe('imessage parser', () => {
  test('extracts year from timestamp', () => {
    expect(getYearFromTimestamp('Mar 05, 2024 09:12:11 AM (Read)')).toBe('2024');
    expect(getYearFromTimestamp('invalid')).toMatch(/^\d{4}$/);
  });

  test('parses simple conversation and groups by year', () => {
    const sample = [
      'Mar 05, 2024 09:12:11 AM (Read)',
      'José Hernandez',
      'Hello there',
      'This is a test',
      'Mar 05, 2024 10:01:00 AM (Delivered)',
      'Other Person',
      'Reply back',
      '',
    ].join('\n');
    const grouped = parseIMessageText(sample);
    expect(Object.keys(grouped)).toEqual(['2024']);
    expect(grouped['2024']).toHaveLength(2);
    expect(grouped['2024'][0].sender).toBe('José Hernandez');
    expect(grouped['2024'][1].sender).toBe('Other Person');
  });

  test('summary computes totals per year', () => {
    const grouped = { '2023': [{}, {}], '2024': [{}, {}, {}] };
    const summary = summarizeGroupedMessages(grouped);
    expect(summary.totalMessages).toBe(5);
    expect(summary.byYear['2023']).toBe(2);
    expect(summary.byYear['2024']).toBe(3);
  });

  test('sentiment returns numeric scores (mocked polarity)', () => {
    const res = analyzeSentiment('I love sunny days but hate the traffic.');
    expect(typeof res.sentimentScore).toBe('number');
    expect(typeof res.naturalScore).toBe('number');
    expect(typeof res.polarityScore).toBe('number');
  });
});


