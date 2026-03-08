"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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

const emptyDelivery = (): DeliveryForm => ({ publisherId: "", priority: "3", tags: "", clickUrl: "" });

const initialState = {
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
};

const initialOffsets: OffsetEntry[] = [{ value: "10", unit: "minutes" }];

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
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const selectClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Returns an error string if endAt is invalid relative to startAt, otherwise null. */
function endDateError(startAt: string, endAt: string): string | null {
  if (!endAt || !startAt) return null;
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (end <= start) return "End time must be after start time.";
  if (end - start < 10 * 60 * 1000) return "End time must be at least 10 minutes after start time.";
  return null;
}

export function ReminderForm({
  categories,
  publishers,
  onCreated
}: {
  categories: Option[];
  publishers: Option[];
  onCreated?: () => void;
}) {
  const [form, setForm] = useState(initialState);
  const [offsets, setOffsets] = useState<OffsetEntry[]>(initialOffsets);
  const [deliveries, setDeliveries] = useState<DeliveryForm[]>([emptyDelivery()]);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const endError = endDateError(form.startAt, form.endAt);

  const canSubmit = useMemo(
    () => form.title && form.startAt && deliveries.some((d) => d.publisherId) && !endError,
    [form, deliveries, endError]
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

  async function submit() {
    if (!canSubmit) return;

    setLoading(true);
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

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error("Failed to create reminder");

      setForm(initialState);
      setOffsets(initialOffsets);
      setDeliveries([emptyDelivery()]);
      setExcludedDates([]);
      setOpen(false);
      toast.success("Reminder created");
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold">Create Reminder</span>
        </div>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border px-6 pb-6 pt-5 space-y-6">
          {/* Core fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" required>
              <Input
                placeholder="e.g. Take medication"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </Field>
            <Field label="Type">
              <select className={selectClass} value={form.type} onChange={(e) => update("type", e.target.value)}>
                <option value="one_time">One Time</option>
                <option value="recurring">Recurring</option>
                <option value="deadline">Deadline</option>
                <option value="habit">Habit</option>
              </select>
            </Field>
            <Field label="Start Date & Time" required>
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => update("startAt", e.target.value)}
              />
              {form.type === "recurring" && (
                <p className="text-[11px] text-amber-600">
                  For recurring events, set this to when the <strong>event occurs</strong> — notifications fire before this time based on your offsets.
                </p>
              )}
            </Field>
            <Field label="End Date & Time" error={endError ?? undefined}>
              <Input
                type="datetime-local"
                value={form.endAt}
                className={endError ? "border-destructive focus:ring-destructive/30" : ""}
                onChange={(e) => update("endAt", e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select className={selectClass} value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option value={c._id} key={c._id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              placeholder="Optional details"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="resize-none"
              rows={2}
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

          <div className="flex items-center gap-3">
            <Button type="button" onClick={submit} disabled={loading || !canSubmit}>
              {loading ? "Saving..." : "Create Reminder"}
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
