import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { CategoryModel } from "@/lib/models";
import { categorySchema } from "@/lib/validators/category";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const input = categorySchema.partial().parse(await request.json());
    const category = await CategoryModel.findByIdAndUpdate(id, input, { new: true });
    if (!category) {
      return ok({ error: "Not found" }, 404);
    }
    return ok({ category });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    await CategoryModel.findByIdAndDelete(id);
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}

