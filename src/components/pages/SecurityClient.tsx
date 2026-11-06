"use client";

import { apiFetch, apiJson } from "@/lib/client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  IconShield,
  IconKey,
  IconFingerprint,
  IconSmartphone,
  IconAlert,
  IconCheck,
  IconSpinner,
  IconLogOut,
  IconClock,
} from "@/components/icons";
import { fmtDateTime } from "@/lib/format";

export function SecurityClient() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  // Form states
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [question, setQuestion] = useState("What was your first childhood pet?");
  const [answer, setAnswer] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [activeOtp, setActiveOtp] = useState<string | null>(null);

  const loadSecurity = async () => {
    setLoading(true);
    try {
      const res = await apiJson<any>("/api/security");
      setData(res);
    } catch (err) {
      toast("error", "Couldn't load security settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const toggle2FA = async (enable: boolean) => {
    setBusy("2fa");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "toggle_2fa", enabled: enable }),
      });
      toast("success", enable ? "Two-Factor Authentication activated." : "2FA deactivated.");
      loadSecurity();
    } catch (err) {
      toast("error", "Failed to update 2FA.");
    } finally {
      setBusy("");
    }
  };

  const toggleBiometrics = async (enable: boolean) => {
    setBusy("bio");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "toggle_biometrics", enabled: enable }),
      });
      toast("success", enable ? "Biometric authentication registered." : "Biometrics disabled.");
      loadSecurity();
    } catch (err) {
      toast("error", "Failed to toggle biometrics.");
    } finally {
      setBusy("");
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return toast("error", "PIN must be 4 digits.");
    if (pin !== confirmPin) return toast("error", "PINs do not match.");

    setBusy("pin");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "set_pin", pin }),
      });
      toast("success", "Transaction PIN configured.");
      setPin("");
      setConfirmPin("");
      loadSecurity();
    } catch (err) {
      toast("error", "Failed to save PIN.");
    } finally {
      setBusy("");
    }
  };

  const handleSetSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return toast("error", "Security answer required.");

    setBusy("question");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "set_security_question", question, answer }),
      });
      toast("success", "Security question and answer saved.");
      setAnswer("");
      loadSecurity();
    } catch (err) {
      toast("error", "Failed to save security question.");
    } finally {
      setBusy("");
    }
  };

  const requestDemoOtp = async () => {
    setBusy("otp_req");
    try {
      const res = await apiJson<any>("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "request_otp", purpose: "login_verification" }),
      });
      setActiveOtp(res.code);
      toast("info", `Verification Code sent: ${res.code}`);
    } catch (err) {
      toast("error", "Failed to generate OTP.");
    } finally {
      setBusy("");
    }
  };

  const verifyOtp = async () => {
    setBusy("otp_ver");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "verify_otp", code: otpCode, purpose: "login_verification" }),
      });
      toast("success", "OTP verification successful.");
      setOtpCode("");
      setActiveOtp(null);
    } catch (err) {
      toast("error", "Invalid or expired OTP.");
    } finally {
      setBusy("");
    }
  };

  const freezeAccount = async (lock: boolean) => {
    setBusy("freeze");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "freeze_account", locked: lock }),
      });
      toast("success", lock ? "Account locked and frozen against all debits." : "Account unlocked.");
      loadSecurity();
      window.dispatchEvent(new Event("meridian:banking-updated"));
    } catch (err) {
      toast("error", "Could not change account lock status.");
    } finally {
      setBusy("");
    }
  };

  const logoutAll = async () => {
    setBusy("logout_all");
    try {
      await apiJson("/api/security", {
        method: "POST",
        body: JSON.stringify({ action: "logout_all" }),
      });
      toast("success", "Signed out from all devices.");
      window.location.href = "/login";
    } catch (err) {
      toast("error", "Failed to terminate sessions.");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <IconSpinner size={24} className="text-brand" />
      </div>
    );
  }

  const s = data?.settings;

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-1 flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand">FORTIFIED PROTECTION</p>
          <span className="rounded-full bg-good-soft px-2 py-0.5 text-[9px] font-bold tracking-wider text-good">
            BANK GRADE
          </span>
        </div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight">Security Center</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Multi-factor authentication, biometric access, device management and session controls.
        </p>
      </header>

      {/* Account Lock Banner */}
      {s?.accountLocked && (
        <div className="flex items-center justify-between rounded-xl border border-rose/30 bg-rose-soft p-4 text-rose">
          <div className="flex items-center gap-3">
            <IconAlert size={20} className="shrink-0" />
            <div>
              <p className="font-bold text-sm">Account is Currently Frozen</p>
              <p className="text-xs">Outbound payments and transfer services are halted.</p>
            </div>
          </div>
          <button
            onClick={() => freezeAccount(false)}
            disabled={busy === "freeze"}
            className="btn-outline border-rose text-rose hover:bg-white text-xs py-1.5 px-3"
          >
            Unlock Account
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Two-Factor Authentication & Biometrics */}
        <section className="card p-5 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
              <IconShield size={18} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Two-Factor Authentication</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">2FA Security Layer</p>
              <p className="text-xs text-ink-soft">Requires secondary authorization for sensitive actions.</p>
            </div>
            <button
              onClick={() => toggle2FA(!s?.twoFactorEnabled)}
              disabled={busy === "2fa"}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                s?.twoFactorEnabled ? "bg-good-soft text-good border border-good/30" : "bg-line-soft text-ink-soft"
              }`}
            >
              {s?.twoFactorEnabled ? "Active" : "Disabled"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-line-soft">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <IconFingerprint size={16} className="text-brand" /> Biometric Authentication
              </p>
              <p className="text-xs text-ink-soft">Fingerprint & FaceID rapid sign-in confirmation.</p>
            </div>
            <button
              onClick={() => toggleBiometrics(!s?.biometricsEnabled)}
              disabled={busy === "bio"}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                s?.biometricsEnabled ? "bg-good-soft text-good border border-good/30" : "bg-line-soft text-ink-soft"
              }`}
            >
              {s?.biometricsEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          {/* OTP Verification Interactive Test */}
          <div className="rounded-xl bg-paper p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Instant OTP Simulator</p>
            <p className="text-xs text-ink-soft">Test one-time passcode verification for high-risk operations.</p>
            <div className="flex gap-2">
              <button
                onClick={requestDemoOtp}
                disabled={busy === "otp_req"}
                className="btn-outline py-1.5 px-3 text-xs"
              >
                {busy === "otp_req" ? <IconSpinner size={14} /> : "Request OTP"}
              </button>
              {activeOtp && (
                <div className="flex flex-1 gap-2">
                  <Input
                    placeholder="Enter code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="py-1.5 text-xs text-center font-mono"
                    maxLength={6}
                  />
                  <button onClick={verifyOtp} disabled={busy === "otp_ver"} className="btn-primary py-1.5 px-3 text-xs">
                    Verify
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. Transaction PIN */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
              <IconKey size={18} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Transaction PIN</h2>
          </div>

          <p className="text-xs text-ink-soft">
            A 4-digit security PIN required before any money transfer or external bill payment is authorized.
          </p>

          <form onSubmit={handleSetPin} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="4-digit PIN">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  className="text-center font-mono tracking-widest text-lg"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label="Confirm PIN">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  className="text-center font-mono tracking-widest text-lg"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
            <button className="btn-primary w-full py-2 text-xs" disabled={busy === "pin"}>
              {busy === "pin" ? <IconSpinner size={14} /> : "Save Transaction PIN"}
            </button>
          </form>
        </section>

        {/* 3. Security Questions */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
              <IconAlert size={18} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Security Question</h2>
          </div>

          <p className="text-xs text-ink-soft">
            Answer used for identity recovery if you are locked out or sign in from an untrusted browser.
          </p>

          <form onSubmit={handleSetSecurityQuestion} className="space-y-3">
            <Field label="Security Question">
              <Select value={question} onChange={(e) => setQuestion(e.target.value)} className="text-xs">
                <option value="What was your first childhood pet?">What was your first childhood pet?</option>
                <option value="What street did you grow up on?">What street did you grow up on?</option>
                <option value="What was the model of your first car?">What was the model of your first car?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              </Select>
            </Field>
            <Field label="Secret Answer">
              <Input
                required
                placeholder="Type your secret answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </Field>
            <button className="btn-outline w-full py-2 text-xs" disabled={busy === "question"}>
              {busy === "question" ? <IconSpinner size={14} /> : "Save Question & Answer"}
            </button>
          </form>
        </section>

        {/* 4. Freeze Account / Lock Controls */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-soft text-rose">
              <IconAlert size={18} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Emergency Lock & Freeze</h2>
          </div>

          <p className="text-xs leading-relaxed text-ink-soft">
            If you suspect unauthorized activity, immediately lock your account to freeze all debits, cards, and payments.
          </p>

          <div className="pt-2">
            {!s?.accountLocked ? (
              <button
                onClick={() => freezeAccount(true)}
                disabled={busy === "freeze"}
                className="btn-danger w-full py-2.5 text-xs font-semibold"
              >
                {busy === "freeze" ? <IconSpinner size={14} /> : "Freeze My Account Now"}
              </button>
            ) : (
              <button
                onClick={() => freezeAccount(false)}
                disabled={busy === "freeze"}
                className="btn-outline w-full py-2.5 text-xs font-semibold"
              >
                Reactivate & Unfreeze
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 5. Active Sessions & Devices */}
      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
              <IconSmartphone size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Active Sessions & Trusted Devices</h2>
              <p className="text-xs text-ink-soft">Devices currently signed into your Meridian account.</p>
            </div>
          </div>
          <button
            onClick={logoutAll}
            disabled={busy === "logout_all"}
            className="btn-outline text-rose hover:bg-rose-soft text-xs py-1.5 px-3"
          >
            <IconLogOut size={14} /> Logout All Devices
          </button>
        </div>

        <div className="divide-y divide-line-soft">
          {data?.sessions?.map((sess: any) => (
            <div key={sess.id} className="flex items-center justify-between py-3 text-xs">
              <div>
                <p className="font-semibold text-ink flex items-center gap-2">
                  <IconSmartphone size={14} className="text-brand" /> {sess.deviceName}
                </p>
                <p className="text-ink-faint mt-0.5">
                  IP: {sess.ipAddress} · Active: {fmtDateTime(sess.lastActiveAt)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-0.5 text-[10px] font-bold text-good">
                Active
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Recent Login Audit History */}
      <section className="card p-5 space-y-4">
        <div className="border-b border-line-soft pb-3">
          <h2 className="font-display text-base font-semibold text-ink">Login History & Alerts</h2>
          <p className="text-xs text-ink-soft">Audit record of recent sign-in events.</p>
        </div>

        <div className="divide-y divide-line-soft">
          {data?.history?.length === 0 ? (
            <p className="text-xs text-ink-faint py-4 text-center">No recent login events recorded.</p>
          ) : (
            data?.history?.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <p className="font-semibold text-ink flex items-center gap-2">
                    <IconClock size={13} className="text-ink-faint" /> {fmtDateTime(h.createdAt)}
                  </p>
                  <p className="text-ink-faint mt-0.5">
                    Location: {h.location} · IP: {h.ipAddress}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    h.status === "success" ? "bg-good-soft text-good" : "bg-rose-soft text-rose"
                  }`}
                >
                  {h.status.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
