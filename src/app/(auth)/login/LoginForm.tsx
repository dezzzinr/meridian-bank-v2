"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, getToken, setToken } from "@/lib/client";
import { Field, Input } from "@/components/ui/Field";
import { IconEye, IconEyeOff, IconSpinner } from "@/components/icons";

const DEMO_EMAIL = "demo@meridian.bank";
const DEMO_PASSWORD = "demo1234";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  // If a valid session already exists (e.g. signed in earlier), go straight in.
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

  const demoSignIn = async () => {
    setErr(null);
    setDemoBusy(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Quick Access Account unavailable.");
      completeSignIn(data.token as string);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Sign-in failed.");
      setDemoBusy(false);
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

        <button type="submit" className="btn-primary w-full" disabled={busy || demoBusy}>
          {busy && <IconSpinner size={15} />}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          or
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        onClick={demoSignIn}
        disabled={demoBusy || busy}
        className="btn-outline w-full"
      >
        {demoBusy && <IconSpinner size={15} />}
        {demoBusy ? "Opening demo…" : "One-Click Quick Access"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">
        {DEMO_EMAIL} · {DEMO_PASSWORD}
      </p>

      <div className="mt-5 rounded-xl border border-dashed border-line bg-paper/70 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Quick Access Account
            </p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              {DEMO_EMAIL} / {DEMO_PASSWORD}
            </p>
          </div>
          <button
            type="button"
            className="btn-outline shrink-0 px-3 py-2 text-xs"
            onClick={() => {
              setEmail(DEMO_EMAIL);
              setPassword(DEMO_PASSWORD);
              setErr(null);
            }}
          >
            Fill form
          </button>
        </div>
      </div>

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
