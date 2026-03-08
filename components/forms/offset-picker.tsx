"use client";

import { Plus, Trash2 } from "lucide-react";

export type OffsetEntry = { value: string; unit: "minutes" | "hours" | "days" };

const unitOptions: { value: OffsetEntry["unit"]; label: string }[] = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" }
];

const selectClass =
  "rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function OffsetPicker({
  value,
  onChange
}: {
  value: OffsetEntry[];
  onChange: (v: OffsetEntry[]) => void;
}) {
  function update(index: number, field: keyof OffsetEntry, val: string) {
    onChange(value.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
  }

  function add() {
    onChange([...value, { value: "10", unit: "minutes" }]);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {value.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={entry.value}
            onChange={(e) => update(i, "value", e.target.value)}
            className={`${selectClass} w-24 text-center`}
          />
          <select
            value={entry.unit}
            onChange={(e) => update(i, "unit", e.target.value as OffsetEntry["unit"])}
            className={`${selectClass} flex-1`}
          >
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={value.length === 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-30"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-3 w-3" /> Add offset
      </button>
    </div>
  );
}
