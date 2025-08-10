const { analyzeRapidFireMessages } = require('../utils/ofw/clusters');

describe('utils/ofw/clusters', () => {
  test('groups messages within threshold into clusters', () => {
    const base = new Date('2025-01-01T10:00:00Z');
    const mk = (min) => ({ sentDate: new Date(base.getTime() + min*60000), sender: 'A', subject: 's', wordCount: 1 });
    // Gap between 12 -> 45 is 33 min (> 30), creating a split
    const msgs = [ mk(0), mk(5), mk(12), mk(45), mk(50) ];
    const clusters = analyzeRapidFireMessages(msgs, 'A', 30*60);
    expect(clusters.length).toBe(2);
    expect(clusters[0].length).toBe(3);
    expect(clusters[1].length).toBe(2);
  });
});


