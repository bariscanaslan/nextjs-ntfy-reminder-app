import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/mongoose";
import { ReminderModel } from "@/lib/models";

// ─── iCal helpers ────────────────────────────────────────────────────────────

/** Format a Date as iCal UTC timestamp: YYYYMMDDTHHMMSSZ */
function icalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Format a Date as iCal all-day date: YYYYMMDD */
function icalDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Escape special characters in iCal text values */
function icalEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Fold long iCal content lines at 75 octets (RFC 5545 §3.1).
 * Continuation lines start with a single space.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    const candidate = current + char;
    if (encoder.encode(candidate).length > 75) {
      chunks.push(current);
      current = " " + char; // continuation line prefix
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.join("\r\n");
}

/** Build a VEVENT block for a reminder */
function buildVEvent(reminder: {
  _id: { toString(): string };
  title: string;
  description?: string;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  urgency?: string;
  type?: string;
  rrule?: string | null;
  status?: string;
}): string {
  const uid = `reminder-${reminder._id.toString()}@reminders`;
  const now = icalDate(new Date());

  const lines: string[] = [
    "BEGIN:VEVENT",
    foldLine(`UID:${uid}`),
    `DTSTAMP:${now}`,
  ];

  // Start date
  if (reminder.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${icalDateOnly(reminder.startAt)}`);
  } else {
    lines.push(`DTSTART:${icalDate(reminder.startAt)}`);
  }

  // End date
  if (reminder.endAt) {
    if (reminder.allDay) {
      lines.push(`DTEND;VALUE=DATE:${icalDateOnly(reminder.endAt)}`);
    } else {
      lines.push(`DTEND:${icalDate(reminder.endAt)}`);
    }
  }

  // Recurrence rule
  if (reminder.rrule) {
    lines.push(foldLine(`RRULE:${reminder.rrule}`));
  }

  // Summary (title)
  lines.push(foldLine(`SUMMARY:${icalEscape(reminder.title)}`));

  // Description
  const descParts: string[] = [];
  if (reminder.description?.trim()) descParts.push(reminder.description.trim());
  if (reminder.urgency) descParts.push(`Urgency: ${reminder.urgency}`);
  if (reminder.type) descParts.push(`Type: ${reminder.type.replace("_", " ")}`);

  if (descParts.length) {
    lines.push(foldLine(`DESCRIPTION:${icalEscape(descParts.join("\\n"))}`));
  }

  // Status
  const statusMap: Record<string, string> = {
    active: "CONFIRMED",
    paused: "TENTATIVE",
    completed: "COMPLETED",
    archived: "CANCELLED",
  };
  lines.push(`STATUS:${statusMap[reminder.status ?? "active"] ?? "CONFIRMED"}`);

  // Priority from urgency (iCal 1=highest … 9=lowest)
  const priorityMap: Record<string, string> = {
    critical: "1",
    high: "3",
    medium: "5",
    low: "9",
  };
  if (reminder.urgency) {
    lines.push(`PRIORITY:${priorityMap[reminder.urgency] ?? "5"}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Validate the iCal secret token
  const secret = process.env.ICAL_SECRET;
  if (secret) {
    const token = req.nextUrl.searchParams.get("token");
    if (!token || token !== secret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    await connectDb();

    const reminders = await ReminderModel.find({
      status: { $in: ["active", "paused", "completed"] },
    })
      .select("title description startAt endAt allDay urgency type rrule status _id")
      .lean();

    const vevents = reminders.map((r) =>
      buildVEvent({
        _id: r._id as { toString(): string },
        title: r.title,
        description: r.description ?? "",
        startAt: r.startAt as Date,
        endAt: (r.endAt as Date | null) ?? null,
        allDay: r.allDay,
        urgency: r.urgency,
        type: r.type,
        rrule: r.rrule ?? null,
        status: r.status,
      })
    );

    const cal = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Reminder App//Reminders//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:My Reminders",
      "X-WR-CALDESC:Reminders exported from Reminder App",
      "X-WR-TIMEZONE:UTC",
      ...vevents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(cal, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reminders.ics"',
        // Allow calendar apps to refresh the subscription
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse("Failed to generate calendar feed", { status: 500 });
  }
}
