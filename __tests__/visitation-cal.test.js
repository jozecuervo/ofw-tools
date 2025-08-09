const {
  // Export functions by requiring the module then referencing directly (module currently runs CLI by default).
} = (() => {
  const mod = require('../visitation-cal.js');
  return mod || {};
})();

// Since visitation-cal.js is primarily a CLI script, we test core behavior indirectly
// by importing and reusing functions if exported in the future. For now, reimplement
// minimal helpers in-test to validate expectations against Date outputs.

const { getFirstAnchorOfMonth, getFirstWeekStart } = require('../visitation-cal.js');

describe('visitation-cal basics', () => {
  test('getFirstAnchorOfMonth finds first Friday of April 2024', () => {
    const d = getFirstAnchorOfMonth(2024, 4, 5);
    expect(d.toDateString()).toBe('Fri Apr 05 2024');
  });

  test('getFirstWeekStart aligns to Sunday for the first anchor week', () => {
    const start = getFirstWeekStart(2024, 4, 5);
    expect(start.getDay()).toBe(0); // Sunday
    expect(start.toDateString()).toBe('Sun Mar 31 2024');
  });
});


