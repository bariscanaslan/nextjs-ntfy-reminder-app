import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { ReminderModel, DeliveryJobModel } from "@/lib/models";
import { enqueueOccurrenceJobs, computeAndPersistNextTrigger } from "@/lib/services/scheduler";
import { reminderCreateSchema } from "@/lib/validators/reminder";
import { badRequest, ok, serverError } from "@/lib/utils/http";

/**
 * Silently recompute nextTriggerAt for any active reminders whose stored value
 * is in the past (stale state caused by delivery failures or server restarts).
 * Runs as a lightweight fire-and-forget so it does not block the list response.
 */
async function repairStaleReminders(reminders: Array<{ _id: unknown; status: unknown; nextTriggerAt: unknown; type: unknown }>) {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - 2 * 60 * 1000); // 2-minute grace

  const staleIds = reminders
    .filter(
      (r) =>
        r.status === "active" &&
        r.nextTriggerAt &&
        new Date(r.nextTriggerAt as string) < staleThreshold
    )
    .map((r) => String(r._id));

  for (const id of staleIds) {
    try {
      const next = await computeAndPersistNextTrigger(id);
      if (next) await enqueueOccurrenceJobs(id, next);
    } catch {
      // Non-fatal — poller will retry
    }
  }
}

export async function GET() {
  try {
    await connectDb();
    const reminders = await ReminderModel.find().sort({ createdAt: -1 }).lean();

    // Fire-and-forget repair so the list response is not delayed.
    repairStaleReminders(reminders as never[]).catch(() => {});

    return ok({ reminders });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const input = reminderCreateSchema.parse(await request.json());

    const reminder = await ReminderModel.create({
      ...input,
      categoryId: input.categoryId || null,
      startAt: new Date(input.startAt),
      endAt: input.endAt ? new Date(input.endAt) : null,
      excludedDates: (input.excludedDates ?? []).map((date) => new Date(date)),
      deliveries: input.deliveries
    });

    await computeAndPersistNextTrigger(String(reminder._id));
    await DeliveryJobModel.updateMany(
      { reminderId: reminder._id, status: "pending" },
      { $set: { status: "cancelled", lastError: "Reminder changed" } }
    );
    await enqueueOccurrenceJobs(String(reminder._id));

    return ok({ reminder }, 201);
  } catch (error) {
    return badRequest(error);
  }
}
