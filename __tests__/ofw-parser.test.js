const { parseMessage, processMessages } = require('../utils/ofw/parser');

describe('utils/ofw/parser', () => {
  test('parseMessage extracts metadata and body from head-metadata format', () => {
    const block = [
      'Sent:',
      '01/15/2025 at 03:45 PM',
      'From:',
      'José Hernandez',
      'To:',
      'Jane Doe (First Viewed: 01/15/2025 at 04:00 PM)',
      'Subject:',
      'Update',
      '',
      'Meeting moved to tomorrow at 9am.',
    ].join('\n');
    const msg = parseMessage(block);
    expect(msg.sender).toBe('José Hernandez');
    expect(msg.subject).toBe('Update');
    expect(typeof msg.sentDate.getTime()).toBe('number');
    expect(msg.recipientReadTimes['Jane Doe']).toBeInstanceOf(Date);
    expect(msg.body.includes('Meeting moved')).toBe(true);
    expect(typeof msg.wordCount).toBe('number');
    expect(typeof msg.sentiment).toBe('number');
    expect(typeof msg.sentiment_natural).toBe('number');
  });

  test('processMessages splits by true boundary lines', () => {
    const block = [
      'Message 1 of 2',
      'Sent: 01/15/2025 at 03:45 PM',
      'From: A',
      'To: B (First Viewed: 01/15/2025 at 04:00 PM)',
      'Subject: S1',
      'Body1',
      'Message 2 of 2',
      'Sent: 01/16/2025 at 10:00 AM',
      'From: A',
      'To: C (First Viewed: 01/16/2025 at 10:05 AM)',
      'Subject: S2',
      'Body2',
    ].join('\n');
    const messages = processMessages(block);
    expect(messages.length).toBe(2);
    expect(messages[0].subject).toBe('S1');
    expect(messages[1].subject).toBe('S2');
  });
});


