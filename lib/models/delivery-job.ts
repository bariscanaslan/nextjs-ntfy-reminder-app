import mongoose, { InferSchemaType, model, models } from "mongoose";

const deliveryJobSchema = new mongoose.Schema(
  {
    reminderId: { type: mongoose.Schema.Types.ObjectId, ref: "Reminder", required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "cancelled"],
      default: "pending"
    },
    scheduledFor: { type: Date, required: true },
    idempotencyKey: { type: String, required: true },
    triggerTaskId: { type: String, default: null },
    attemptCount: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    expireAt: { type: Date, default: null }
  },
  { timestamps: true }
);

deliveryJobSchema.index({ status: 1, scheduledFor: 1 });
deliveryJobSchema.index({ reminderId: 1, scheduledFor: 1 });
deliveryJobSchema.index({ idempotencyKey: 1 }, { unique: true });
deliveryJobSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export type DeliveryJobDocument = InferSchemaType<typeof deliveryJobSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const DeliveryJobModel = models.DeliveryJob || model("DeliveryJob", deliveryJobSchema);

