"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Clock, LayoutDashboard, Settings, Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/reminders", label: "Reminders", Icon: Bell },
  { href: "/categories", label: "Categories", Icon: Tag },
  { href: "/settings", label: "ntfy Settings", Icon: Settings },
  { href: "/history", label: "History", Icon: Clock }
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1">
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
