"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { useState } from "react";

const AUTH_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (AUTH_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-6">
      <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm md:sticky md:top-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Reminder OS</h1>
            <p className="text-xs text-muted-foreground">Stay on top of everything</p>
          </div>
        </div>

        <NavLinks />

        {/* Footer */}
        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Powered by <span className="font-medium text-foreground">ntfy</span> for push notifications.
            </p>
          </div>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="min-w-0 space-y-6 pb-10">{children}</main>
    </div>
  );
}
