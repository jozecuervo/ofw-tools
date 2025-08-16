const { normalizeSubject, assignThreads, computeThreadKey } = require('../utils/ofw/threads');

describe('utils/ofw/threads', () => {
  test('normalizeSubject strips reply/forward prefixes and punctuation', () => {
    expect(normalizeSubject('Re: Re: Update!!!')).toBe('update');
    expect(normalizeSubject('FW:   [External] Notice - FYI')).toBe('notice fyi');
    expect(normalizeSubject('   ')).toBe('no subject');
  });

  test('computeThreadKey includes participants and handles no subject by day', () => {
    const base = { sender: 'Alice', recipientReadTimes: { Bob: new Date() } };
    const m1 = { ...base, subject: 'Hello', sentDate: new Date('2025-01-01T10:00:00') };
    const m2 = { ...base, subject: 're: hello', sentDate: new Date('2025-01-02T10:00:00') };
    const k1 = computeThreadKey(m1);
    const k2 = computeThreadKey(m2);
    expect(k1).toBe(k2); // subject-based match

    const n1 = { ...base, subject: 'No subject', sentDate: new Date('2025-01-01T12:00:00') };
    const n2 = { ...base, subject: 'no subject', sentDate: new Date('2025-01-02T12:00:00') };
    expect(computeThreadKey(n1)).not.toBe(computeThreadKey(n2)); // day bucketed
  });

  test('assignThreads assigns stable ids and indices', () => {
    const messages = assignThreads([
      { sender: 'A', recipientReadTimes: { B: 'Never' }, subject: 'Hi', body: '1', sentDate: new Date('2025-01-01T08:00:00') },
      { sender: 'A', recipientReadTimes: { B: 'Never' }, subject: 're: hi', body: '2', sentDate: new Date('2025-01-01T09:00:00') },
      { sender: 'A', recipientReadTimes: { B: 'Never' }, subject: 'Other', body: 'x', sentDate: new Date('2025-01-01T07:00:00') },
    ]);
    const ids = messages.map(m => m.threadId);
    expect(new Set(ids).size).toBe(2);
    const hiThread = messages.filter(m => m.subject.toLowerCase().includes('hi'));
    expect(hiThread.every(m => m.threadId === hiThread[0].threadId)).toBe(true);
    expect(hiThread.map(m => m.threadIndex)).toEqual([0, 1]);
  });
});


