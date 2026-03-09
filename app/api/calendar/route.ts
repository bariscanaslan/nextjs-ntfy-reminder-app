import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { ReminderModel } from "@/lib/models";
import { dateRangeSchema } from "@/lib/validators/common";
import { getOccurrencesInRange } from "@/lib/services/recurrence";
import { badRequest, ok } from "@/lib/utils/http";

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const input = dateRangeSchema.parse({ from, to });

    const fromDate = new Date(input.from);
    const toDate = new Date(input.to);

    // Fetch all non-archived reminders that could have occurrences in the range.
    // For recurring reminders we cannot rely on nextTriggerAt alone — we need all
    // reminders that ever started before `to` and might recur into the range.
    const reminders = await ReminderModel.find({
      status: { $ne: "archived" },
      startAt: { $lte: toDate },
    })
      .populate("categoryId")
      .lean();

    type ReminderDoc = {
      _id: { toString(): string };
      title: string;
      type?: string;
      status?: string;
      urgency?: string;
      iconKey?: string;
      allDay?: boolean;
      startAt: Date;
      endAt?: Date | null;
      nextTriggerAt?: Date | null;
      rrule?: string | null;
      timezone?: string;
      excludedDates?: Date[];
      categoryId?: unknown;
      description?: string;
    };

    const events: Array<{
      id: string;
      title: string;
      start: Date;
      end: Date | null;
      allDay: boolean;
      extendedProps: Record<string, unknown>;
    }> = [];

    for (const reminder of reminders as unknown as ReminderDoc[]) {
      const baseExtendedProps = {
        urgency: reminder.urgency,
        iconKey: reminder.iconKey,
        status: reminder.status,
        type: reminder.type,
        category: reminder.categoryId,
        description: reminder.description,
        reminderId: String(reminder._id),
      };

      if (reminder.type === "recurring" && reminder.rrule) {
        // Expand all occurrences within the requested date range.
        const occurrences = getOccurrencesInRange(
          reminder as unknown as Parameters<typeof getOccurrencesInRange>[0],
          fromDate,
          toDate
        );

        for (const occ of occurrences) {
          events.push({
            // Unique ID per occurrence so FullCalendar treats them as separate events.
            id: `${reminder._id}_${occ.getTime()}`,
            title: reminder.title,
            start: occ,
            end: null,
            allDay: reminder.allDay ?? false,
            extendedProps: baseExtendedProps,
          });
        }
      } else {
        // One-time / deadline / habit — single event at startAt (or nextTriggerAt if applicable).
        const start = new Date(reminder.startAt);
        const end = reminder.endAt ? new Date(reminder.endAt) : null;

        // Only include if the event falls within the requested range.
        if (start <= toDate && (end ? end >= fromDate : start >= fromDate)) {
          events.push({
            id: String(reminder._id),
            title: reminder.title,
            start,
            end,
            allDay: reminder.allDay ?? false,
            extendedProps: baseExtendedProps,
          });
        }
      }
    }

    return ok({ events });
  } catch (error) {
    return badRequest(error);
  }
}
