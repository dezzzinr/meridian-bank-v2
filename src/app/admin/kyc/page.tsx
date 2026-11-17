"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { KycReviewClient } from "@/components/admin/KycReviewClient";

export default function KycReviewPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { apiFetch("/api/auth/me").then((response) => { if (response.ok) setReady(true); }).catch(() => {}); }, []);
  return ready ? <KycReviewClient /> : <div className="card p-8 text-sm text-ink-soft">Loading verification submissions…</div>;
}
