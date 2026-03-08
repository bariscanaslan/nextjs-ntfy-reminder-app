import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import { connectDb } from "@/lib/db/mongoose";
import { processDueJobs } from "@/lib/services/reconcile";
import { processJobById } from "@/lib/services/job-processor";

export const processReminderJob = task({
  id: "process-reminder-job",
  maxDuration: 300,
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 300_000
  },
  run: async (payload: { jobId: string }) => {
    await connectDb();
    await processJobById(payload.jobId);
    logger.info("Processed job", { jobId: payload.jobId });
  }
});

export const reconcileDueJobs = schedules.task({
  id: "reconcile-due-jobs",
  cron: "*/1 * * * *",
  run: async () => {
    await connectDb();
    const processed = await processDueJobs(50);
    logger.info("Reconciled due jobs", { processed });
  }
});
