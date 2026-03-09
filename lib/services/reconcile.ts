import { connectDb } from "@/lib/db/mongoose";
import { DeliveryJobModel, ReminderModel } from "@/lib/models";
import { processJobById } from "@/lib/services/job-processor";
import { computeAndPersistNextTrigger, enqueueOccurrenceJobs } from "@/lib/services/scheduler";

export async function processDueJobs(limit = 20) {
  await connectDb();
  const now = new Date();

  const jobs = await DeliveryJobModel.find({
    status: "pending",
    scheduledFor: { $lte: now }
  })
    .sort({ scheduledFor: 1 })
    .limit(limit);

  for (const job of jobs) {
    await processJobById(String(job._id));
  }

  return jobs.length;
}

/**
 * Find active reminders whose nextTriggerAt is in the past (stale) and
 * recompute + re-enqueue them.  This repairs state left by delivery failures,
 * server restarts, or any other scenario where scheduleNextAfterDelivery was
 * not called after a trigger.
 */
export async function reconcileStaleNextTriggers(limit = 10) {
  await connectDb();
  const now = new Date();

  // Only look at reminders whose nextTriggerAt is at least 2 minutes in the
  // past to avoid racing with jobs that are still being processed right now.
  const staleThreshold = new Date(now.getTime() - 2 * 60 * 1000);

  const stale = await ReminderModel.find({
    status: "active",
    nextTriggerAt: { $lt: staleThreshold },
  }).limit(limit);

  for (const reminder of stale) {
    try {
      const next = await computeAndPersistNextTrigger(String(reminder._id));
      if (next) {
        await enqueueOccurrenceJobs(String(reminder._id), next);
      }
    } catch {
      // Silent — will retry on the next poller cycle
    }
  }

  return stale.length;
}
