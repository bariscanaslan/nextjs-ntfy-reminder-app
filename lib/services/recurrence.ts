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

export function getNextOccurrence(reminder: ReminderDocument, from = new Date()) {
  if (reminder.type !== "recurring" || !reminder.rrule) {
    return reminder.startAt >= from ? reminder.startAt : null;
  }

  const rule = rrulestr(reminder.rrule, {
    dtstart: reminder.startAt,
    forceset: false
  }) as RRule;

  let candidate = rule.after(from, true);

  const excludedDates = (reminder.excludedDates ?? []).map((value) => new Date(value as unknown as string));

  while (candidate && isExcluded(candidate, excludedDates)) {
    candidate = rule.after(new Date(candidate.getTime() + 1000), false);
  }

  return candidate;
}

export function parseRrulePreview(rruleText: string, startAt: Date, count = 5) {
  const rule = rrulestr(rruleText, { dtstart: startAt }) as RRule;
  return rule.all((_, i) => i < count);
}

