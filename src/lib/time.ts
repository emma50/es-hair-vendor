/**
 * Lagos-time helpers.
 *
 * The store is physically in Lagos (UTC+1, no DST). Vercel runs every
 * Node function at UTC. Without an explicit conversion, anything
 * built from `new Date().getFullYear()/getMonth()/getDate()` rolls over
 * at UTC midnight (1 AM Lagos), so:
 *
 *   - Order numbers shaped `ESH-YYYYMMDD-NNNN` get yesterday's date
 *     stamp between 00:00 and 01:00 Lagos.
 *   - The admin "today's revenue" / "this week" / "this month" tiles
 *     don't roll over until 1 AM Lagos.
 *
 * These helpers consistently return Lagos-local components and Lagos-
 * midnight `Date` boundaries usable in Prisma `gte`/`lt` filters
 * (Postgres TIMESTAMP comparisons are UTC-based, but a Lagos-midnight
 * absolute instant is still a valid TIMESTAMP — comparisons land on
 * the right rows).
 */

const LAGOS_TZ = 'Africa/Lagos';

/**
 * Return year / month (1-based) / day-of-month / day-of-week (0=Sun..6=Sat)
 * AS THEY ARE IN LAGOS at the given instant. Defaults to `now`.
 *
 * Why `Intl.DateTimeFormat` not `getUTCDate() + 1`: Africa/Lagos has no
 * DST today, but baking the +1 offset into call sites is the kind of
 * thing that breaks silently if Nigeria ever changes its rules. The
 * Intl API consults the OS tz database.
 */
export function lagosParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  // `en-CA` because it formats year-month-day in that order with `-`
  // separators, which is trivial to parse without locale gotchas.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: LAGOS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;
  let weekdayLabel = '';
  for (const part of parts) {
    if (part.type === 'year') year = Number(part.value);
    else if (part.type === 'month') month = Number(part.value);
    else if (part.type === 'day') day = Number(part.value);
    else if (part.type === 'weekday') weekdayLabel = part.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year,
    month,
    day,
    weekday: weekdayMap[weekdayLabel] ?? 0,
  };
}

/**
 * Return the absolute Date instant for "midnight in Lagos on the day
 * containing `date`". For revenue / order-count buckets that should
 * roll over at 00:00 Lagos rather than 00:00 UTC.
 *
 * Lagos has been UTC+1 (WAT, no DST) since 1979. The fixed `-01:00`
 * offset string is correct today and stable for the foreseeable
 * future. If Nigeria ever introduces DST, switch to a tz-aware
 * library (date-fns-tz, Luxon).
 */
export function lagosStartOfDay(date: Date = new Date()): Date {
  const { year, month, day } = lagosParts(date);
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  // 00:00 in Lagos = 23:00 UTC the previous day. The Date constructor
  // applies the `-01:00` offset to land on the right UTC instant.
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00-01:00`);
}

/**
 * Lagos-midnight at the start of the ISO-week (Monday) that contains
 * the given date.
 */
export function lagosStartOfWeek(date: Date = new Date()): Date {
  const start = lagosStartOfDay(date);
  const { weekday } = lagosParts(date);
  // weekday: 0=Sun..6=Sat. Days back to Monday: (w + 6) % 7.
  const daysBack = (weekday + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysBack);
  return start;
}

/**
 * Lagos-midnight on the first day of the month that contains `date`.
 */
export function lagosStartOfMonth(date: Date = new Date()): Date {
  const { year, month } = lagosParts(date);
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-01T00:00:00-01:00`);
}
