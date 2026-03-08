"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface Job {
  _id: string;
  status: string;
  scheduledFor: string;
  sentAt?: string;
  attemptCount: number;
  lastError?: string;
  reminderId?: { title?: string };
}

const statusStyles: Record<string, string> = {
  sent: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
};

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/history?page=${p}`);
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  function prev() { if (page > 1) setPage(p => p - 1); }
  function next() { if (page < pages) setPage(p => p + 1); }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification History</h2>
        <p className="mt-1 text-sm text-muted-foreground">A log of all delivery attempts.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <h3 className="text-base font-semibold">Delivery Log</h3>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {total} total
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : !jobs.length ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No notification history yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Delivery attempts will appear here once reminders trigger.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminder</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scheduled</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sent</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attempts</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr key={job._id} className="transition hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {job.reminderId?.title ?? <span className="italic text-muted-foreground">(deleted reminder)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("capitalize", statusStyles[job.status] ?? "bg-muted text-muted-foreground")}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(job.scheduledFor).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.sentAt ? new Date(job.sentAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        <span className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          job.attemptCount > 1 ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                        )}>
                          {job.attemptCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{job.lastError ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{pages}</span>
                {" "}·{" "}<span className="font-medium">{total}</span> entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={prev}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {/* Page number pills */}
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={cn(
                          "flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition",
                          page === p
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={next}
                  disabled={page >= pages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
