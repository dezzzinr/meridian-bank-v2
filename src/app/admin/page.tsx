"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default function AdminUsersPage() {
  const [adminId, setAdminId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setAdminId(u.id))
      .catch(() => {});
  }, []);

  if (adminId === null) {
    return (
      <div className="flex items-center gap-3 text-ink-soft">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    );
  }

  return <AdminUsersClient adminId={adminId} />;
}
