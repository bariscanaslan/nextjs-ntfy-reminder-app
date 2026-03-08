import { connectDb } from "@/lib/db/mongoose";
import { DeliveryJobModel } from "@/lib/models";
import { processJobById } from "@/lib/services/job-processor";

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

