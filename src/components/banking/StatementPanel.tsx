"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiJson } from "@/lib/client";
import { money } from "@/lib/format";
import type { AccountDTO } from "@/lib/queries";
import type { StatementDTO } from "@/lib/banking";
import { useToast } from "../ui/Toast";
import { BankIcon } from "./BankIcon";
import { IconSpinner } from "../icons";

export function StatementPanel({ account }: { account: AccountDTO }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const [data, setData] = useState<StatementDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const toast = useToast();
  const url = `/api/accounts/${account.id}/statements?from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const result = await apiJson<StatementDTO>(url, { signal }); if (!signal?.aborted) setData(result); }
    catch (e) { if (!signal?.aborted) { setError(e instanceof Error ? e.message : "Couldn't load statement."); setData(null); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [url]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const download = async (format: "pdf" | "csv") => {
    setDownloading(format);
    try {
      const response = await apiFetch(`${url}&format=${format}`);
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? "Download failed."); }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = objectUrl;
      anchor.download = `meridian-${account.id}-${period.from}-${period.to}.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      toast("success", `${format.toUpperCase()} statement downloaded.`);
    } catch (e) { toast("error", e instanceof Error ? e.message : "Download failed."); }
    finally { setDownloading(""); }
  };
  return <div className="space-y-5">
    <form onSubmit={(e) => { e.preventDefault(); setPeriod({ from, to }); if (from === period.from && to === period.to) void load(); }} className="flex flex-wrap items-end gap-3 rounded-xl bg-paper p-4">
      <label className="flex-1 text-xs font-semibold text-ink-soft">From<input aria-label="Statement start date" type="date" className="input mt-1.5" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} required /></label>
      <label className="flex-1 text-xs font-semibold text-ink-soft">To<input aria-label="Statement end date" type="date" className="input mt-1.5" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} required /></label>
      <button className="btn-primary" disabled={loading}>{loading ? <IconSpinner size={16} /> : <BankIcon name="document" size={16} />} View statement</button>
    </form>
    {error && <div role="alert" className="rounded-lg bg-rose-soft p-4 text-sm text-rose">{error}<button onClick={() => void load()} className="ml-2 font-semibold underline">Retry</button></div>}
    {loading ? <div className="h-44 animate-pulse rounded-xl bg-line-soft" /> : data && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-base font-semibold">Statement preview</h3><p className="mt-1 text-xs text-ink-faint">{data.from} — {data.to} · {account.currency} · UTC</p></div><div className="flex gap-2">{(["pdf", "csv"] as const).map((format) => <button key={format} disabled={Boolean(downloading)} className="btn-outline px-3 py-2 text-xs" onClick={() => void download(format)}>{downloading === format ? <IconSpinner size={14} /> : <BankIcon name="download" size={14} />}{format.toUpperCase()}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Opening", data.openingCents], ["Money in", data.incomingCents], ["Money out", data.outgoingCents], ["Closing", data.closingCents]].map(([label, value]) => <div key={label} className="rounded-lg border border-line p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</p><p className="mt-1 font-display text-sm font-semibold">{money(Number(value), account.currency)}</p></div>)}</div>
      <div className="max-h-80 overflow-auto rounded-xl border border-line"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-paper text-ink-soft"><tr><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold">Description</th><th className="p-3 text-right font-semibold">Amount</th><th className="p-3 text-right font-semibold">Balance</th></tr></thead><tbody className="divide-y divide-line-soft">{data.rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap p-3 text-ink-faint">{r.date.slice(0, 10)}</td><td className="min-w-40 p-3"><p className="font-medium">{r.description}</p><p className="mt-1 capitalize text-ink-faint">{r.status}</p></td><td className={`whitespace-nowrap p-3 text-right font-semibold ${r.amountCents > 0 ? "text-good" : ""}`}>{money(r.amountCents, account.currency)}</td><td className="whitespace-nowrap p-3 text-right">{money(r.balanceCents, account.currency)}</td></tr>)}{!data.rows.length && <tr><td colSpan={4} className="p-10 text-center text-ink-faint">No transactions in this period.</td></tr>}</tbody></table></div>
      <p className="text-xs leading-relaxed text-ink-faint">Official e-Statement. Balances reflect verified available funds; pending entries are included and voided entries excluded. Downloads contain all {data.rows.length} entries in this period.</p>
    </>}
  </div>;
}
