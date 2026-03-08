"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string; // datetime-local format: "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  className?: string;
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // already in datetime-local format
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseParts(value: string): { date: string; hour12: string; minute: string; ampm: "AM" | "PM" } {
  if (!value) return { date: "", hour12: "12", minute: "00", ampm: "AM" };
  const [datePart, timePart] = value.split("T");
  if (!timePart) return { date: datePart ?? "", hour12: "12", minute: "00", ampm: "AM" };
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr ?? "0", 10);
  const m = mStr ?? "00";
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { date: datePart ?? "", hour12: String(h), minute: m, ampm };
}

function buildValue(date: string, hour12: string, minute: string, ampm: "AM" | "PM"): string {
  if (!date) return "";
  let h = parseInt(hour12, 10);
  if (ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date}T${pad(h)}:${minute}`;
}

const selectClass =
  "rounded-xl border border-border bg-card px-2 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function DateTimePicker({ value, onChange, className }: Props) {
  const normalized = toDatetimeLocal(value);
  const init = parseParts(normalized);

  const [date, setDate] = useState(init.date);
  const [hour12, setHour12] = useState(init.hour12);
  const [minute, setMinute] = useState(init.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(init.ampm);

  // Sync inward when value changes externally (e.g. loading saved reminder)
  useEffect(() => {
    const n = toDatetimeLocal(value);
    const p = parseParts(n);
    setDate(p.date);
    setHour12(p.hour12);
    setMinute(p.minute);
    setAmpm(p.ampm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(d: string, h: string, m: string, a: "AM" | "PM") {
    const combined = buildValue(d, h, m, a);
    if (combined) onChange(combined);
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      {/* Date */}
      <Input
        type="date"
        value={date}
        className="flex-1"
        onChange={(e) => {
          setDate(e.target.value);
          emit(e.target.value, hour12, minute, ampm);
        }}
      />

      {/* Hour */}
      <select
        className={selectClass}
        value={hour12}
        onChange={(e) => {
          setHour12(e.target.value);
          emit(date, e.target.value, minute, ampm);
        }}
      >
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span className="text-muted-foreground">:</span>

      {/* Minute */}
      <select
        className={selectClass}
        value={minute}
        onChange={(e) => {
          setMinute(e.target.value);
          emit(date, hour12, e.target.value, ampm);
        }}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* AM / PM */}
      <select
        className={selectClass}
        value={ampm}
        onChange={(e) => {
          const a = e.target.value as "AM" | "PM";
          setAmpm(a);
          emit(date, hour12, minute, a);
        }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
