// Shared date/time utilities for ofw-tools

// Weekday names and lookup map
const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const nameToOrdinal = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

// Generic month/day helpers
function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getNthOccurrenceDate(year, monthIndex, weekdayOrdinal, n) {
  if (n <= 0) return null;
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const firstOccurDate = 1 + ((weekdayOrdinal - firstDay + 7) % 7);
  const targetDate = firstOccurDate + (n - 1) * 7;
  return targetDate <= daysInMonth(year, monthIndex) ? new Date(year, monthIndex, targetDate) : null;
}

function getFifthOccurrenceDate(year, monthIndex, weekdayOrdinal) {
  return getNthOccurrenceDate(year, monthIndex, weekdayOrdinal, 5);
}

// Visitation calendar helpers
function getFirstAnchorOfMonth(year, month, anchorOrdinal) {
  let date = new Date(year, month - 1, 1);
  while (date.getDay() !== anchorOrdinal) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function getFirstWeekStart(year, month, anchorOrdinal) {
  const firstAnchor = getFirstAnchorOfMonth(year, month, anchorOrdinal);
  const firstWeekStart = new Date(firstAnchor);
  firstWeekStart.setDate(firstAnchor.getDate() - firstAnchor.getDay());
  return firstWeekStart;
}

// Week label helper (Sunday-Saturday)
function pad2(n) { return String(n).padStart(2, '0'); }
function monthShort(d) { return d.toLocaleString('en-US', { month: 'short' }); }
function getWeekString(dateLike) {
  const d = toDate(dateLike);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  return `${monthShort(start)} ${pad2(start.getDate())} - ${monthShort(end)} ${pad2(end.getDate())}, ${end.getFullYear()}`;
}

// Formatting helpers
function toDate(val) {
  return val instanceof Date ? val : new Date(val);
}

function formatDateMMMddYYYY(value) {
  const d = toDate(value);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateMMDDYYYY(value) {
  const d = toDate(value);
  return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function formatTimeHHMM(value) {
  const d = toDate(value);
  return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// OFW-specific date parsing/formatting
function parseDate(dateStr) {
  const s = String(dateStr).replace(' at ', ' ').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) {
    // Fallback to Date constructor if format is unexpected
    return new Date(s);
  }
  let mm = Number(m[1]);
  let dd = Number(m[2]);
  let yyyy = Number(m[3]);
  let hh = Number(m[4]);
  const min = Number(m[5]);
  const ampm = m[6].toUpperCase();
  if (ampm === 'AM') {
    if (hh === 12) hh = 0;
  } else { // PM
    if (hh !== 12) hh += 12;
  }
  // Construct in local time zone
  return new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
}

function formatDateGeneric(value) {
  if (typeof value === 'object' && value) {
    const s = toDate(value).toString();
    // Strip timezone suffix for stable output
    return s.replace(/ GMT[+-]\d{4}.*$/, '');
  }
  return value;
}

module.exports = {
  // constants
  weekdayNames,
  nameToOrdinal,
  // month/day helpers
  daysInMonth,
  getNthOccurrenceDate,
  getFifthOccurrenceDate,
  // visitation helpers
  getFirstAnchorOfMonth,
  getFirstWeekStart,
  // formatters
  formatDateMMMddYYYY,
  formatDateMMDDYYYY,
  formatTimeHHMM,
  getWeekString,
  parseDate,
  formatDate: formatDateGeneric,
};
