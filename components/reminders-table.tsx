"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, ChevronUp, ChevronDown, ChevronsUpDown, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils/cn";

interface ReminderOffset {
  value: number;
  unit: "minutes" | "hours" | "days";
}

interface Reminder {
  _id: string;
  title: string;
  type: string;
  status: string;
  urgency: string;
  iconKey: string;
  nextTriggerAt?: string;
  reminderOffsets?: ReminderOffset[];
}

type SortKey = "title" | "type" | "urgency" | "status" | "nextNotification";
type SortDir = "asc" | "desc";

const urgencyStyles: Record<string, string> = {
  low: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700"
};

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  paused: "bg-amber-50 text-amber-700",
  archived: "bg-muted text-muted-foreground"
};

const typeLabels: Record<string, string> = {
  one_time: "One-time",
  recurring: "Recurring",
  deadline: "Deadline",
  habit: "Habit"
};

const urgencyOrder: Record<string, number> = {
  low: 0, medium: 1, high: 2, critical: 3
};

const statusOrder: Record<string, number> = {
  active: 0, paused: 1, completed: 2, archived: 3
};

function offsetToMs(offset: ReminderOffset): number {
  const multiplier = offset.unit === "days" ? 1440 : offset.unit === "hours" ? 60 : 1;
  return offset.value * multiplier * 60 * 1000;
}

function firstNotificationTime(eventTime: Date, offsets: ReminderOffset[]): Date {
  if (!offsets.length) return eventTime;
  const maxMs = Math.max(...offsets.map(offsetToMs));
  return new Date(eventTime.getTime() - maxMs);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function getNotifTime(item: Reminder): Date | null {
  if (!item.nextTriggerAt) return null;
  const eventTime = new Date(item.nextTriggerAt);
  return firstNotificationTime(eventTime, item.reminderOffsets ?? []);
}

function sortItems(items: Reminder[], key: SortKey, dir: SortDir): Reminder[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (key === "title") {
      cmp = a.title.localeCompare(b.title);
    } else if (key === "type") {
      cmp = (typeLabels[a.type] ?? a.type).localeCompare(typeLabels[b.type] ?? b.type);
    } else if (key === "urgency") {
      cmp = (urgencyOrder[a.urgency] ?? 0) - (urgencyOrder[b.urgency] ?? 0);
    } else if (key === "status") {
      cmp = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
    } else if (key === "nextNotification") {
      const at = getNotifTime(a)?.getTime() ?? Infinity;
      const bt = getNotifTime(b)?.getTime() ?? Infinity;
      cmp = at - bt;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  return dir === "asc"
    ? <ChevronUp className="ml-1 inline h-3 w-3 text-primary" />
    : <ChevronDown className="ml-1 inline h-3 w-3 text-primary" />;
}

export function RemindersTable({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  async function load() {
    const res = await fetch("/api/reminders");
    const data = await res.json();
    setItems(data.reminders || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function patch(id: string, status: string) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      toast.success(`Reminder ${status}`);
      load();
    } else {
      toast.error("Action failed");
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    await patch(archiveTarget, "archived");
    setArchiveTarget(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/reminders/${deleteTarget._id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Reminder deleted");
      load();
    } else {
      toast.error("Failed to delete");
    }
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading reminders...</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-sm font-medium">No reminders yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create your first reminder using the form above.</p>
      </div>
    );
  }

  const sorted = sortItems(items, sortKey, sortDir);

  const columns: { key: SortKey; label: string }[] = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    { key: "urgency", label: "Urgency" },
    { key: "status", label: "Status" },
    { key: "nextNotification", label: "Next Notification" },
  ];

  return (
    <>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                    >
                      {label}
                      <SortIcon col={key} active={sortKey === key} dir={sortDir} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((item) => {
                const eventTime = item.nextTriggerAt ? new Date(item.nextTriggerAt) : null;
                const notifTime = eventTime ? firstNotificationTime(eventTime, item.reminderOffsets ?? []) : null;

                return (
                  <tr key={item._id} className="transition hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-medium">{item.title}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {typeLabels[item.type] ?? item.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("capitalize", urgencyStyles[item.urgency])}>
                        {item.urgency}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("capitalize", statusStyles[item.status])}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {notifTime && eventTime ? (
                        (() => {
                          const now = new Date();
                          const isOverdue = notifTime < now;
                          return (
                            <div>
                              <p className={`text-sm font-medium ${isOverdue ? "text-amber-600" : "text-foreground"}`}>
                                {formatDateTime(notifTime)}
                                {isOverdue && (
                                  <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                    Overdue
                                  </span>
                                )}
                              </p>
                              {notifTime.getTime() !== eventTime.getTime() && (
                                <p className="text-xs text-muted-foreground">
                                  Event: {formatDateTime(eventTime)}
                                </p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/reminders/${item._id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        {item.status === "paused" ? (
                          <Button
                            className="h-8 w-8 bg-green-50 p-0 text-green-700 hover:bg-green-100"
                            onClick={() => patch(item._id, "active")}
                            title="Resume"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            className="h-8 w-8 bg-amber-50 p-0 text-amber-700 hover:bg-amber-100"
                            onClick={() => patch(item._id, "paused")}
                            title="Pause"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          className="h-8 w-8 bg-amber-50 p-0 text-amber-700 hover:bg-amber-100"
                          onClick={() => setArchiveTarget(item._id)}
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          className="h-8 w-8 bg-red-50 p-0 text-red-700 hover:bg-red-100"
                          onClick={() => setDeleteTarget(item)}
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive this reminder?"
        description="The reminder will be archived and no longer trigger notifications. You can un-archive it later from the edit page."
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This will permanently delete the reminder and all its delivery history. This cannot be undone."
        confirmLabel="Delete permanently"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
