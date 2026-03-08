import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Clock } from "lucide-react";
import { connectDb } from "@/lib/db/mongoose";
import { DeliveryJobModel, ReminderModel } from "@/lib/models";

export const dynamic = "force-dynamic";

const quickLinks = [
  { href: "/reminders", label: "Create a reminder", description: "Set up one-time or recurring reminders." },
  { href: "/settings", label: "Configure ntfy", description: "Add an ntfy server and topic for notifications." },
  { href: "/history", label: "Check delivery history", description: "See what was sent and any failures." }
];

export default async function HomePage() {
  let total = 0;
  let active = 0;
  let dueSoon = 0;
  let failedJobs = 0;

  try {
    await connectDb();
    [total, active, dueSoon, failedJobs] = await Promise.all([
      ReminderModel.countDocuments(),
      ReminderModel.countDocuments({ status: "active" }),
      ReminderModel.countDocuments({ status: "active", nextTriggerAt: { $lte: new Date(Date.now() + 86400000) } }),
      DeliveryJobModel.countDocuments({ status: "failed" })
    ]);
  } catch {
    // Allows build without runtime env vars.
  }

  const stats = [
    {
      label: "Total reminders",
      value: total,
      icon: Bell,
      color: "bg-blue-50 text-blue-600"
    },
    {
      label: "Active",
      value: active,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600"
    },
    {
      label: "Due in 24h",
      value: dueSoon,
      icon: Clock,
      color: "bg-amber-50 text-amber-600"
    },
    {
      label: "Failed deliveries",
      value: failedJobs,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold">Quick Start</h3>
        <p className="mt-1 text-sm text-muted-foreground">Get up and running in three steps.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {quickLinks.map(({ href, label, description }, i) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-4 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium group-hover:text-primary">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
