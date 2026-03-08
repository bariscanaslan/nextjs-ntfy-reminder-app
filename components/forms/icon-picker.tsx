"use client";

import { AlertCircle, Bell, Briefcase, CalendarHeart, ClipboardCheck, Dumbbell, HeartPulse, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const icons = [
  { key: "Bell", Icon: Bell },
  { key: "HeartPulse", Icon: HeartPulse },
  { key: "Dumbbell", Icon: Dumbbell },
  { key: "Briefcase", Icon: Briefcase },
  { key: "Pill", Icon: Pill },
  { key: "ClipboardCheck", Icon: ClipboardCheck },
  { key: "CalendarHeart", Icon: CalendarHeart },
  { key: "AlertCircle", Icon: AlertCircle }
];

export function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {icons.map(({ key, Icon }) => (
        <Button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          title={key}
          className={cn(
            "h-10 border bg-transparent text-muted-foreground shadow-none hover:bg-muted hover:text-foreground",
            value === key && "border-primary bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}

