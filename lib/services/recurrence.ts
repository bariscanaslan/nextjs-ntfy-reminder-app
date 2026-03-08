import type { ReminderDocument } from "@/lib/models/reminder";
import { RRule, rrulestr } from "rrule";

const offsetToMinutes: Record<string, number> = {
  minutes: 1,
  hours: 60,
  days: 1440
};

export function getOffsetMinutes(value: number, unit: "minutes" | "hours" | "days") {
  return value * offsetToMinutes[unit];
}

function isExcluded(date: Date, excludedDates: Date[]) {
  const target = date.toISOString().slice(0, 10);
  return excludedDates.some((d) => d.toISOString().slice(0, 10) === target);
}

/**
 * Returns the timezone offset in milliseconds for a given timezone at a given UTC date.
 * offset = localWallClockAsUTC - realUTC
 * e.g. UTC+3: offset = +10800000
 */
function getTzOffsetMs(tz: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0");

    const localAsUtcMs = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24, // guard against "24" which some implementations return for midnight
      get("minute"),
      get("second")
    );

    return localAsUtcMs - date.getTime();
  } catch {
    return 0; // fallback: treat as UTC
  }
}

/**
 * Convert a real UTC date to "fake UTC" — local wall-clock time treated as UTC.
 * This is what we pass to rrule so BYMONTHDAY/BYDAY rules align with local days.
 */
function toFakeUTC(date: Date, tz: string): Date {
  return new Date(date.getTime() + getTzOffsetMs(tz, date));
}

/**
 * Convert a "fake UTC" date back to real UTC using the given timezone.
 * One refinement iteration handles DST boundary cases.
 */
function fromFakeUTC(fake: Date, tz: string): Date {
  // Approximate: subtract the offset we added
  const approx = new Date(fake.getTime() - getTzOffsetMs(tz, fake));
  // Refine: recalculate offset at the approximate real time
  const refined = new Date(fake.getTime() - getTzOffsetMs(tz, approx));
  return refined;
}

export function getNextOccurrence(reminder: ReminderDocument, from = new Date()) {
  if (reminder.type !== "recurring" || !reminder.rrule) {
    return reminder.startAt >= from ? reminder.startAt : null;
  }

  const tz = reminder.timezone ?? "UTC";
  const startAt = new Date(reminder.startAt as Date);

  // Convert startAt and from to "fake UTC" so rrule works in local wall-clock time.
  // This ensures BYMONTHDAY=1 means "the 1st in the user's timezone", not "the 1st in UTC".
  const dtstart = toFakeUTC(startAt, tz);
  const fromFake = toFakeUTC(from, tz);

  const rule = rrulestr(reminder.rrule, {
    dtstart,
    forceset: false,
  }) as RRule;

  let candidate = rule.after(fromFake, true);

  const excludedDates = (reminder.excludedDates ?? []).map(
    (value) => new Date(value as unknown as string)
  );

  while (candidate) {
    const real = fromFakeUTC(candidate, tz);
    if (!isExcluded(real, excludedDates)) return real;
    candidate = rule.after(new Date(candidate.getTime() + 1000), false);
  }

  return null;
}

export function parseRrulePreview(rruleText: string, startAt: Date, count = 5) {
  const rule = rrulestr(rruleText, { dtstart: startAt }) as RRule;
  return rule.all((_, i) => i < count);
}
