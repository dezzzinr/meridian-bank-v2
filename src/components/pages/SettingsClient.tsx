"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch, apiJson } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Field, Select } from "@/components/ui/Field";
import {
  IconAlert,
  IconArrowUpRight,
  IconBell,
  IconCheck,
  IconClock,
  IconFileText,
  IconFingerprint,
  IconShield,
  IconSmartphone,
  IconSpinner,
  IconUser,
} from "@/components/icons";

type KycStatus = "not_started" | "pending" | "verified" | "rejected";
interface KycSettings {
  status: KycStatus;
  method: "document" | "support" | null;
  documentType: string | null;
  documentName: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  hasDocument: boolean;
}

export function SettingsClient() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kyc, setKyc] = useState<KycSettings | null>(null);
  const [documentType, setDocumentType] = useState("passport");
  const [file, setFile] = useState<File | null>(null);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [kycBusy, setKycBusy] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [security, setSecurity] = useState<any>(null);

  const loadKyc = async () => {
    const result = await apiJson<KycSettings>("/api/settings/verification");
    setKyc(result);
  };

  useEffect(() => {
    void Promise.all([
      loadKyc().catch(() => {}),
      apiJson<{ emailEnabled: boolean }>("/api/settings/notifications").then((value) => setEmailEnabled(value.emailEnabled)).catch(() => {}),
      apiJson<any>("/api/security").then(setSecurity).catch(() => {}),
    ]);
  }, []);

  const submitKyc = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return toast("error", "Choose a document to upload.");
    if (file.size > 1_500_000) return toast("error", "Choose a document smaller than 1.5 MB.");
    if (!profileConfirmed) return toast("error", "Confirm your profile details before submitting.");
    const form = new FormData();
    form.set("documentType", documentType);
    form.set("confirmProfileDetails", "true");
    form.set("document", file);
    setKycBusy(true);
    try {
      const response = await apiFetch("/api/settings/verification", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Couldn’t submit identity verification.");
      await loadKyc();
      setFile(null);
      setProfileConfirmed(false);
      if (fileRef.current) fileRef.current.value = "";
      toast("success", "Identity document submitted for review.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Couldn’t submit identity verification.");
    } finally {
      setKycBusy(false);
    }
  };

  const toggleEmail = async () => {
    setNotificationBusy(true);
    try {
      const result = await apiJson<{ emailEnabled: boolean }>("/api/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({ emailEnabled: !emailEnabled }),
      });
      setEmailEnabled(result.emailEnabled);
      toast("success", result.emailEnabled ? "Email notifications enabled." : "Email notifications paused.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Couldn’t update notification settings.");
    } finally {
      setNotificationBusy(false);
    }
  };

  const kycStatus = kyc?.status ?? "not_started";
  const kycStatusLabel = kycStatus === "verified" ? "Verified" : kycStatus === "pending" ? "Under review" : kycStatus === "rejected" ? "Update required" : "Not started";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand">ACCOUNT PREFERENCES</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage your profile, identity verification, security and notifications.</p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="card scroll-mt-24 p-5" id="profile-settings-overview">
          <div className="flex items-center gap-3 border-b border-line-soft pb-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-deep"><IconUser size={18}/></span><div><h2 className="font-display text-base font-semibold text-ink">Profile settings</h2><p className="text-xs text-ink-soft">Personal details, photo and password.</p></div></div>
          <div className="divide-y divide-line-soft">
            <SettingLink href="/app/profile#profile-settings" title="Personal details" detail="Name, profile photo and account email" icon={<IconUser size={16}/>} />
            <SettingLink href="/app/profile#password-settings" title="Password" detail="Change your sign-in password" icon={<IconShield size={16}/>} />
          </div>
        </section>

        <section className="card scroll-mt-24 p-5" id="kyc-verification">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#4c75ad]"><IconFileText size={18}/></span><div><h2 className="font-display text-base font-semibold text-ink">KYC verification</h2><p className="text-xs text-ink-soft">Verify your identity by document or with support.</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${kycStatus === "verified" ? "bg-good-soft text-good" : kycStatus === "pending" ? "bg-amber-soft text-amber" : kycStatus === "rejected" ? "bg-rose-soft text-rose" : "bg-line-soft text-ink-soft"}`}>{kycStatusLabel}</span></div>

          {kycStatus === "pending" ? <div className="mt-4 rounded-xl bg-amber-soft/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-amber"><IconClock size={16}/> Your document is under review</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">We’ll update your account when an administrator completes the review.</p>{kyc?.documentName && <p className="mt-2 text-[11px] text-ink-faint">Submitted: {kyc.documentName}</p>}</div> : kycStatus === "verified" ? <div className="mt-4 rounded-xl bg-good-soft/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-good"><IconCheck size={16}/> Your identity is verified</p><p className="mt-1 text-xs text-ink-soft">No further action is needed.</p></div> : <>
            {kyc?.status === "rejected" && <div className="mt-4 rounded-xl bg-rose-soft p-3 text-xs text-rose"><p className="flex items-center gap-1.5 font-semibold"><IconAlert size={14}/> Please update your submission</p>{kyc.reviewNote && <p className="mt-1">{kyc.reviewNote}</p>}</div>}
            <form onSubmit={submitKyc} className="mt-4 space-y-3">
              <Field label="Identity document"><Select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="passport">Passport</option><option value="national_id">National identity card</option><option value="drivers_license">Driver’s license</option><option value="residence_permit">Residence permit</option></Select></Field>
              <Field label="Upload a clear photo or PDF" hint="JPG, PNG or PDF · maximum 1.5 MB. Your document is only available to you and authorized administrators."><input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="input file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-deep" required /></Field>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft"><input type="checkbox" checked={profileConfirmed} onChange={(event) => setProfileConfirmed(event.target.checked)} className="mt-0.5 accent-brand"/> I confirm my profile details are accurate and this document belongs to me.</label>
              <button type="submit" disabled={kycBusy || !file || !profileConfirmed} className="btn-primary w-full">{kycBusy ? <IconSpinner size={15}/> : <IconFileText size={15}/>} Submit for review</button>
            </form>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-line-soft p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper text-ink-soft"><IconSmartphone size={16}/></span><div><p className="text-xs font-semibold text-ink">Prefer support-assisted verification?</p><p className="mt-1 text-[11px] leading-relaxed text-ink-soft">Contact the support team to arrange a secure review. Don’t send identity documents in chat or email.</p><Link href="/contact" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">Contact support <IconArrowUpRight size={12}/></Link></div></div>
          </>}
        </section>

        <section className="card scroll-mt-24 p-5" id="security-settings">
          <div className="flex items-center gap-3 border-b border-line-soft pb-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-deep"><IconShield size={18}/></span><div><h2 className="font-display text-base font-semibold text-ink">Security settings</h2><p className="text-xs text-ink-soft">Protect sign-in and review active devices.</p></div></div>
          <div className="divide-y divide-line-soft">
            <SecurityLink href="/app/profile#password-settings" title="Password" detail="Update your account password" icon={<IconShield size={16}/>} status="Manage" />
            <SecurityLink href="/app/security#two-factor-settings" title="Two-factor authentication" detail="Add a second sign-in security step" icon={<IconShield size={16}/>} status={security?.settings?.twoFactorEnabled ? "Enabled" : "Review"} active={Boolean(security?.settings?.twoFactorEnabled)} />
            <SecurityLink href="/app/security#biometrics-settings" title="Biometric login" detail="Fingerprint or face sign-in setting" icon={<IconFingerprint size={16}/>} status={security?.settings?.biometricsEnabled ? "Enabled" : "Review"} active={Boolean(security?.settings?.biometricsEnabled)} />
            <SecurityLink href="/app/security#active-sessions" title="Active sessions" detail={`${security?.sessions?.length ?? "—"} signed-in device sessions`} icon={<IconSmartphone size={16}/>} status="Review" />
          </div>
        </section>

        <section className="card scroll-mt-24 p-5" id="notification-settings">
          <div className="flex items-center gap-3 border-b border-line-soft pb-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff3de] text-[#ad7924]"><IconBell size={18}/></span><div><h2 className="font-display text-base font-semibold text-ink">Notification settings</h2><p className="text-xs text-ink-soft">Choose how you receive account updates.</p></div></div>
          <div className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold text-ink">Email notifications</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">Payment, account and service updates sent to your sign-in email.</p></div><button type="button" role="switch" aria-checked={emailEnabled} aria-label="Email notifications" disabled={notificationBusy} onClick={toggleEmail} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${emailEnabled ? "bg-brand" : "bg-[#cbd1cc]"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${emailEnabled ? "left-[22px]" : "left-0.5"}`}/></button></div>
          <div className="flex items-center justify-between border-t border-line-soft pt-4"><div><p className="text-sm font-semibold text-ink">In-app notifications</p><p className="mt-1 text-xs text-ink-soft">Always on for account and security activity.</p></div><span className="rounded-full bg-good-soft px-2.5 py-1 text-[10px] font-semibold text-good">On</span></div>
          <Link href="/app/notifications" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">Open notification centre <IconArrowUpRight size={12}/></Link>
        </section>
      </div>
    </div>
  );
}

function SettingLink({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: ReactNode }) {
  return <Link href={href} className="flex items-center gap-3 py-3 transition hover:text-brand"><span className="text-ink-soft">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink">{title}</span><span className="mt-0.5 block text-[11px] text-ink-soft">{detail}</span></span><IconArrowUpRight size={13} className="text-ink-faint"/></Link>;
}

function SecurityLink({ href, title, detail, icon, status, active = false }: { href: string; title: string; detail: string; icon: ReactNode; status: string; active?: boolean }) {
  return <Link href={href} className="flex items-center gap-3 py-3 transition hover:text-brand"><span className="text-ink-soft">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink">{title}</span><span className="mt-0.5 block text-[11px] text-ink-soft">{detail}</span></span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${active ? "bg-good-soft text-good" : "bg-line-soft text-ink-soft"}`}>{status}</span><IconArrowUpRight size={13} className="text-ink-faint"/></Link>;
}
