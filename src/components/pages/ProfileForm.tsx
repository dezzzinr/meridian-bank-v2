"use client";

import { apiFetch } from "@/lib/client";
import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { fmtDate } from "@/lib/format";
import { useToast } from "../ui/Toast";
import { Field, Input } from "../ui/Field";
import { Avatar } from "../ui/Avatar";
import { IconCheck, IconLogOut, IconShield, IconSpinner, IconUser, IconPencil } from "../icons";

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    createdAt: string;
    region?: string;
    currency?: string;
    avatarUrl?: string | null;
  };
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [nameBusy, setNameBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passErr, setPassErr] = useState<string | null>(null);
  const [passBusy, setPassBusy] = useState(false);

  const nameChanged = name.trim() !== user.name && name.trim().length > 0;

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("error", "Please select an image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 500 * 1024) {
      toast("error", "Image must be under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatarBusy(true);
      try {
        const res = await apiFetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to update profile picture.");
        setAvatarUrl(dataUrl);
        toast("success", "Profile picture updated successfully.");
        window.dispatchEvent(new Event("meridian:banking-updated"));
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Couldn't update picture.");
      } finally {
        setAvatarBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (!res.ok) throw new Error("Failed to remove picture.");
      setAvatarUrl(null);
      toast("success", "Profile picture removed.");
      window.dispatchEvent(new Event("meridian:banking-updated"));
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to remove picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameChanged) return;
    setNameBusy(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't update your name.");
      toast("success", "Profile updated.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't update your name.");
    } finally {
      setNameBusy(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassErr(null);
    if (next.length < 8) {
      setPassErr("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setPassErr("New passwords don't match.");
      return;
    }
    setPassBusy(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't change your password.");
      toast("success", "Password updated. Use it the next time you sign in.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setPassErr(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setPassBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Profile Picture & Personal Details */}
      <form onSubmit={saveName} className="card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
            <IconUser size={16} />
          </span>
          <h2 className="font-display text-base font-semibold text-ink">
            Profile & Picture
          </h2>
        </div>

        {/* Avatar Upload Preview */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            <Avatar name={name} size="xl" avatarUrl={avatarUrl} />
            {avatarBusy && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/40">
                <IconSpinner size={20} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                className="btn-outline py-1.5 px-3 text-xs"
              >
                <IconPencil size={13} />
                Upload picture
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-rose hover:bg-rose-soft"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">
              JPG, PNG or WebP up to 500KB.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Email">
            <Input value={user.email} disabled className="bg-paper text-ink-soft" />
            <p className="mt-1.5 text-xs text-ink-faint">
              Account email cannot be modified directly.
            </p>
          </Field>
          {(user.region || user.currency) && (
            <Field label="Region & currency">
              <Input
                value={`${user.region ?? "United States"} · ${user.currency ?? "USD"}`}
                disabled
                className="bg-paper text-ink-soft"
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Your banking region is managed in bank settings.
              </p>
            </Field>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={!nameChanged || nameBusy}>
              {nameBusy ? <IconSpinner size={15} /> : <IconCheck size={15} />}
              Save changes
            </button>
          </div>
        </div>
      </form>

      {/* Password Management */}
      <form onSubmit={savePassword} className="card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
            <IconShield size={16} />
          </span>
          <h2 className="font-display text-base font-semibold text-ink">
            Password
          </h2>
        </div>
        <div className="space-y-4">
          <Field label="Current password">
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password">
              <Input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
          {passErr && (
            <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
              {passErr}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={passBusy || !current || !next}
            >
              {passBusy && <IconSpinner size={15} />}
              Update password
            </button>
          </div>
        </div>
      </form>

      {/* Session Management */}
      <div className="card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Session</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Member since {fmtDate(user.createdAt)} · Active encryption verified.
            </p>
          </div>
          <button className="btn-outline text-rose hover:bg-rose-soft" onClick={signOut}>
            <IconLogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
