import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { PublisherModel } from "@/lib/models";
import { publishToNtfy } from "@/lib/services/ntfy";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();

    const publisherId = String(body.publisherId || "");
    const title = String(body.title || "Test notification").slice(0, 120);
    const message = String(body.message || "Reminder app test message").slice(0, 2000);

    if (!publisherId) {
      return ok({ error: "publisherId is required" }, 400);
    }

    const publisher = await PublisherModel.findById(publisherId);
    if (!publisher) {
      return ok({ error: "Publisher not found" }, 404);
    }

    await publishToNtfy(publisherId, {
      title,
      message,
      priority: 3,
      tags: ["white_check_mark", "reminder_ribbon"]
    });

    return ok({ success: true });
  } catch (error) {
    return badRequest(error);
  }
}

