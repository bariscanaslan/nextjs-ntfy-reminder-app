"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  LayoutGrid,
  TrendingUp,
  AlertTriangle,
  Bell,
  HeartPulse,
  Dumbbell,
  Briefcase,
  Pill,
  ClipboardCheck,
  CalendarHeart,
  AlertCircle,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { ReminderCalendar } from "@/components/reminder-calendar";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps?: {
    urgency?: string;
    status?: string;
    type?: string;
    iconKey?: string;
    category?: { name?: string } | null;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const urgencyDot: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const urgencyLabel: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const urgencyBadge: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bell, HeartPulse, Dumbbell, Briefcase, Pill, ClipboardCheck, CalendarHeart, AlertCircle,
};

function EventIcon({ iconKey, className }: { iconKey?: string; className?: string }) {
  const Icon = iconMap[iconKey ?? "Bell"] ?? Bell;
  return <Icon className={className} />;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) {
    return `Today · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Upcoming sidebar ────────────────────────────────────────────────────────

function UpcomingList({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() + 14);

  const upcoming = events
    .filter((e) => {
      const d = new Date(e.start);
      return d >= now && d <= cutoff && e.extendedProps?.status !== "archived";
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 12);

  if (!upcoming.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Nothing upcoming</p>
        <p className="mt-1 text-xs text-muted-foreground">No events in the next 2 weeks.</p>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const e of upcoming) {
    const key = new Date(e.start).toDateString();
    (grouped[key] ??= []).push(e);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-4">
      {Object.entries(grouped).map(([dateStr, dayEvents]) => {
        const d = new Date(dateStr);
        const isToday = d.toDateString() === now.toDateString();
        const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
        const label = isToday
          ? "Today"
          : isTomorrow
          ? "Tomorrow"
          : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

        return (
          <div key={dateStr}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
              {isToday && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  TODAY
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {dayEvents.map((e) => {
                const urgency = e.extendedProps?.urgency ?? "medium";
                return (
                  <Link
                    key={e.id}
                    href={`/reminders/${e.id}`}
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${urgencyDot[urgency] ?? "bg-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-tight group-hover:text-primary">
                        {e.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(e.start).toLocaleTimeString(undefined, {
                          hour: "numeric", minute: "2-digit", hour12: true,
                        })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${urgencyBadge[urgency] ?? ""}`}>
                      {urgencyLabel[urgency] ?? urgency}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Subscribe button ────────────────────────────────────────────────────────

function SubscribeButton() {
  const [copied, setCopied] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [icalToken, setIcalToken] = useState<string | null>(null);

  // Fetch the iCal secret token from the protected endpoint
  useEffect(() => {
    fetch("/api/calendar/ical-token")
      .then((r) => r.json())
      .then((data) => setIcalToken(data.token ?? null))
      .catch(() => {});
  }, []);

  const feedPath =
    icalToken
      ? `/api/calendar/ical?token=${encodeURIComponent(icalToken)}`
      : "/api/calendar/ical";

  const webcalUrl =
    typeof window !== "undefined"
      ? `webcal://${window.location.host}${feedPath}`
      : "";

  const httpsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${feedPath}`
      : feedPath;

  function copyUrl() {
    navigator.clipboard.writeText(webcalUrl || httpsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openWebcal() {
    window.location.href = webcalUrl;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition hover:border-primary/40 hover:text-primary"
      >
        <Link2 className="h-4 w-4" />
        Subscribe
      </button>

      {showPanel && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />

          <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-border bg-card p-4 shadow-xl">
            <h4 className="mb-1 text-sm font-semibold">Calendar Subscription</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              Add your reminders to Apple Calendar, Google Calendar, or any app
              that supports iCal / WebCal.
            </p>

            {/* Download .ics — works everywhere including localhost */}
            <a
              href={feedPath}
              download="reminders.ics"
              className="mb-2 flex w-full items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              <div>
                <p>Download .ics file</p>
                <p className="text-[10px] font-normal opacity-70">Import once — works on localhost</p>
              </div>
            </a>

            {/* webcal live subscription */}
            <button
              onClick={openWebcal}
              className="mb-2 flex w-full items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-primary"
            >
              <Link2 className="h-4 w-4 shrink-0" />
              <div>
                <p>Subscribe via webcal://</p>
                <p className="text-[10px] font-normal opacity-70">Live sync — requires HTTPS host</p>
              </div>
            </button>

            {/* copy HTTPS URL */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {httpsUrl}
              </code>
              <button
                onClick={copyUrl}
                title="Copy HTTPS URL"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <p className="mt-2.5 text-[11px] text-muted-foreground">
              Copy the HTTPS URL to subscribe in Google Calendar via
              &ldquo;Other calendars → From URL&rdquo; once deployed.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 3);

    fetch(
      `/api/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    )
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    const total = events.length;
    const todayCount = events.filter((e) => new Date(e.start).toDateString() === todayStr).length;
    const weekCount = events.filter((e) => {
      const d = new Date(e.start);
      return d >= now && d <= weekEnd;
    }).length;
    const criticalCount = events.filter(
      (e) => e.extendedProps?.urgency === "critical" && e.extendedProps?.status === "active"
    ).length;

    return { total, todayCount, weekCount, criticalCount };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your reminders across time.
          </p>
        </div>
        <SubscribeButton />
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={LayoutGrid} label="Total Events" value={stats.total} color="bg-primary/10 text-primary" />
          <StatCard icon={CalendarDays} label="Today" value={stats.todayCount} color="bg-green-100 text-green-600" />
          <StatCard icon={TrendingUp} label="This Week" value={stats.weekCount} color="bg-blue-100 text-blue-600" />
          <StatCard icon={AlertTriangle} label="Critical Active" value={stats.criticalCount} color="bg-red-100 text-red-600" />
        </div>
      )}

      {/* Main layout */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading calendar…</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">No events in range</p>
          <p className="mt-1 text-sm text-muted-foreground">Create reminders to see them here.</p>
          <Link
            href="/reminders"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CalendarDays className="h-4 w-4" />
            Go to Reminders
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Calendar */}
          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
            <ReminderCalendar events={events as unknown as Array<Record<string, unknown>>} />
          </div>

          {/* Upcoming sidebar */}
          <aside className="w-full shrink-0 rounded-2xl border border-border bg-card p-4 shadow-sm lg:w-64 xl:w-72">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Upcoming</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                14 days
              </span>
            </div>
            <div className="lg:max-h-[calc(100vh-18rem)] lg:overflow-y-auto lg:pr-0.5">
              <UpcomingList events={events} />
            </div>
          </aside>
        </div>
      )}

      {/* Legend */}
      {!loading && events.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground">Urgency:</span>
          {Object.entries(urgencyDot).map(([key, dotClass]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
              <span className="text-xs capitalize text-muted-foreground">{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
