import { createHash } from "crypto";
import { DeliveryJobModel, ReminderModel } from "@/lib/models";
import { processJobById } from "@/lib/services/job-processor";
import { getNextOccurrence, getOffsetMinutes } from "@/lib/services/recurrence";

function makeJobKey(reminderId: string, triggerAt: Date, offsetMinutes: number) {
  const raw = `${reminderId}:${triggerAt.toISOString()}:${offsetMinutes}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Try to use Trigger.dev for delayed job scheduling.
 * Returns true if Trigger.dev accepted the task, false otherwise.
 */
async function tryTriggerDev(jobId: string, delayMs: number): Promise<boolean> {
  try {
    const { tasks } = await import("@trigger.dev/sdk/v3");
    const handle = await tasks.trigger(
      "process-reminder-job",
      { jobId },
      { delay: `${delayMs}ms` }
    );
    return !!handle?.id;
  } catch {
    return false;
  }
}

/**
 * Schedule a job to be processed via an in-process setTimeout.
 * This is the fallback when Trigger.dev is unavailable.
 */
function scheduleViaTimeout(jobId: string, delayMs: number) {
  setTimeout(async () => {
    try {
      await processJobById(jobId);
    } catch {
      // The in-process poller (every 30 s) will retry any jobs still pending
    }
  }, delayMs);
}

export async function computeAndPersistNextTrigger(reminderId: string) {
  const reminder = await ReminderModel.findById(reminderId);
  if (!reminder) return null;

  // When a reminder has never been triggered, search from 1ms before startAt
  // so the very first occurrence (at startAt) is not skipped even if "now"
  // has just passed it by a few seconds.
  const from = reminder.lastTriggeredAt
    ? new Date()
    : new Date(new Date(reminder.startAt as Date).getTime() - 1);

  const next = reminder.status === "active" ? getNextOccurrence(reminder, from) : null;
  reminder.nextTriggerAt = next;
  await reminder.save();
  return next;
}

export async function enqueueOccurrenceJobs(reminderId: string, occurrenceAt?: Date | null) {
  const reminder = await ReminderModel.findById(reminderId);
  if (!reminder || reminder.status !== "active") return;

  const next = occurrenceAt ?? getNextOccurrence(reminder);
  if (!next) {
    reminder.nextTriggerAt = null;
    await reminder.save();
    return;
  }

  // If the occurrence itself is already in the past, skip it entirely and
  // advance to the next future occurrence so we never fire stale notifications.
  if (next.getTime() <= Date.now()) {
    const futureNext = getNextOccurrence(reminder, new Date());
    reminder.nextTriggerAt = futureNext;
    await reminder.save();
    if (futureNext) {
      await enqueueOccurrenceJobs(String(reminder._id), futureNext);
    }
    return;
  }

  const offsets = [{ value: 0, unit: "minutes" as const }, ...(reminder.reminderOffsets ?? [])];

  for (const offset of offsets) {
    const offsetMinutes = getOffsetMinutes(offset.value, offset.unit);
    const scheduledFor = new Date(next.getTime() - offsetMinutes * 60 * 1000);
    const idempotencyKey = makeJobKey(String(reminder._id), next, offsetMinutes);
    const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());

    let job;
    try {
      job = await DeliveryJobModel.create({
        reminderId: reminder._id,
        status: "pending",
        scheduledFor,
        idempotencyKey,
        payload: {
          triggerAt: next.toISOString(),
          offsetMinutes
        },
        expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
      });
    } catch {
      // Duplicate idempotency key — this occurrence was already scheduled, skip
      continue;
    }

    const jobId = String(job._id);
    const usedTriggerDev = await tryTriggerDev(jobId, delayMs);

    if (usedTriggerDev) {
      // Trigger.dev will call processJobById at the right time — nothing more to do
    } else {
      // Fallback: schedule via in-process setTimeout
      scheduleViaTimeout(jobId, delayMs);
    }
  }

  reminder.nextTriggerAt = next;
  await reminder.save();
}

export async function scheduleNextAfterDelivery(reminderId: string, triggerAt: Date) {
  const reminder = await ReminderModel.findById(reminderId);
  if (!reminder || reminder.status !== "active") return;

  reminder.lastTriggeredAt = triggerAt;
  // Always search from now so missed/past occurrences are skipped rather than
  // firing immediately and cascading through all missed months.
  const next = getNextOccurrence(reminder, new Date());
  reminder.nextTriggerAt = next;
  await reminder.save();

  if (next) {
    await enqueueOccurrenceJobs(String(reminder._id), next);
  }
}
