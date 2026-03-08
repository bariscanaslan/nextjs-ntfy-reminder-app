"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type EndType = "never" | "count" | "until";

interface RecurrenceState {
  freq: Freq;
  interval: number;
  byweekday: string[]; // ["MO","TU",...]
  bymonthday: number;  // 1–31, or -1 for "last day"
  endType: EndType;
  count: number;
  until: string; // YYYY-MM-DD
}

const WEEKDAYS = [
  { label: "Mon", value: "MO" },
  { label: "Tue", value: "TU" },
  { label: "Wed", value: "WE" },
  { label: "Thu", value: "TH" },
  { label: "Fri", value: "FR" },
  { label: "Sat", value: "SA" },
  { label: "Sun", value: "SU" },
];

const FREQ_LABELS: Record<Freq, string> = {
  DAILY: "Day(s)",
  WEEKLY: "Week(s)",
  MONTHLY: "Month(s)",
  YEARLY: "Year(s)",
};

// ─── RRULE helpers ────────────────────────────────────────────────────────────

function parseRRule(rrule: string): RecurrenceState {
  const state: RecurrenceState = {
    freq: "DAILY",
    interval: 1,
    byweekday: [],
    bymonthday: 1,
    endType: "never",
    count: 5,
    until: "",
  };

  if (!rrule) return state;

  // Strip DTSTART line if present
  const cleaned = rrule.replace(/^DTSTART[^\n]*\n?/i, "").replace(/^RRULE:/i, "");

  for (const part of cleaned.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).toUpperCase();
    const val = part.slice(eq + 1);

    if (key === "FREQ") state.freq = val.toUpperCase() as Freq;
    else if (key === "INTERVAL") state.interval = Math.max(1, parseInt(val) || 1);
    else if (key === "BYDAY") state.byweekday = val.split(",").map((d) => d.toUpperCase());
    else if (key === "BYMONTHDAY") state.bymonthday = parseInt(val) || 1; // -1 = last day
    else if (key === "COUNT") { state.endType = "count"; state.count = parseInt(val) || 5; }
    else if (key === "UNTIL") {
      state.endType = "until";
      // UNTIL=20261231T000000Z → "2026-12-31"
      const m = val.match(/^(\d{4})(\d{2})(\d{2})/);
      if (m) state.until = `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  return state;
}

function buildRRule(s: RecurrenceState): string {
  const parts: string[] = [`FREQ=${s.freq}`, `INTERVAL=${s.interval}`];
  if (s.freq === "WEEKLY" && s.byweekday.length > 0) {
    parts.push(`BYDAY=${s.byweekday.join(",")}`);
  }
  if (s.freq === "MONTHLY") {
    // -1 = last day of month; otherwise clamp to 1–31
    const day = s.bymonthday === -1 ? -1 : Math.min(31, Math.max(1, s.bymonthday));
    parts.push(`BYMONTHDAY=${day}`);
  }
  if (s.endType === "count" && s.count > 0) {
    parts.push(`COUNT=${s.count}`);
  }
  if (s.endType === "until" && s.until) {
    const d = new Date(s.until);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      parts.push(`UNTIL=${y}${m}${day}T235959Z`);
    }
  }
  return parts.join(";");
}

// ─── Shared class ─────────────────────────────────────────────────────────────

const inputClass =
  "rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const selectClass = `${inputClass} w-full`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface RecurrencePickerProps {
  rrule: string;
  excludedDates: string[]; // "YYYY-MM-DD" strings
  onRruleChange: (v: string) => void;
  onExcludedDatesChange: (v: string[]) => void;
}

export function RecurrencePicker({
  rrule,
  excludedDates,
  onRruleChange,
  onExcludedDatesChange,
}: RecurrencePickerProps) {
  const [state, setState] = useState<RecurrenceState>(() => parseRRule(rrule));
  const [newExDate, setNewExDate] = useState("");

  // Re-parse when rrule prop changes from outside (e.g. edit page load)
  useEffect(() => {
    setState(parseRRule(rrule));
  }, [rrule]);

  function update(patch: Partial<RecurrenceState>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      onRruleChange(buildRRule(next));
      return next;
    });
  }

  function toggleWeekday(day: string) {
    const next = state.byweekday.includes(day)
      ? state.byweekday.filter((d) => d !== day)
      : [...state.byweekday, day];
    update({ byweekday: next });
  }

  function addExDate() {
    if (!newExDate || excludedDates.includes(newExDate)) return;
    onExcludedDatesChange([...excludedDates, newExDate].sort());
    setNewExDate("");
  }

  function removeExDate(date: string) {
    onExcludedDatesChange(excludedDates.filter((d) => d !== date));
  }

  return (
    <div className="space-y-4 rounded-xl bg-muted/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Recurrence
      </p>

      {/* Frequency + Interval */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm text-muted-foreground">Every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={state.interval}
          onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
          className={`${inputClass} w-16 text-center`}
        />
        <select
          value={state.freq}
          onChange={(e) => update({ freq: e.target.value as Freq, byweekday: [], bymonthday: 1 })}
          className={`${selectClass} flex-1`}
        >
          {(Object.entries(FREQ_LABELS) as [Freq, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Weekly: day-of-week pills */}
      {state.freq === "WEEKLY" && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">On days</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map(({ label, value }) => {
              const active = state.byweekday.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleWeekday(value)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly: day of month */}
      {state.freq === "MONTHLY" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">On day</span>
            <select
              value={state.bymonthday === -1 ? "last" : String(state.bymonthday)}
              onChange={(e) => {
                const v = e.target.value;
                update({ bymonthday: v === "last" ? -1 : (parseInt(v) || 1) });
              }}
              className={`${inputClass} w-36`}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}</option>
              ))}
              <option value="last">Last day</option>
            </select>
            <span className="text-sm text-muted-foreground">of the month</span>
          </div>
          {state.bymonthday > 28 && state.bymonthday !== -1 && (
            <p className="text-[11px] text-amber-600">
              Day {state.bymonthday} doesn&apos;t exist in all months — those months will be skipped. Use &ldquo;Last day&rdquo; to always trigger on the final day of every month.
            </p>
          )}
        </div>
      )}

      {/* End condition */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Ends</p>
        <div className="space-y-2">
          {(["never", "count", "until"] as EndType[]).map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="endType"
                value={type}
                checked={state.endType === type}
                onChange={() => update({ endType: type })}
                className="accent-primary"
              />
              {type === "never" && <span className="text-sm">Never</span>}
              {type === "count" && (
                <span className="flex items-center gap-1.5 text-sm">
                  After
                  <input
                    type="number"
                    min={1}
                    value={state.count}
                    onClick={() => update({ endType: "count" })}
                    onChange={(e) => update({ endType: "count", count: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={`${inputClass} w-16 text-center`}
                  />
                  occurrences
                </span>
              )}
              {type === "until" && (
                <span className="flex items-center gap-1.5 text-sm">
                  On date
                  <input
                    type="date"
                    value={state.until}
                    onClick={() => update({ endType: "until" })}
                    onChange={(e) => update({ endType: "until", until: e.target.value })}
                    className={inputClass}
                  />
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Excluded dates */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Skip these dates</p>

        {excludedDates.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {excludedDates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium"
              >
                {new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                <button
                  type="button"
                  onClick={() => removeExDate(d)}
                  className="ml-0.5 rounded-full text-muted-foreground transition hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={newExDate}
            onChange={(e) => setNewExDate(e.target.value)}
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={addExDate}
            disabled={!newExDate}
            className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
