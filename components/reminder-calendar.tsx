"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventApi } from "@fullcalendar/core";
import {
  X,
  ExternalLink,
  Clock,
  CalendarDays,
  AlertCircle,
  Bell,
  HeartPulse,
  Dumbbell,
  Briefcase,
  Pill,
  ClipboardCheck,
  CalendarHeart,
  Tag,
  Repeat,
  Timer,
  CheckSquare
} from "lucide-react";
import Link from "next/link";

// ─── Urgency colours ────────────────────────────────────────────────────────

const urgencyColor: Record<string, { bg: string; border: string; text: string; dot: string; badge: string }> = {
  low:      { bg: "#f0fdf4", border: "#16a34a", text: "#15803d", dot: "#16a34a", badge: "bg-green-100 text-green-700" },
  medium:   { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", dot: "#3b82f6", badge: "bg-blue-100 text-blue-700" },
  high:     { bg: "#fff7ed", border: "#f97316", text: "#c2410c", dot: "#f97316", badge: "bg-orange-100 text-orange-700" },
  critical: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", dot: "#ef4444", badge: "bg-red-100 text-red-700" },
};

const statusBadge: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  paused:   "bg-amber-100 text-amber-700",
  archived: "bg-muted text-muted-foreground",
  completed:"bg-blue-100 text-blue-700",
};

const typeLabel: Record<string, string> = {
  one_time:  "One-time",
  recurring: "Recurring",
  deadline:  "Deadline",
  habit:     "Habit",
};

const typeIcon: Record<string, React.ReactNode> = {
  one_time:  <CalendarDays className="h-3.5 w-3.5" />,
  recurring: <Repeat className="h-3.5 w-3.5" />,
  deadline:  <Timer className="h-3.5 w-3.5" />,
  habit:     <CheckSquare className="h-3.5 w-3.5" />,
};

// ─── Icon map ────────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bell, HeartPulse, Dumbbell, Briefcase, Pill, ClipboardCheck, CalendarHeart, AlertCircle,
};

function ReminderIcon({ iconKey, className }: { iconKey?: string; className?: string }) {
  const Icon = iconMap[iconKey ?? "Bell"] ?? Bell;
  return <Icon className={className} />;
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function fmt(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── Event popup ─────────────────────────────────────────────────────────────

function EventPopup({ event, onClose }: { event: EventApi; onClose: () => void }) {
  const props = event.extendedProps as {
    urgency?: string;
    status?: string;
    type?: string;
    iconKey?: string;
    category?: { name?: string } | null;
    description?: string;
  };

  const urgency = props.urgency ?? "medium";
  const c = urgencyColor[urgency] ?? urgencyColor.medium;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Coloured top strip */}
        <div className="h-1.5 w-full" style={{ backgroundColor: c.border }} />

        <div className="p-5">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon + Title */}
          <div className="mb-4 flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: c.bg, color: c.border }}
            >
              <ReminderIcon iconKey={props.iconKey} className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold leading-tight">{event.title}</h3>
              {props.category?.name && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {props.category.name}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${c.badge}`}>
              {urgency}
            </span>
            {props.status && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge[props.status] ?? ""}`}>
                {props.status}
              </span>
            )}
            {props.type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {typeIcon[props.type]}
                {typeLabel[props.type] ?? props.type}
              </span>
            )}
          </div>

          {/* Dates */}
          <div className="mb-4 space-y-2 rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Start:</span>
              <span>{fmt(event.start)}</span>
            </div>
            {event.end && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">End:</span>
                <span>{fmt(event.end)}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {props.description && (
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{props.description}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              Close
            </button>
            <Link
              href={`/reminders/${event.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              onClick={onClose}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Edit reminder
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export function ReminderCalendar({ events }: { events: Array<Record<string, unknown>> }) {
  const [popupEvent, setPopupEvent] = useState<EventApi | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Enrich events with urgency-based colours for FullCalendar
  const coloredEvents = events.map((e) => {
    const urgency = (e.extendedProps as Record<string, unknown>)?.urgency as string ?? "medium";
    const c = urgencyColor[urgency] ?? urgencyColor.medium;
    return {
      ...e,
      backgroundColor: c.bg,
      borderColor: c.border,
      textColor: c.text,
    };
  });

  return (
    <>
      <div className="fc-modern">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
          }
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
          }}
          events={coloredEvents as never[]}
          eventClick={(arg) => setPopupEvent(arg.event)}
          eventContent={(arg) => {
            const urgency = arg.event.extendedProps?.urgency as string ?? "medium";
            const c = urgencyColor[urgency] ?? urgencyColor.medium;
            return (
              <div
                className="flex w-full cursor-pointer items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5"
                style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}` }}
                title={arg.event.title}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.dot }}
                />
                <span
                  className="truncate text-xs font-medium"
                  style={{ color: c.text }}
                >
                  {arg.event.title}
                </span>
              </div>
            );
          }}
          eventMouseEnter={(arg) => {
            arg.el.style.transform = "scale(1.02)";
            arg.el.style.transition = "transform 0.1s ease";
            arg.el.style.zIndex = "10";
          }}
          eventMouseLeave={(arg) => {
            arg.el.style.transform = "";
            arg.el.style.zIndex = "";
          }}
          height="auto"
          dayMaxEvents={isMobile ? 2 : 4}
          aspectRatio={isMobile ? 1.2 : 1.8}
        />
      </div>

      {popupEvent && (
        <EventPopup event={popupEvent} onClose={() => setPopupEvent(null)} />
      )}
    </>
  );
}
