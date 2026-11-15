"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, getToken, setToken } from "@/lib/client";
import { Field, Input } from "@/components/ui/Field";
import { IconEye, IconEyeOff, IconSpinner } from "@/components/icons";

export function LoginForm() {
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

  const completeSignIn = (token: string) => {
    setToken(token);
    window.location.href = "/app";
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password) {
      setErr("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      completeSignIn(data.token as string);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Something went wrong. Check your connection and try again.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Welcome back
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Sign in to your Meridian account.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
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
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to Meridian?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand transition hover:text-brand-deep"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
