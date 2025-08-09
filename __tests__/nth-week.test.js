const {
  daysInMonth,
  getFifthOccurrenceDate,
  computeMonthsWithFifth,
  listFifthOccurrenceDates,
  tallyFifthWeeks,
} = require('../nth-week');

describe('nth-week helpers', () => {
  test('daysInMonth handles leap years', () => {
    expect(daysInMonth(2024, 1)).toBe(29); // Feb 2024
    expect(daysInMonth(2025, 1)).toBe(28); // Feb 2025
  });

  test('getFifthOccurrenceDate finds 5th Friday in March 2024', () => {
    // March 2024 has Fridays on 1,8,15,22,29 → 5th on 29th
    const d = getFifthOccurrenceDate(2024, 2, 5);
    expect(d).not.toBeNull();
    expect(d.toISOString().substring(0,10)).toBe('2024-03-29');
  });

  test('getFifthOccurrenceDate returns null when there is no 5th occurrence', () => {
    // April 2024 Fridays: 5,12,19,26 → only 4
    const d = getFifthOccurrenceDate(2024, 3, 5);
    expect(d).toBeNull();
  });

  test('computeMonthsWithFifth aggregates distinct months and per-year counts', () => {
    const { total, perYear } = computeMonthsWithFifth(2024, 2024, 5);
    // In 2024, Fridays have 4 months with a 5th occurrence (Mar, May, Aug, Nov)
    expect(total).toBe(4);
    expect(perYear[2024]).toBe(4);
  });

  test('listFifthOccurrenceDates returns ISO dates by year', () => {
    const { datesByYear, total } = listFifthOccurrenceDates(2024, 2024, 5);
    expect(total).toBe(4);
    expect(datesByYear[2024]).toEqual([
      '2024-03-29',
      '2024-05-31',
      '2024-08-30',
      '2024-11-29',
    ]);
  });

  test('tallyFifthWeeks sums across range', () => {
    const total = tallyFifthWeeks(2024, 2026, 5, { verboseDates: false, perYear: false });
    expect(total).toBe(12); // 4 per year for Fridays in 2024-2026
  });
});


