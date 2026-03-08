import mongoose, { InferSchemaType, model, models } from "mongoose";

const publisherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    serverUrl: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    authMode: { type: String, enum: ["none", "token"], default: "none" },
    encryptedToken: { type: String, default: null },
    tokenSecretRef: { type: String, default: null },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

publisherSchema.index({ isDefault: 1 });
publisherSchema.index({ name: 1 }, { unique: true });

export type PublisherDocument = InferSchemaType<typeof publisherSchema> & { _id: mongoose.Types.ObjectId };
export const PublisherModel = models.Publisher || model("Publisher", publisherSchema);

