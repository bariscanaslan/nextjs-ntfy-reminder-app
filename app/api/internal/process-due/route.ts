import { NextRequest } from "next/server";
import { processDueJobs } from "@/lib/services/reconcile";
import { ok, serverError } from "@/lib/utils/http";

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_JOB_SECRET) {
      return ok({ error: "Unauthorized" }, 401);
    }

    const count = await processDueJobs(100);
    return ok({ processed: count });
  } catch (error) {
    return serverError(error);
  }
}


