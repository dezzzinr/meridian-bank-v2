"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Field, Input } from "@/components/ui/Field";
import { IconSend, IconSpinner, IconUsers } from "@/components/icons";

export default function BroadcastPage() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSent, setLastSent] = useState<number | null>(null);

  const send = async () => {
    setErr(null);
    if (!title.trim()) return setErr("Add a subject.");
    if (!body.trim()) return setErr("Write a message.");
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/messages", {
        method: "POST",
        body: JSON.stringify({ audience: "all", title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send broadcast.");
      toast("success", `Broadcast sent to ${data.sent} user${data.sent === 1 ? "" : "s"}.`);
      setLastSent(data.sent);
      setTitle("");
      setBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send broadcast.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Broadcast a message
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Send an announcement to every active and suspended user. It lands in
          their notifications.
        </p>
      </div>

      <div className="card max-w-2xl p-5">
        <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-brand-soft/60 px-3.5 py-2.5 text-brand-deep">
          <IconUsers size={16} className="shrink-0" />
          <p className="text-[13px] font-medium">
            This message goes to all users at once.
          </p>
        </div>
        <div className="space-y-4">
          <Field label="Subject">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Scheduled maintenance this weekend"
            />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={6}
              className="input resize-none"
              placeholder="Write your announcement…"
            />
            <p className="mt-1.5 text-xs text-ink-faint">{body.length}/1000</p>
          </Field>
          {err && (
            <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
              {err}
            </p>
          )}
          {lastSent !== null && !err && (
            <p className="rounded-lg bg-good-soft px-3 py-2.5 text-xs font-semibold text-good">
              Last broadcast delivered to {lastSent} user
              {lastSent === 1 ? "" : "s"}.
            </p>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" onClick={send} disabled={busy}>
              {busy ? <IconSpinner size={15} /> : <IconSend size={15} />}
              Send broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
