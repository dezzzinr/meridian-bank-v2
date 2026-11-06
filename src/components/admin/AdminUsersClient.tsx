"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import { fmtDate, money, initials } from "@/lib/format";
import { CURRENCIES, currencyLabel } from "@/lib/currency";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { RowSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import {
  IconPlus,
  IconSearch,
  IconSend,
  IconShield,
  IconSpinner,
  IconUsers,
} from "../icons";
import { AdminUserControlModal } from "./AdminUserControlModal";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "closed";
  currency: string;
  region: string;
  createdAt: string;
  accountCount: number;
  totalCents: number;
  balancesByCurrency?: { currency: string; cents: number }[];
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-good-soft text-good",
  suspended: "bg-amber-soft text-amber",
  closed: "bg-rose-soft text-rose",
};

export function AdminUsersClient({ adminId }: { adminId: number }) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [messaging, setMessaging] = useState<AdminUser | null>(null);
  const [controlUser, setControlUser] = useState<AdminUser | null>(null);

  const load = () => {
    setLoadErr(false);
    apiFetch("/api/admin/users", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setLoadErr(true));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        u.region.toLowerCase().includes(needle),
    );
  }, [users, q]);

  const stats = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      active: list.filter((u) => u.status === "active").length,
      suspended: list.filter((u) => u.status === "suspended").length,
      admins: list.filter((u) => u.role === "admin").length,
    };
  }, [users]);

  const upsert = (u: AdminUser) => {
    setUsers((prev) => {
      const list = prev ?? [];
      const exists = list.some((x) => x.id === u.id);
      return exists ? list.map((x) => (x.id === u.id ? u : x)) : [u, ...list];
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Users
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Create users, set account status, region and roles.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <IconPlus size={16} /> Add user
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total users", stats.total],
          ["Active", stats.active],
          ["Suspended", stats.suspended],
          ["Admins", stats.admins],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {label}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="card mb-4 p-3">
        <div className="relative">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email or region…"
            className="input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loadErr ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-rose">Couldn't load users.</p>
            <button className="btn-outline mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : users === null ? (
          <div className="divide-y divide-line-soft">
            {Array.from({ length: 6 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={<IconUsers size={20} />}
            title={users.length === 0 ? "No users yet" : "No matches"}
            body={
              users.length === 0
                ? "Create your first user to get started."
                : `Nothing found for “${q.trim()}”.`
            }
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {filtered.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-xs font-semibold text-brand-deep">
                  {initials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {u.name}
                    </p>
                    {u.role === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">
                        <IconShield size={10} /> ADMIN
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-faint">
                    {u.email} · {u.region} ({u.currency})
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-display text-sm font-semibold text-ink">
                    {u.balancesByCurrency?.length ? u.balancesByCurrency.map((b) => money(b.cents, b.currency)).join(" · ") : money(u.totalCents, u.currency)}
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    {u.accountCount} account{u.accountCount === 1 ? "" : "s"} · joined{" "}
                    {fmtDate(u.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    STATUS_STYLE[u.status]
                  }`}
                >
                  {u.status}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setMessaging(u)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper hover:text-ink"
                    aria-label={`Message ${u.name}`}
                    title="Send message"
                  >
                    <IconSend size={15} />
                  </button>
                  <button
                    onClick={() => setControlUser(u)}
                    className="btn-primary px-3 py-1.5 text-xs bg-brand font-semibold"
                    title="Impersonate & execute full banking actions on behalf of this user"
                  >
                    User Actions
                  </button>
                  <button
                    onClick={() => setEditing(u)}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(u) => upsert(u)}
      />
      <ManageUserModal
        user={editing}
        adminId={adminId}
        onClose={() => setEditing(null)}
        onSaved={(u) => upsert(u)}
      />
      <MessageUserModal
        user={messaging}
        onClose={() => setMessaging(null)}
      />

      <AdminUserControlModal
        userId={controlUser?.id || null}
        userName={controlUser?.name}
        open={Boolean(controlUser)}
        onClose={() => setControlUser(null)}
        onRefresh={() => load()}
      />
    </div>
  );
}

/* ---------- Add user ---------- */
function AddUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (u: AdminUser) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setCurrency("USD");
      setRole("user");
      setErr(null);
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, currency, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't create user.");
      toast("success", `${data.name} created.`);
      onCreated(data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't create user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a new user"
      subtitle="They can sign in immediately with the temporary password."
    >
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </Field>
        <Field label="Temporary password" hint="At least 8 characters. Ask them to change it after signing in.">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary password"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region / currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.region} ({c.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
        </div>
        {err && (
          <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
            {err}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button className="btn-outline flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={submit} disabled={busy}>
            {busy && <IconSpinner size={15} />} Create user
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Manage user ---------- */
function ManageUserModal({
  user,
  adminId,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  adminId: number;
  onClose: () => void;
  onSaved: (u: AdminUser) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<AdminUser["status"]>("active");
  const [role, setRole] = useState<AdminUser["role"]>("user");
  const [currency, setCurrency] = useState("USD");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setStatus(user.status);
      setRole(user.role);
      setCurrency(user.currency);
      setErr(null);
      setBusy(false);
    }
  }, [user]);

  if (!user) return null;
  const isSelf = user.id === adminId;

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, role, currency }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't update user.");
      toast("success", `${data.name} updated.`);
      onSaved({ ...user, ...data });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Manage ${user.name}`}
      subtitle={user.email}
    >
      <div className="space-y-4">
        <Field
          label="Account status"
          hint="Suspended users can sign in but can't transact. Closed users are signed out and blocked."
        >
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
            disabled={isSelf}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUser["role"])}
              disabled={isSelf}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Region / currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.region} ({c.code})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {isSelf && (
          <p className="rounded-lg bg-amber-soft px-3 py-2.5 text-xs font-medium text-amber">
            You can't change your own status or role.
          </p>
        )}
        <p className="text-xs text-ink-faint">
          Changing region sets the default for new accounts and overview estimates to{" "}
          <span className="font-semibold">{currencyLabel(currency)}</span>. Existing
          accounts keep their original currencies; only new default accounts and overview estimates use the new region.
        </p>
        {err && (
          <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
            {err}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button className="btn-outline flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy && <IconSpinner size={15} />} Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Message a single user ---------- */
function MessageUserModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setTitle("");
      setBody("");
      setErr(null);
      setBusy(false);
    }
  }, [user]);

  if (!user) return null;

  const send = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/messages", {
        method: "POST",
        body: JSON.stringify({ audience: "user", userId: user.id, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send message.");
      toast("success", `Message sent to ${user.name}.`);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Message ${user.name}`}
      subtitle="They'll see this in their notifications."
    >
      <div className="space-y-4">
        <Field label="Subject">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus />
        </Field>
        <Field label="Message">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={4}
            className="input resize-none"
            placeholder="Write your message…"
          />
        </Field>
        {err && (
          <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
            {err}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button className="btn-outline flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={send} disabled={busy}>
            {busy && <IconSpinner size={15} />} Send message
          </button>
        </div>
      </div>
    </Modal>
  );
}
