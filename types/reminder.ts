export type ReminderType = "one_time" | "recurring" | "deadline" | "habit";
export type ReminderStatus = "active" | "paused" | "completed" | "archived";
export type Urgency = "low" | "medium" | "high" | "critical";

export type ReminderOffsetUnit = "minutes" | "hours" | "days";

export interface ReminderOffset {
  value: number;
  unit: ReminderOffsetUnit;
}

export interface ReminderDeliveryConfig {
  publisherId: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  clickUrl?: string;
}

export interface ReminderInput {
  title: string;
  description?: string;
  type: ReminderType;
  status: ReminderStatus;
  categoryId?: string;
  urgency: Urgency;
  iconKey: string;
  timezone: string;
  allDay: boolean;
  startAt: string;
  endAt?: string;
  rrule?: string;
  excludedDates?: string[];
  reminderOffsets: ReminderOffset[];
  delivery: ReminderDeliveryConfig;
}

export interface ReminderUpdateInput extends Partial<ReminderInput> {}
