"use client";

import { useState, useEffect } from "react";
import { apiJson } from "@/lib/client";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { IconQrCode, IconSmartphone, IconSend, IconCheck, IconSpinner, IconWallet } from "../icons";
import { money } from "@/lib/format";
import type { AccountDTO } from "@/lib/queries";

export function MobileBankingModals({ accounts }: { accounts: AccountDTO[] }) {
  const { user } = useCurrentUser();
  const toast = useToast();

  const [activeModal, setActiveModal] = useState<"qr_scan" | "my_qr" | "mobile_money" | null>(null);
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || 0);

  // QR state
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  const [scannedInput, setScannedInput] = useState("");
  const [qrAmount, setQrAmount] = useState("");

  // Mobile money state
  const [mmProvider, setMmProvider] = useState("M-Pesa");
  const [mmPhone, setMmPhone] = useState("");
  const [mmAmount, setMmAmount] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const eligible = accounts.filter((a) => !a.closedAt);

  useEffect(() => {
    if (accounts.length && !selectedAccId) {
      setSelectedAccId(accounts[0].id);
    }
  }, [accounts, selectedAccId]);

  const handleGenerateQr = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await apiJson<any>("/api/mobile", {
        method: "POST",
        body: JSON.stringify({ mode: "generate_qr", accountId: selectedAccId }),
      });
      setGeneratedQr(res.qrCode);
      setActiveModal("my_qr");
    } catch (err: any) {
      toast("error", err.message || "Failed to generate QR code.");
    } finally {
      setBusy(false);
    }
  };

  const handlePayScannedQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await apiJson<any>("/api/mobile", {
        method: "POST",
        body: JSON.stringify({
          mode: "pay_qr",
          sourceAccountId: selectedAccId,
          qrData: scannedInput,
          amount: qrAmount,
        }),
      });
      toast("success", `QR payment completed. Ref: ${res.reference}`);
      setActiveModal(null);
      setScannedInput("");
      setQrAmount("");
      window.dispatchEvent(new Event("meridian:banking-updated"));
    } catch (err: any) {
      setError(err.message || "Could not process QR payment.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendMobileMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await apiJson<any>("/api/mobile", {
        method: "POST",
        body: JSON.stringify({
          mode: "mobile_money",
          sourceAccountId: selectedAccId,
          provider: mmProvider,
          phone: mmPhone,
          amount: mmAmount,
        }),
      });
      toast("success", `Mobile money transferred to ${mmPhone}. Ref: ${res.reference}`);
      setActiveModal(null);
      setMmPhone("");
      setMmAmount("");
      window.dispatchEvent(new Event("meridian:banking-updated"));
    } catch (err: any) {
      setError(err.message || "Mobile money dispatch failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Mobile Banking Action Hub Bar */}
      <div className="card p-4 bg-gradient-to-r from-card to-paper/80 border-line">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <IconSmartphone size={20} />
            </span>
            <div>
              <h3 className="font-display font-semibold text-sm text-ink">Mobile Banking Hub</h3>
              <p className="text-xs text-ink-soft">Scan-to-pay, generate your account QR, or dispatch mobile money.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setError("");
                setActiveModal("qr_scan");
              }}
              className="btn-outline text-xs py-2 px-3"
            >
              <IconQrCode size={15} /> Scan QR
            </button>
            <button
              onClick={handleGenerateQr}
              disabled={busy}
              className="btn-outline text-xs py-2 px-3"
            >
              <IconQrCode size={15} /> My QR Code
            </button>
            <button
              onClick={() => {
                setError("");
                setActiveModal("mobile_money");
              }}
              className="btn-primary text-xs py-2 px-3"
            >
              <IconSmartphone size={15} /> Mobile Money
            </button>
          </div>
        </div>
      </div>

      {/* 1. Modal: Show My Account QR */}
      <Modal
        open={activeModal === "my_qr"}
        onClose={() => setActiveModal(null)}
        title="Receive via QR Code"
        subtitle="Others can scan this to pay directly into your chosen account."
      >
        <div className="space-y-4 text-center">
          <Field label="Receiving Account">
            <Select
              value={selectedAccId}
              onChange={(e) => {
                setSelectedAccId(Number(e.target.value));
              }}
              className="text-xs"
            >
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency}) - {a.accountNumber}
                </option>
              ))}
            </Select>
          </Field>

          {generatedQr && (
            <div className="mx-auto flex flex-col items-center justify-center rounded-2xl border border-line bg-white p-6 shadow-sm">
              {/* Authentic stylized SVG QR visualization */}
              <div className="relative flex h-48 w-48 items-center justify-center rounded-xl bg-paper p-3 border-2 border-brand/20">
                <IconQrCode size={120} className="text-brand" />
              </div>
              <p className="mt-3 font-mono text-xs font-bold text-ink tracking-wider">
                {accounts.find((a) => a.id === selectedAccId)?.accountNumber}
              </p>
              <p className="text-[11px] text-ink-faint">Authorized Meridian QR Code</p>
            </div>
          )}

          <button
            onClick={() => {
              if (generatedQr) {
                navigator.clipboard.writeText(generatedQr);
                toast("success", "QR code raw data copied to clipboard.");
              }
            }}
            className="btn-outline w-full py-2 text-xs"
          >
            Copy QR Data Payload
          </button>
        </div>
      </Modal>

      {/* 2. Modal: Scan QR & Pay */}
      <Modal
        open={activeModal === "qr_scan"}
        onClose={() => setActiveModal(null)}
        title="Scan & Pay with QR"
        subtitle="Paste scanned QR code payload to instantly verify and debit."
      >
        <form onSubmit={handlePayScannedQr} className="space-y-4">
          <Field label="Debiting Account">
            <Select
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(Number(e.target.value))}
              className="text-xs"
              required
            >
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {money(a.balanceCents, a.currency)} ({a.currency})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Paste Scanned QR Code Data" hint="Use camera scanner or paste merchant payload.">
            <textarea
              required
              rows={3}
              placeholder="e.g. eyJiYW5rIjoiTWVyaWRpYW4iLCJhY2NvdW50TnVtYmVyIjoiTVIyMC4uIn0="
              value={scannedInput}
              onChange={(e) => setScannedInput(e.target.value)}
              className="input text-xs font-mono resize-none"
            />
          </Field>

          <Field label="Payment Amount">
            <Input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={qrAmount}
              onChange={(e) => setQrAmount(e.target.value)}
            />
          </Field>

          {error && <p className="text-xs text-rose font-medium">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveModal(null)} className="btn-outline flex-1 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 text-xs">
              {busy ? <IconSpinner size={14} /> : "Authorize QR Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Mobile Money Transfer */}
      <Modal
        open={activeModal === "mobile_money"}
        onClose={() => setActiveModal(null)}
        title="Mobile Money Dispatch"
        subtitle="Instant mobile wallet transfer to M-Pesa, MTN Mobile Money, Airtel, or Orange."
      >
        <form onSubmit={handleSendMobileMoney} className="space-y-4">
          <Field label="Debiting Account">
            <Select
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(Number(e.target.value))}
              className="text-xs"
              required
            >
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {money(a.balanceCents, a.currency)} ({a.currency})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile Money Network">
              <Select value={mmProvider} onChange={(e) => setMmProvider(e.target.value)} className="text-xs">
                <option value="M-Pesa">M-Pesa</option>
                <option value="MTN Mobile Money">MTN MoMo</option>
                <option value="Airtel Money">Airtel Money</option>
                <option value="Orange Money">Orange Money</option>
              </Select>
            </Field>

            <Field label="Mobile Phone Number">
              <Input
                required
                placeholder="+254 712 345678"
                value={mmPhone}
                onChange={(e) => setMmPhone(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Amount to Transfer">
            <Input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={mmAmount}
              onChange={(e) => setMmAmount(e.target.value)}
            />
          </Field>

          {error && <p className="text-xs text-rose font-medium">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveModal(null)} className="btn-outline flex-1 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 text-xs">
              {busy ? <IconSpinner size={14} /> : "Dispatch Mobile Money"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
