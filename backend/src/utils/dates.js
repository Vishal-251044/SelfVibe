/**
 * Calendar-day helpers for a fixed time zone (stats are counted per day in
 * STATS_TIMEZONE, e.g. India time). Pure functions (unit tested).
 */

/**
 * The calendar day of a moment in a time zone.
 * @param {Date} date
 * @param {string} timeZone - IANA name, e.g. "Asia/Kolkata"
 * @returns {string} "YYYY-MM-DD"
 */
export function zonedDateString(date, timeZone) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * How far a time zone is ahead of UTC at a moment, in ms.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {number}
 */
export function zoneOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The moment a calendar day starts in a time zone.
 * @param {string} day - "YYYY-MM-DD"
 * @param {string} timeZone
 * @returns {Date}
 */
export function startOfZonedDay(day, timeZone) {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  return new Date(utcMidnight - zoneOffsetMs(new Date(utcMidnight), timeZone));
}

/**
 * The last `count` calendar days, oldest first, ending today.
 * @param {number} count
 * @param {string} timeZone
 * @param {Date} [now]
 * @returns {string[]}
 */
export function lastZonedDays(count, timeZone, now = new Date()) {
  const today = zonedDateString(now, timeZone);
  const base = Date.parse(`${today}T12:00:00Z`); // noon avoids any edge
  return Array.from({ length: count }, (_, index) =>
    new Date(base - (count - 1 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
}

/**
 * Milliseconds until the next run of a daily "M H * * *" cron in a time zone.
 * @param {string} pattern - Minute and hour only, e.g. "0 3 * * *"
 * @param {string} timeZone
 * @param {Date} [now]
 * @returns {number}
 */
export function msUntilDailyRun(pattern, timeZone, now = new Date()) {
  const [minute, hour] = pattern.split(" ").map(Number);
  const today = zonedDateString(now, timeZone);
  let next = startOfZonedDay(today, timeZone).getTime() + (hour * 60 + minute) * 60 * 1000;
  if (next <= now.getTime()) next += 24 * 60 * 60 * 1000;
  return next - now.getTime();
}
