import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { PublisherModel } from "@/lib/models";
import { encryptSecret } from "@/lib/utils/crypto";
import { publisherSchema } from "@/lib/validators/publisher";
import { badRequest, ok, serverError } from "@/lib/utils/http";

export async function GET() {
  try {
    await connectDb();
    const publishers = await PublisherModel.find().sort({ createdAt: -1 }).lean();
    const sanitized = publishers.map((publisher) => ({
      ...publisher,
      encryptedToken: publisher.encryptedToken ? "***" : null
    }));
    return ok({ publishers: sanitized });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const input = publisherSchema.parse(await request.json());

    if (input.isDefault) {
      await PublisherModel.updateMany({}, { $set: { isDefault: false } });
    }

    const publisher = await PublisherModel.create({
      ...input,
      encryptedToken: input.authMode === "token" && input.token ? encryptSecret(input.token) : null,
      tokenSecretRef: input.tokenSecretRef || null
    });

    return ok({ publisher: { ...publisher.toObject(), encryptedToken: publisher.encryptedToken ? "***" : null } }, 201);
  } catch (error) {
    return badRequest(error);
  }
}

