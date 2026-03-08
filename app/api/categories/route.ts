import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { CategoryModel } from "@/lib/models";
import { categorySchema } from "@/lib/validators/category";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function GET() {
  try {
    await connectDb();
    const categories = await CategoryModel.find().sort({ name: 1 }).lean();
    return ok({ categories });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const input = categorySchema.parse(await request.json());
    const category = await CategoryModel.create(input);
    return ok({ category }, 201);
  } catch (error) {
    return badRequest(error);
  }
}

