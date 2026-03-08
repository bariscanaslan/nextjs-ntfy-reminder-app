import mongoose, { InferSchemaType, model, models } from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    defaultIconKey: { type: String, required: true, trim: true },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 }, { unique: true });

export type CategoryDocument = InferSchemaType<typeof categorySchema> & { _id: mongoose.Types.ObjectId };
export const CategoryModel = models.Category || model("Category", categorySchema);

