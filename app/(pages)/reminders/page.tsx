"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReminderForm } from "@/components/forms/reminder-form";
import { RemindersTable } from "@/components/reminders-table";

interface Option {
  _id: string;
  name: string;
}

export default function RemindersPage() {
  const [categories, setCategories] = useState<Option[]>([]);
  const [publishers, setPublishers] = useState<Option[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([fetch("/api/categories"), fetch("/api/publishers")])
      .then(async ([catRes, pubRes]) => {
        const [catData, pubData] = await Promise.all([catRes.json(), pubRes.json()]);
        setCategories((catData.categories || []).map((item: Option) => ({ _id: item._id, name: item.name })));
        setPublishers((pubData.publishers || []).map((item: Option) => ({ _id: item._id, name: item.name })));
      })
      .catch(() => {
        toast.error("Failed to load metadata");
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reminders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage all your reminders.</p>
      </div>
      <ReminderForm
        categories={categories}
        publishers={publishers}
        onCreated={() => setRefreshKey((current) => current + 1)}
      />
      <RemindersTable refreshKey={refreshKey} />
    </div>
  );
}
