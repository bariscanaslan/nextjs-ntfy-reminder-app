import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { ReminderModel, DeliveryJobModel } from "@/lib/models";
import { enqueueOccurrenceJobs, computeAndPersistNextTrigger } from "@/lib/services/scheduler";
import { reminderCreateSchema } from "@/lib/validators/reminder";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function GET() {
  try {
    await connectDb();
    const reminders = await ReminderModel.find().sort({ createdAt: -1 }).lean();
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

