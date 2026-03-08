import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { DeliveryJobModel, ReminderModel } from "@/lib/models";
import { enqueueOccurrenceJobs, computeAndPersistNextTrigger } from "@/lib/services/scheduler";
import { reminderUpdateSchema } from "@/lib/validators/reminder";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const reminder = await ReminderModel.findById(id).lean();
    if (!reminder) {
      return ok({ error: "Not found" }, 404);
    }
    return ok({ reminder });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const input = reminderUpdateSchema.parse(await request.json());

    const updates: Record<string, unknown> = { ...input };
    if (input.startAt) updates.startAt = new Date(input.startAt);
    if (input.endAt !== undefined) updates.endAt = input.endAt ? new Date(input.endAt) : null;
    if (input.excludedDates) updates.excludedDates = input.excludedDates.map((d) => new Date(d));
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId || null;
    if (input.deliveries) updates.deliveries = input.deliveries;

    const reminder = await ReminderModel.findByIdAndUpdate(id, updates, { new: true });
    if (!reminder) {
      return ok({ error: "Not found" }, 404);
    }

    await DeliveryJobModel.updateMany(
      { reminderId: reminder._id, status: "pending" },
      { $set: { status: "cancelled", lastError: "Reminder changed" } }
    );

    await computeAndPersistNextTrigger(String(reminder._id));
    if (reminder.status === "active") {
      await enqueueOccurrenceJobs(String(reminder._id));
    }

    return ok({ reminder });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const reminder = await ReminderModel.findByIdAndDelete(id);

    if (!reminder) {
      return ok({ error: "Not found" }, 404);
    }

    await DeliveryJobModel.deleteMany({ reminderId: reminder._id });

    return ok({ deleted: true });
  } catch (error) {
    return serverError(error);
  }
}

