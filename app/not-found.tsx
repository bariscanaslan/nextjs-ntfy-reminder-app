"use client";

import { useRouter } from "next/navigation";
import { Bell, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    // Fixed overlay covers the entire viewport including any sidebar from the layout
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
      {/* Brand mark */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md">
        <Bell className="h-7 w-7 text-primary-foreground" />
      </div>

      {/* 404 */}
      <p className="text-8xl font-extrabold tracking-tight text-primary/20 select-none">
        404
      </p>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          Go home
        </button>
      </div>
    </div>
  );
}
