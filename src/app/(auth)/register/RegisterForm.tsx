"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, getToken, setToken } from "@/lib/client";
import { ACCOUNT_LABELS, ACCOUNT_TYPE_GROUPS, ACCOUNT_TYPES, TERM_RATES, type AccountType } from "@/lib/banking";
import { CURRENCIES } from "@/lib/currency";
import { Field, Input, Select } from "@/components/ui/Field";
import { IconSpinner } from "@/components/icons";

const countryCodes: Record<string, string> = { US: "United States", GB: "United Kingdom", NG: "Nigeria", KE: "Kenya", GH: "Ghana", ZA: "South Africa", IN: "India", CA: "Canada", AU: "Australia", JP: "Japan", BR: "Brazil", AT: "Austria", BE: "Belgium", HR: "Croatia", CY: "Cyprus", EE: "Estonia", FI: "Finland", FR: "France", DE: "Germany", GR: "Greece", IE: "Ireland", IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg", MT: "Malta", NL: "Netherlands", PT: "Portugal", SK: "Slovakia", SI: "Slovenia", ES: "Spain" };
const euroCountries = ["Austria", "Belgium", "Croatia", "Cyprus", "Estonia", "Finland", "France", "Germany", "Greece", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Portugal", "Slovakia", "Slovenia", "Spain"];
const countries = [...CURRENCIES.filter((item) => item.region !== "Eurozone").map((item) => item.region), ...euroCountries].sort();
const currencyForCountry: Record<string, string> = { "United States": "USD", "United Kingdom": "GBP", Nigeria: "NGN", Kenya: "KES", Ghana: "GHS", "South Africa": "ZAR", India: "INR", Canada: "CAD", Australia: "AUD", Japan: "JPY", Brazil: "BRL", ...Object.fromEntries(euroCountries.map((name) => [name, "EUR"])) };

export function RegisterForm() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [currency, setCurrency] = useState("GBP");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [accountCurrency, setAccountCurrency] = useState("GBP");
  const [initialDeposit, setInitialDeposit] = useState("0");
  const [termMonths, setTermMonths] = useState(6);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accountOptions = useMemo<AccountType[]>(() => ACCOUNT_TYPES.filter((type) => type !== "joint"), []);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const region = new Intl.Locale(navigator.language).region;
      const detected = countryCodes[region ?? ""];
      if (detected) { setCountry(detected); const code = currencyForCountry[detected]; setCurrency(code); setAccountCurrency(code); }
    }
    if (!getToken()) return;
    apiFetch("/api/auth/me").then((r) => { if (r.ok) window.location.replace("/app"); }).catch(() => {});
  }, []);

  const selectCountry = (value: string) => {
    setCountry(value);
    const suggestedCurrency = currencyForCountry[value];
    if (suggestedCurrency) { setCurrency(suggestedCurrency); setAccountCurrency(suggestedCurrency); }
  };

  const continueStep = (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) return setErr("Enter your first and last name.");
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter a valid email address.");
      if (!/^\+?[\d\s().-]{7,32}$/.test(phone)) return setErr("Enter a valid phone number.");
      const birth = new Date(`${dateOfBirth}T00:00:00`);
      const age = (Date.now() - birth.getTime()) / (365.2425 * 86400000);
      if (!dateOfBirth || !Number.isFinite(birth.getTime()) || age < 18 || age > 120) return setErr("You must be at least 18 and enter a valid date of birth.");
      if (password.length < 8) return setErr("Password must be at least 8 characters.");
      if (password !== confirmPassword) return setErr("Your passwords do not match.");
    }
    if (step === 2 && (!addressLine.trim() || !city.trim() || !postalCode.trim())) return setErr("Complete all address details.");
    setStep((current) => Math.min(current + 1, 3));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const res = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ firstName, lastName, email, phone, dateOfBirth, password, country, currency, addressLine, city, postalCode, accountType, accountCurrency, initialDeposit, termMonths }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setToken(data.token as string); window.location.href = "/app";
    } catch (error) { setErr(error instanceof Error ? error.message : "Something went wrong."); setBusy(false); }
  };

  return <div className="animate-rise">
    <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Open your Meridian account</h2>
    <p className="mt-1.5 text-sm text-ink-soft">A few details to get your account ready.</p>
    <div className="mt-6 flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {["Your details", "Your address", "Your account"].map((label, index) => <div key={label} className="flex flex-1 items-center gap-2">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step >= index + 1 ? "bg-brand text-white" : "bg-line-soft text-ink-faint"}`}>{index + 1}</span>
        <span className={`hidden text-[11px] font-semibold sm:block ${step === index + 1 ? "text-ink" : "text-ink-faint"}`}>{label}</span>
        {index < 2 && <span className="h-px flex-1 bg-line" />}
      </div>)}
    </div>

    {step === 1 && <form onSubmit={continueStep} className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3"><Field label="First name"><Input required autoComplete="given-name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field><Field label="Last name"><Input required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field></div>
      <Field label="Country"><Select required value={country} onChange={(e) => selectCountry(e.target.value)}>{countries.map((name) => <option key={name} value={name}>{name}</option>)}</Select></Field>
      <Field label="Account currency" hint="Suggested from your country. You can change it here."><Select value={currency} onChange={(e) => { setCurrency(e.target.value); setAccountCurrency(e.target.value); }}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</Select></Field>
      <Field label="Phone number"><Input type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" /></Field>
      <Field label="Email"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
      <Field label="Date of birth"><Input type="date" required autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></Field>
      <Field label="Password" hint="At least 8 characters."><Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Confirm password"><Input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
      {err && <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">{err}</p>}
      <button className="btn-primary w-full">Continue</button>
    </form>}

    {step === 2 && <form onSubmit={continueStep} className="mt-6 space-y-4">
      <p className="text-sm text-ink-soft">Where should we register your account?</p>
      <Field label="Address"><Input required autoComplete="street-address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House number and street" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="City or town"><Input required autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} /></Field><Field label="Postal code"><Input required autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></Field></div>
      <Field label="Country"><Input value={country} disabled /></Field>
      {err && <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">{err}</p>}
      <div className="flex gap-3"><button type="button" className="btn-outline flex-1" onClick={() => { setErr(null); setStep(1); }}>Back</button><button className="btn-primary flex-1">Continue</button></div>
    </form>}

    {step === 3 && <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Account type"><Select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>{ACCOUNT_TYPE_GROUPS.map((group) => <optgroup key={group.title} label={group.title}>{group.types.filter((type) => accountOptions.includes(type)).map((type) => <option key={type} value={type}>{ACCOUNT_LABELS[type]}</option>)}</optgroup>)}</Select></Field>
      <Field label="Account currency"><Select value={accountCurrency} onChange={(e) => setAccountCurrency(e.target.value)}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</Select></Field>
      <Field label={`Initial deposit (${accountCurrency})`} hint="You can start with no deposit and add money later."><Input inputMode="decimal" required value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} placeholder={accountCurrency === "JPY" ? "0" : "0.00"} /></Field>
      {accountType === "fixed_deposit" && <Field label="Deposit term"><Select value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))}>{[3, 6, 12].map((months) => <option key={months} value={months}>{months} months · {(TERM_RATES[months] / 100).toFixed(2)}% indicative p.a.</option>)}</Select></Field>}
      {err && <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">{err}</p>}
      <div className="flex gap-3"><button type="button" className="btn-outline flex-1" disabled={busy} onClick={() => { setErr(null); setStep(2); }}>Back</button><button type="submit" className="btn-primary flex-1" disabled={busy}>{busy && <IconSpinner size={15} />}{busy ? "Opening account…" : "Open account"}</button></div>
    </form>}
    <p className="mt-6 text-center text-sm text-ink-soft">Already banking with Meridian? <Link href="/login" className="font-semibold text-brand transition hover:text-brand-deep">Sign in</Link></p>
  </div>;
}
