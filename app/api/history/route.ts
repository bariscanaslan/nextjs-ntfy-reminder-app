import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { DeliveryJobModel } from "@/lib/models";
import { ok, serverError } from "@/lib/utils/http";

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      DeliveryJobModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reminderId")
        .lean(),
      DeliveryJobModel.countDocuments(),
    ]);

    return ok({ jobs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return serverError(error);
  }
}
