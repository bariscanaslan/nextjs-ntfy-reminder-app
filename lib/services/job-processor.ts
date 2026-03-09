import { createHash } from "crypto";
import { DeliveryJobModel, ReminderModel } from "@/lib/models";
import { publishToNtfy } from "@/lib/services/ntfy";
import { scheduleNextAfterDelivery } from "@/lib/services/scheduler";

// ─── Notification formatting ────────────────────────────────────────────────

const urgencyEmoji: Record<string, string> = {
  low: "✅",
  medium: "🔔",
  high: "⚠️",
  critical: "🚨"
};

/** ntfy emoji shortcode tags — these render as emojis in the ntfy client */
const urgencyNtfyTag: Record<string, string> = {
  low: "white_check_mark",
  medium: "bell",
  high: "warning",
  critical: "rotating_light"
};

const iconNtfyTag: Record<string, string> = {
  Bell: "bell",
  HeartPulse: "heart",
  Dumbbell: "muscle",
  Briefcase: "briefcase",
  Pill: "pill",
  ClipboardCheck: "ballot_box_with_check",
  CalendarHeart: "calendar",
  AlertCircle: "warning"
};

const urgencyLabel: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical"
};

function formatTriggerTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

interface ReminderLike {
  title: string;
  description?: string;
  urgency: string;
  iconKey: string;
  type: string;
}

function buildNotificationMessage(
  reminder: ReminderLike,
  triggerAt: Date,
  offsetMinutes: number
): { title: string; message: string; tags: string[] } {
  // X-Title MUST be ASCII-only — Node.js fetch (Undici) rejects non-ASCII header values.
  // We keep the emoji exclusively in the body where UTF-8 is fine.
  const title = reminder.title;

  const emoji = urgencyEmoji[reminder.urgency] ?? "🔔";

  // Body lines — emoji here is fine (plain-text body is sent as UTF-8)
  const lines: string[] = [];

  // First line: emoji badge + title for visual impact
  lines.push(`${reminder.title}`);
  lines.push("");

  if (reminder.description?.trim()) {
    lines.push(reminder.description.trim());
    lines.push("");
  }

  // When the actual event occurs
  lines.push(`📅 Event: ${formatTriggerTime(triggerAt)}`);

  // If this is an advance notification, show how far ahead
  if (offsetMinutes > 0) {
    const parts: string[] = [];
    const days = Math.floor(offsetMinutes / 1440);
    const hours = Math.floor((offsetMinutes % 1440) / 60);
    const mins = offsetMinutes % 60;
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (mins) parts.push(`${mins}m`);
    lines.push(`⏱ Advance notice: ${parts.join(" ")} before`);
  }

  if (reminder.urgency !== "medium") {
    lines.push(`⚡ Priority: ${urgencyLabel[reminder.urgency] ?? reminder.urgency}`);
  }

  const message = lines.join("\n");

  // Tags: urgency emoji tag + icon tag (rendered as emojis in ntfy client)
  const tags = [
    urgencyNtfyTag[reminder.urgency] ?? "bell",
    iconNtfyTag[reminder.iconKey] ?? "bell"
  ];

  return { title, message, tags };
}

// ─── Retry backoff ──────────────────────────────────────────────────────────

function backoffMs(attempt: number) {
  const base = 10_000;
  return base * 2 ** Math.max(0, attempt - 1);
}

// ─── Main processor ─────────────────────────────────────────────────────────

export async function processJobById(jobId: string) {
  const job = await DeliveryJobModel.findById(jobId);
  if (!job || job.status === "sent" || job.status === "cancelled") return;
  if (job.status === "processing") return;

  job.status = "processing";
  job.attemptCount += 1;
  await job.save();

  const reminder = await ReminderModel.findById(job.reminderId);
  if (!reminder || reminder.status !== "active") {
    job.status = "cancelled";
    job.lastError = "Reminder is missing or inactive";
    await job.save();
    return;
  }

  // Idempotency check
  const payloadTriggerAt = new Date(job.payload?.triggerAt ?? job.scheduledFor);
  const offsetMinutes: number = job.payload?.offsetMinutes ?? 0;

  const dedupeHash = createHash("sha256")
    .update(`${reminder._id}:${payloadTriggerAt.toISOString()}:${offsetMinutes}`)
    .digest("hex");

  if (job.idempotencyKey !== dedupeHash) {
    job.status = "cancelled";
    job.lastError = "Idempotency mismatch";
    await job.save();
    return;
  }

  // Support both legacy `delivery` and new `deliveries` array
  const deliveries = (reminder.deliveries?.length
    ? reminder.deliveries
    : reminder.delivery
    ? [reminder.delivery]
    : []) as Array<{
    publisherId: unknown;
    priority?: number;
    tags?: string[];
    clickUrl?: string;
  }>;

  const { title, message, tags: autoTags } = buildNotificationMessage(
    reminder,
    payloadTriggerAt,
    offsetMinutes
  );

  if (!deliveries.length) {
    job.status = "failed";
    job.lastError = "No delivery targets configured on this reminder";
    await job.save();
    return;
  }

  try {
    for (const delivery of deliveries) {
      const priority = delivery.priority ?? 3;
      // Use user-supplied tags if set, otherwise auto-generated emoji tags
      const tags = delivery.tags?.length ? delivery.tags : autoTags;
      const click = delivery.clickUrl || undefined;

      await publishToNtfy(String(delivery.publisherId), {
        title,
        message,
        priority,
        tags,
        click
      });
    }

    job.status = "sent";
    job.sentAt = new Date();
    job.lastError = null;
    await job.save();

    if (offsetMinutes === 0) {
      await scheduleNextAfterDelivery(String(reminder._id), payloadTriggerAt);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (job.attemptCount >= 5) {
      job.status = "failed";
      job.lastError = errorMessage;
      await job.save();

      // Even on permanent delivery failure, advance recurring reminders to the
      // next occurrence so nextTriggerAt never stays stuck in the past.
      if (offsetMinutes === 0) {
        await scheduleNextAfterDelivery(String(reminder._id), payloadTriggerAt);
      }

      return;
    }

    job.status = "pending";
    job.lastError = errorMessage;
    job.scheduledFor = new Date(Date.now() + backoffMs(job.attemptCount));
    await job.save();
  }
}
