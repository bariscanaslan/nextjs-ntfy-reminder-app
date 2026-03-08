import { z } from "zod";

const reminderOffsetSchema = z.object({
  value: z.number().int().nonnegative(),
  unit: z.enum(["minutes", "hours", "days"])
});

const deliverySchema = z.object({
  publisherId: z.string().min(1),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string().min(1)).optional(),
  clickUrl: z.string().url().optional().or(z.literal(""))
});

export const reminderCreateSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(3000).optional(),
  type: z.enum(["one_time", "recurring", "deadline", "habit"]),
  status: z.enum(["active", "paused", "completed", "archived"]).default("active"),
  categoryId: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  iconKey: z.string().min(1),
  timezone: z.string().min(1),
  allDay: z.boolean().default(false),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  rrule: z.string().optional().nullable(),
  excludedDates: z.array(z.string().datetime()).optional(),
  reminderOffsets: z.array(reminderOffsetSchema).default([]),
  deliveries: z.array(deliverySchema).min(1)
});

export const reminderUpdateSchema = reminderCreateSchema.partial();

