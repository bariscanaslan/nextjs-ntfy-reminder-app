import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { PublisherModel } from "@/lib/models";
import { encryptSecret } from "@/lib/utils/crypto";
import { publisherSchema } from "@/lib/validators/publisher";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    const input = publisherSchema.partial().parse(await request.json());

    if (input.isDefault) {
      await PublisherModel.updateMany({}, { $set: { isDefault: false } });
    }

    const updates: Record<string, unknown> = { ...input };
    if (input.authMode === "token" && input.token) {
      updates.encryptedToken = encryptSecret(input.token);
    }

    const publisher = await PublisherModel.findByIdAndUpdate(id, updates, { new: true });
    if (!publisher) {
      return ok({ error: "Not found" }, 404);
    }

    return ok({ publisher: { ...publisher.toObject(), encryptedToken: publisher.encryptedToken ? "***" : null } });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await params;
    await PublisherModel.findByIdAndDelete(id);
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}

