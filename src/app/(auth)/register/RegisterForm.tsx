"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, getToken, setToken } from "@/lib/client";
import { Field, Input } from "@/components/ui/Field";
import { IconEye, IconEyeOff, IconSpinner } from "@/components/icons";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/auth/me")
      .then((r) => {
        if (r.ok) window.location.replace("/app");
      })
      .catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Please tell us your name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setErr("Enter a valid email address.");
    if (password.length < 8)
      return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setToken(data.token as string);
      window.location.href = "/app";
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Create your account
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Open in seconds. No paperwork, no branch visits.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Full name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            autoComplete="name"
            autoFocus
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint transition hover:text-ink"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
        </Field>

        {err && (
          <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
            {err}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <IconSpinner size={15} />}
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already banking with Meridian?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand transition hover:text-brand-deep"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
