import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { ReminderModel } from "@/lib/models";
import { dateRangeSchema } from "@/lib/validators/common";
import { badRequest, ok } from "@/lib/utils/http";

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const input = dateRangeSchema.parse({ from, to });

    const fromDate = new Date(input.from);
    const toDate = new Date(input.to);

    const reminders = await ReminderModel.find({
      status: { $ne: "archived" },
      $or: [
        { startAt: { $gte: fromDate, $lte: toDate } },
        { nextTriggerAt: { $gte: fromDate, $lte: toDate } },
      ],
    })
      .populate("categoryId")
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (reminders as any[]).map((reminder) => {
      // For recurring reminders prefer nextTriggerAt so the event lands on
      // the upcoming occurrence rather than the original creation date.
      const start =
        reminder.type === "recurring" && reminder.nextTriggerAt
          ? new Date(reminder.nextTriggerAt)
          : new Date(reminder.startAt);

      const end = reminder.endAt ? new Date(reminder.endAt) : null;

      return {
        id: String(reminder._id),
        title: reminder.title,
        start,
        end,
        allDay: reminder.allDay ?? false,
        extendedProps: {
          urgency: reminder.urgency,
          iconKey: reminder.iconKey,
          status: reminder.status,
          type: reminder.type,
          category: reminder.categoryId,
          description: reminder.description,
        },
      };
    });

    return ok({ events });
  } catch (error) {
    return badRequest(error);
  }
}
