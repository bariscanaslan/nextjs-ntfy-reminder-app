import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../lib/db/mongoose";
import { CategoryModel, PublisherModel, ReminderModel, DeliveryJobModel } from "../lib/models";
import { enqueueOccurrenceJobs, computeAndPersistNextTrigger } from "../lib/services/scheduler";

async function run() {
  await connectDb();

  await Promise.all([
    CategoryModel.deleteMany({}),
    PublisherModel.deleteMany({}),
    ReminderModel.deleteMany({}),
    DeliveryJobModel.deleteMany({})
  ]);

  const categories = await CategoryModel.insertMany([
    { name: "Health", color: "#16a34a", defaultIconKey: "HeartPulse", description: "Health reminders" },
    { name: "Fitness", color: "#0ea5e9", defaultIconKey: "Dumbbell", description: "Workout schedule" },
    { name: "Finance", color: "#f59e0b", defaultIconKey: "Briefcase", description: "Bills and payments" },
    { name: "Work", color: "#64748b", defaultIconKey: "ClipboardCheck", description: "Project and deadline" }
  ]);

  const publisher = await PublisherModel.create({
    name: "Default ntfy",
    serverUrl: process.env.NTFY_DEFAULT_SERVER_URL || "https://ntfy.sh",
    topic: "my-reminder-topic",
    authMode: "none",
    isDefault: true
  });

  const now = new Date();

  const reminders = await ReminderModel.insertMany([
    {
      title: "Doctor appointment",
      description: "Annual checkup at 10:00",
      type: "one_time",
      status: "active",
      categoryId: categories[0]._id,
      urgency: "high",
      iconKey: "HeartPulse",
      timezone: "Europe/Istanbul",
      allDay: false,
      startAt: new Date(now.getTime() + 1000 * 60 * 60 * 24),
      reminderOffsets: [{ value: 60, unit: "minutes" }],
      delivery: { publisherId: publisher._id, priority: 4, tags: ["health"] }
    },
    {
      title: "Weekly workout",
      description: "Strength training",
      type: "recurring",
      status: "active",
      categoryId: categories[1]._id,
      urgency: "medium",
      iconKey: "Dumbbell",
      timezone: "Europe/Istanbul",
      allDay: false,
      startAt: new Date(now.getTime() + 1000 * 60 * 60 * 2),
      rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      reminderOffsets: [{ value: 30, unit: "minutes" }],
      delivery: { publisherId: publisher._id, priority: 3, tags: ["fitness"] }
    },
    {
      title: "Monthly bill payment",
      description: "Pay electricity bill",
      type: "recurring",
      status: "active",
      categoryId: categories[2]._id,
      urgency: "critical",
      iconKey: "Briefcase",
      timezone: "Europe/Istanbul",
      allDay: true,
      startAt: new Date(now.getTime() + 1000 * 60 * 60 * 12),
      rrule: "FREQ=MONTHLY;BYMONTHDAY=5",
      reminderOffsets: [{ value: 1, unit: "days" }],
      delivery: { publisherId: publisher._id, priority: 5, tags: ["finance", "bill"] }
    },
    {
      title: "Project deadline reminder",
      description: "Finalize sprint planning deck",
      type: "deadline",
      status: "active",
      categoryId: categories[3]._id,
      urgency: "critical",
      iconKey: "ClipboardCheck",
      timezone: "Europe/Istanbul",
      allDay: false,
      startAt: new Date(now.getTime() + 1000 * 60 * 60 * 48),
      reminderOffsets: [{ value: 1, unit: "days" }, { value: 2, unit: "hours" }],
      delivery: { publisherId: publisher._id, priority: 5, tags: ["work", "deadline"] }
    },
    {
      title: "Habit reminder: drink water",
      description: "Hydration check",
      type: "habit",
      status: "active",
      categoryId: categories[0]._id,
      urgency: "low",
      iconKey: "Bell",
      timezone: "Europe/Istanbul",
      allDay: false,
      startAt: new Date(now.getTime() + 1000 * 60 * 30),
      rrule: "FREQ=DAILY",
      reminderOffsets: [{ value: 10, unit: "minutes" }],
      delivery: { publisherId: publisher._id, priority: 2, tags: ["habit"] }
    }
  ]);

  for (const reminder of reminders) {
    await computeAndPersistNextTrigger(String(reminder._id));
    await enqueueOccurrenceJobs(String(reminder._id));
  }

  console.log(`Seeded ${categories.length} categories and ${reminders.length} reminders.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
