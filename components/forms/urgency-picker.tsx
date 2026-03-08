"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const levels = [
  { key: "low", color: "border-green-200 text-green-700 hover:bg-green-50", activeColor: "border-green-500 bg-green-50 text-green-700" },
  { key: "medium", color: "border-amber-200 text-amber-700 hover:bg-amber-50", activeColor: "border-amber-500 bg-amber-50 text-amber-700" },
  { key: "high", color: "border-orange-200 text-orange-700 hover:bg-orange-50", activeColor: "border-orange-500 bg-orange-50 text-orange-700" },
  { key: "critical", color: "border-red-200 text-red-700 hover:bg-red-50", activeColor: "border-red-500 bg-red-50 text-red-700" }
] as const;

export function UrgencyPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {levels.map(({ key, color, activeColor }) => (
        <Button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          className={cn("capitalize border bg-transparent font-medium shadow-none", value === key ? activeColor : color)}
        >
          {key}
        </Button>
      ))}
    </div>
  );
}

