"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Send, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

interface Publisher {
  _id: string;
  name: string;
  serverUrl: string;
  topic: string;
  authMode: "none" | "token";
  isDefault: boolean;
}

export default function SettingsPage() {
  const [items, setItems] = useState<Publisher[]>([]);
  const [form, setForm] = useState({
    name: "",
    serverUrl: process.env.NEXT_PUBLIC_NTFY_DEFAULT_SERVER_URL || "https://ntfy.sh",
    topic: "",
    authMode: "none",
    token: "",
    isDefault: true
  });
  const [deleteTarget, setDeleteTarget] = useState<Publisher | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/publishers");
    const data = await res.json();
    setItems(data.publishers || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!form.name.trim() || !form.topic.trim()) return toast.error("Name and topic are required");
    setLoading(true);
    const res = await fetch("/api/publishers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);

    if (!res.ok) return toast.error("Failed to create target");
    toast.success("ntfy target saved");
    setForm((prev) => ({ ...prev, name: "", topic: "", token: "" }));
    load();
  }

  async function sendTest(publisher: Publisher) {
    setTestingId(publisher._id);
    const res = await fetch("/api/test-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publisherId: publisher._id, title: "Test", message: "Reminder test notification" })
    });
    setTestingId(null);

    if (res.ok) toast.success("Test notification sent!");
    else toast.error("Test notification failed");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await fetch(`/api/publishers/${deleteTarget._id}`, { method: "DELETE" });
    toast.success("Publisher deleted");
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">ntfy Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure your notification delivery targets.</p>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Plus className="h-4 w-4" />
          Add Publisher
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <Input
              placeholder="e.g. My Phone"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Server URL</label>
            <Input
              placeholder="https://ntfy.sh"
              value={form.serverUrl}
              onChange={(e) => setForm((p) => ({ ...p, serverUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Topic *</label>
            <Input
              placeholder="my-topic-name"
              value={form.topic}
              onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Authentication</label>
            <select
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
              value={form.authMode}
              onChange={(e) => setForm((p) => ({ ...p, authMode: e.target.value as "none" | "token" }))}
            >
              <option value="none">No Auth</option>
              <option value="token">Bearer Token</option>
            </select>
          </div>
          {form.authMode === "token" && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Token</label>
              <Input
                placeholder="Bearer token"
                type="password"
                value={form.token}
                onChange={(e) => setForm((p) => ({ ...p, token: e.target.value }))}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={form.isDefault}
              onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <label htmlFor="isDefault" className="text-sm text-muted-foreground cursor-pointer">
              Set as default publisher
            </label>
          </div>
        </div>
        <Button className="mt-4" onClick={create} disabled={loading}>
          {loading ? "Saving..." : "Save Publisher"}
        </Button>
      </div>

      {/* Publisher list */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Settings className="h-4 w-4" />
            Publishers
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {items.length}
            </span>
          </h3>
        </div>
        {!items.length ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No ntfy target configured</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a publisher above to start sending notifications.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item._id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-muted/20">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.isDefault && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.serverUrl}/{item.topic} &bull; {item.authMode === "token" ? "Bearer Token" : "No Auth"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    className="gap-1.5 bg-muted text-foreground hover:bg-muted/70 h-8 px-3 text-xs"
                    onClick={() => sendTest(item)}
                    disabled={testingId === item._id}
                  >
                    <Send className="h-3 w-3" />
                    {testingId === item._id ? "Sending..." : "Test"}
                  </Button>
                  <Button
                    className="h-8 w-8 bg-red-50 p-0 text-red-600 hover:bg-red-100"
                    onClick={() => setDeleteTarget(item)}
                    title="Delete publisher"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This publisher will be permanently removed. Reminders using it won't be able to send notifications."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
