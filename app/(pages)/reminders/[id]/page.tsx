"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { IconPicker } from "@/components/forms/icon-picker";
import { OffsetPicker, type OffsetEntry } from "@/components/forms/offset-picker";
import { UrgencyPicker } from "@/components/forms/urgency-picker";
import { RecurrencePicker } from "@/components/forms/recurrence-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Option {
  _id: string;
  name: string;
}

type DeliveryForm = {
  publisherId: string;
  priority: string;
  tags: string;
  clickUrl: string;
};

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const selectClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const emptyDelivery = (): DeliveryForm => ({ publisherId: "", priority: "3", tags: "", clickUrl: "" });

const initialOffsets: OffsetEntry[] = [{ value: "10", unit: "minutes" }];

/** Returns an error string if endAt is invalid relative to startAt, otherwise null. */
function endDateError(startAt: string, endAt: string): string | null {
  if (!endAt || !startAt) return null;
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (end <= start) return "End time must be after start time.";
  if (end - start < 10 * 60 * 1000) return "End time must be at least 10 minutes after start time.";
  return null;
}

export default function EditReminderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [categories, setCategories] = useState<Option[]>([]);
  const [publishers, setPublishers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "one_time",
    status: "active",
    categoryId: "",
    urgency: "medium",
    iconKey: "Bell",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allDay: false,
    startAt: "",
    endAt: "",
    rrule: ""
  });
  const [offsets, setOffsets] = useState<OffsetEntry[]>(initialOffsets);
  const [deliveries, setDeliveries] = useState<DeliveryForm[]>([emptyDelivery()]);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);

  const endError = endDateError(form.startAt, form.endAt);

  const canSave = useMemo(
    () => form.title && form.startAt && !endError,
    [form.title, form.startAt, endError]
  );

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function updateDelivery(index: number, key: keyof DeliveryForm, value: string) {
    setDeliveries((prev) => prev.map((d, i) => (i === index ? { ...d, [key]: value } : d)));
  }

  function addDelivery() {
    setDeliveries((prev) => [...prev, emptyDelivery()]);
  }

  function removeDelivery(index: number) {
    setDeliveries((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    async function load() {
      try {
        const [reminderRes, catRes, pubRes] = await Promise.all([
          fetch(`/api/reminders/${id}`),
          fetch("/api/categories"),
          fetch("/api/publishers")
        ]);

        if (!reminderRes.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const [{ reminder }, { categories: cats }, { publishers: pubs }] = await Promise.all([
          reminderRes.json(),
          catRes.json(),
          pubRes.json()
        ]);

        setCategories(cats || []);
        setPublishers(pubs || []);

        setForm({
          title: reminder.title ?? "",
          description: reminder.description ?? "",
          type: reminder.type ?? "one_time",
          status: reminder.status ?? "active",
          categoryId: reminder.categoryId ? String(reminder.categoryId) : "",
          urgency: reminder.urgency ?? "medium",
          iconKey: reminder.iconKey ?? "Bell",
          timezone: reminder.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          allDay: reminder.allDay ?? false,
          startAt: toDatetimeLocal(reminder.startAt),
          endAt: toDatetimeLocal(reminder.endAt),
          rrule: reminder.rrule ?? ""
        });

        const rawExDates: Date[] = reminder.excludedDates ?? [];
        setExcludedDates(rawExDates.map((d: Date) => new Date(d).toISOString().slice(0, 10)));

        const rawOffsets: Array<{ value: number; unit: string }> = reminder.reminderOffsets ?? [];
        setOffsets(
          rawOffsets.length
            ? rawOffsets.map((o) => ({ value: String(o.value), unit: o.unit as OffsetEntry["unit"] }))
            : initialOffsets
        );

        // Prefer deliveries array, fallback to legacy delivery
        const rawDeliveries: Array<{ publisherId?: unknown; priority?: number; tags?: string[]; clickUrl?: string }> =
          reminder.deliveries?.length
            ? reminder.deliveries
            : reminder.delivery
            ? [reminder.delivery]
            : [];

        setDeliveries(
          rawDeliveries.length
            ? rawDeliveries.map((d) => ({
                publisherId: d.publisherId ? String(d.publisherId) : "",
                priority: String(d.priority ?? 3),
                tags: (d.tags ?? []).join(", "),
                clickUrl: d.clickUrl ?? ""
              }))
            : [emptyDelivery()]
        );
      } catch {
        toast.error("Failed to load reminder");
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        status: form.status,
        categoryId: form.categoryId || null,
        urgency: form.urgency,
        iconKey: form.iconKey,
        timezone: form.timezone,
        allDay: form.allDay,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        rrule: form.type === "recurring" ? form.rrule || null : null,
        excludedDates: excludedDates.map((d) => new Date(d + "T00:00:00").toISOString()),
        reminderOffsets: offsets
          .filter((o) => Number(o.value) > 0)
          .map((o) => ({ value: Number(o.value), unit: o.unit })),
        deliveries: deliveries
          .filter((d) => d.publisherId)
          .map((d) => ({
            publisherId: d.publisherId,
            priority: Number(d.priority) || 3,
            tags: d.tags.split(",").map((x) => x.trim()).filter(Boolean),
            clickUrl: d.clickUrl
          }))
      };

      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save");
      }

      toast.success("Reminder updated");
      router.push("/reminders");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading reminder…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-medium">Reminder not found.</p>
        <button
          className="mt-3 text-sm text-primary hover:underline"
          onClick={() => router.push("/reminders")}
        >
          Back to reminders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/reminders")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Reminder</h2>
          <p className="text-sm text-muted-foreground">Update reminder details and delivery targets.</p>
        </div>
      </div>

      {/* Main form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        {/* Core fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
          </Field>
          <Field label="Type">
            <select className={selectClass} value={form.type} onChange={(e) => update("type", e.target.value)}>
              <option value="one_time">One Time</option>
              <option value="recurring">Recurring</option>
              <option value="deadline">Deadline</option>
              <option value="habit">Habit</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={selectClass} value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Category">
            <select className={selectClass} value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option value={c._id} key={c._id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Start Date & Time" required>
            <Input type="datetime-local" value={form.startAt} onChange={(e) => update("startAt", e.target.value)} />
          </Field>
          <Field label="End Date & Time" error={endError ?? undefined}>
            <Input
              type="datetime-local"
              value={form.endAt}
              className={endError ? "border-destructive focus:ring-destructive/30" : ""}
              onChange={(e) => update("endAt", e.target.value)}
            />
          </Field>
          <Field label="Timezone">
            <Input value={form.timezone} onChange={(e) => update("timezone", e.target.value)} />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            rows={3}
            className="resize-none"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>

        {/* Recurring options */}
        {form.type === "recurring" && (
          <RecurrencePicker
            rrule={form.rrule}
            excludedDates={excludedDates}
            onRruleChange={(v) => update("rrule", v)}
            onExcludedDatesChange={setExcludedDates}
          />
        )}

        {/* Urgency + Icon */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Urgency</p>
            <UrgencyPicker value={form.urgency} onChange={(v) => update("urgency", v)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Icon</p>
            <IconPicker value={form.iconKey} onChange={(v) => update("iconKey", v)} />
          </div>
        </div>

        {/* Reminder Offsets */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Reminder Offsets</p>
          <OffsetPicker value={offsets} onChange={setOffsets} />
        </div>

        {/* Deliveries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Delivery Targets
            </p>
            <button
              type="button"
              onClick={addDelivery}
              className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-3 w-3" /> Add target
            </button>
          </div>
          {deliveries.map((d, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Target {i + 1}</span>
                {deliveries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDelivery(i)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="ntfy Publisher" required>
                  <select
                    className={selectClass}
                    value={d.publisherId}
                    onChange={(e) => updateDelivery(i, "publisherId", e.target.value)}
                  >
                    <option value="">Choose ntfy target</option>
                    {publishers.map((p) => (
                      <option value={p._id} key={p._id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority (1–5)">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={d.priority}
                    onChange={(e) => updateDelivery(i, "priority", e.target.value)}
                  />
                </Field>
                <Field label="Tags (CSV)">
                  <Input
                    placeholder="work,health"
                    value={d.tags}
                    onChange={(e) => updateDelivery(i, "tags", e.target.value)}
                  />
                </Field>
                <Field label="Click URL">
                  <Input
                    placeholder="https://..."
                    value={d.clickUrl}
                    onChange={(e) => updateDelivery(i, "clickUrl", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button onClick={save} disabled={saving || !canSave}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <button
            type="button"
            onClick={() => router.push("/reminders")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
