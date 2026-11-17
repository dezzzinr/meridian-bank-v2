"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Field, Input } from "@/components/ui/Field";
import { IconCheck, IconFileText, IconSpinner, IconX } from "@/components/icons";

interface KycRecord { id: number; name: string; email: string; status: string; method: string | null; documentType: string | null; documentName: string | null; submittedAt: string | null; reviewNote: string | null }
interface KycDetail extends KycRecord { documentData: string | null }

export function KycReviewClient() {
  const toast = useToast();
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [selected, setSelected] = useState<KycDetail | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const response = await apiJson<{ records: KycRecord[] }>("/api/admin/kyc"); setRecords(response.records); }
    catch { toast("error", "Couldn’t load identity verification submissions."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const selectRecord = async (record: KycRecord) => {
    try { const detail = await apiJson<KycDetail>(`/api/admin/kyc/${record.id}`); setSelected(detail); setNote(detail.reviewNote ?? ""); }
    catch (error) { toast("error", error instanceof Error ? error.message : "Couldn’t open the submission."); }
  };

  const review = async (status: "verified" | "rejected") => {
    if (!selected) return;
    if (status === "rejected" && !note.trim()) return toast("error", "Add a note explaining what the customer needs to update.");
    setBusy(true);
    try {
      await apiJson(`/api/admin/kyc/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status, reviewNote: note.trim() || null }) });
      toast("success", status === "verified" ? "Identity verified." : "Verification returned for update.");
      setSelected(null);
      await load();
    } catch (error) { toast("error", error instanceof Error ? error.message : "Couldn’t save the review."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <header><p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand">ACCOUNT OPERATIONS</p><h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">KYC review</h1><p className="mt-1 text-sm text-ink-soft">Review identity documents submitted by customers.</p></header>
    <div className="grid items-start gap-5 xl:grid-cols-12">
      <section className="card overflow-hidden xl:col-span-5"><div className="border-b border-line-soft px-4 py-3"><h2 className="font-display text-sm font-semibold text-ink">Submissions</h2></div>{loading ? <p className="p-5 text-sm text-ink-soft">Loading submissions…</p> : records.length ? <div className="divide-y divide-line-soft">{records.map((record) => <button key={record.id} onClick={() => void selectRecord(record)} className={`w-full px-4 py-3 text-left transition hover:bg-paper ${selected?.id === record.id ? "bg-brand-soft/40" : ""}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{record.name}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${record.status === "verified" ? "bg-good-soft text-good" : record.status === "pending" ? "bg-amber-soft text-amber" : "bg-rose-soft text-rose"}`}>{record.status.replaceAll("_", " ")}</span></span><span className="mt-1 block truncate text-xs text-ink-soft">{record.email} · {record.documentType?.replaceAll("_", " ") ?? "Support-assisted"}</span></button>)}</div> : <p className="p-8 text-center text-sm text-ink-soft">No KYC submissions yet.</p>}</section>
      <section className="card min-w-0 p-4 sm:p-5 xl:col-span-7">{!selected ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><IconFileText size={24} className="text-ink-faint"/><p className="mt-3 text-sm font-semibold text-ink">Select a submission</p><p className="mt-1 text-xs text-ink-soft">Customer documents are only loaded after an authorized admin opens a review.</p></div> : <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold text-ink">{selected.name}</h2><p className="text-xs text-ink-soft">{selected.email} · {selected.documentType?.replaceAll("_", " ")}</p><p className="mt-1 text-[10px] text-ink-faint">{selected.documentName}</p></div><span className="rounded-full bg-amber-soft px-2.5 py-1 text-[10px] font-semibold text-amber">{selected.status.replaceAll("_", " ")}</span></div>
        {selected.documentData?.startsWith("data:image/") ? <img src={selected.documentData} alt={`Identity document submitted by ${selected.name}`} className="max-h-[520px] w-full rounded-xl border border-line-soft bg-paper object-contain"/> : selected.documentData?.startsWith("data:application/pdf") ? <iframe src={selected.documentData} title={`Identity document submitted by ${selected.name}`} className="h-[520px] w-full rounded-xl border border-line-soft bg-paper"/> : <div className="rounded-xl bg-paper p-8 text-center text-sm text-ink-soft">This submission has no uploaded document. Contact the customer to arrange support-assisted verification.</div>}
        <Field label="Review note" hint="Required when returning a document for an update."><Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Explain what needs to be updated…"/></Field>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy || selected.status !== "pending"} onClick={() => void review("verified")} className="btn-primary flex-1 disabled:opacity-50">{busy ? <IconSpinner size={14}/> : <IconCheck size={14}/>} Approve verification</button><button type="button" disabled={busy || selected.status !== "pending"} onClick={() => void review("rejected")} className="btn-outline flex-1 text-rose disabled:opacity-50"><IconX size={14}/> Return for update</button></div>
      </div>}</section>
    </div>
  </div>;
}
