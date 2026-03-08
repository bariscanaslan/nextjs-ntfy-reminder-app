"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Bell, Briefcase, CalendarHeart, ClipboardCheck, Dumbbell, HeartPulse, LucideIcon, Pill, Plus, Tag, Trash2 } from "lucide-react";
import { IconPicker } from "@/components/forms/icon-picker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Category {
  _id: string;
  name: string;
  color: string;
  defaultIconKey: string;
  description?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Bell,
  HeartPulse,
  Dumbbell,
  Briefcase,
  Pill,
  ClipboardCheck,
  CalendarHeart,
  AlertCircle
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", color: "#3b82f6", defaultIconKey: "Bell", description: "" });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setItems(data.categories || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!form.name.trim()) return toast.error("Name is required");
    setLoading(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);

    if (!res.ok) return toast.error("Could not create category");
    toast.success("Category created");
    setForm({ name: "", color: "#3b82f6", defaultIconKey: "Bell", description: "" });
    load();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await fetch(`/api/categories/${deleteTarget._id}`, { method: "DELETE" });
    toast.success("Category deleted");
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
        <p className="mt-1 text-sm text-muted-foreground">Organise your reminders by category.</p>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Plus className="h-4 w-4" />
          New Category
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <Input
              placeholder="e.g. Health"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-xl border border-border bg-transparent p-0.5"
              />
              <Input
                placeholder="#3b82f6"
                value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Default Icon</label>
            <IconPicker
              value={form.defaultIconKey}
              onChange={(v) => setForm((p) => ({ ...p, defaultIconKey: v }))}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
        <Button onClick={create} disabled={loading}>
          {loading ? "Saving..." : "Add Category"}
        </Button>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Tag className="h-4 w-4" />
            All Categories
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {items.length}
            </span>
          </h3>
        </div>
        {!items.length ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No categories yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create your first category above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = iconMap[item.defaultIconKey] ?? Bell;
              return (
                <li
                  key={item._id}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    {/* Colored icon badge */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.defaultIconKey}
                        {item.description ? ` · ${item.description}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="h-8 w-8 shrink-0 bg-red-50 p-0 text-red-600 hover:bg-red-100"
                    onClick={() => setDeleteTarget(item)}
                    title="Delete category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete the category. Reminders using it will lose their category assignment."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
