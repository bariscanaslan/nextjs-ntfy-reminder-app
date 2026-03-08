import mongoose, { InferSchemaType, model, models } from "mongoose";

const offsetSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ["minutes", "hours", "days"], required: true }
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    publisherId: { type: mongoose.Schema.Types.ObjectId, ref: "Publisher", required: true },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    tags: { type: [String], default: [] },
    clickUrl: { type: String, default: "" }
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["one_time", "recurring", "deadline", "habit"], required: true },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active"
    },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    iconKey: { type: String, default: "Bell" },
    timezone: { type: String, default: "UTC" },
    allDay: { type: Boolean, default: false },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    rrule: { type: String, default: null },
    excludedDates: { type: [Date], default: [] },
    reminderOffsets: { type: [offsetSchema], default: [] },
    delivery: { type: deliverySchema, default: null },
    deliveries: { type: [deliverySchema], default: [] },
    lastTriggeredAt: { type: Date, default: null },
    nextTriggerAt: { type: Date, default: null },
    seriesVersion: { type: Number, default: 1 }
  },
  { timestamps: true }
);

reminderSchema.index({ status: 1, nextTriggerAt: 1 });
reminderSchema.index({ categoryId: 1, status: 1 });

export type ReminderDocument = InferSchemaType<typeof reminderSchema> & { _id: mongoose.Types.ObjectId };
export const ReminderModel = models.Reminder || model("Reminder", reminderSchema);

