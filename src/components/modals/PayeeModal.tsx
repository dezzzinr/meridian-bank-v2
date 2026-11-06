"use client";

import { apiFetch } from "@/lib/client";
import { useEffect, useState } from "react";
import type { PayeeDTO } from "@/lib/queries";
import { METHOD_LABELS } from "@/lib/format";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { IconSpinner } from "../icons";

export function PayeeModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: PayeeDTO | null;
  onSaved: (p: PayeeDTO) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [methodType, setMethodType] = useState<"bank" | "email" | "mobile">("bank");
  const [methodDetail, setMethodDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMethodType(initial?.methodType ?? "bank");
      setMethodDetail(initial?.methodDetail ?? "");
      setNotes(initial?.notes ?? "");
      setErr(null);
      setLoading(false);
    }
  }, [open, initial]);

  const detailPlaceholder =
    methodType === "bank"
      ? "e.g. 1004558830 (account number)"
      : methodType === "email"
        ? "e.g. jordan@example.com"
        : "e.g. +1 555 0142";

  const submit = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    if (!methodDetail.trim()) {
      setErr("Add the " + METHOD_LABELS[methodType].toLowerCase() + " to pay.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(
        initial ? `/api/payees/${initial.id}` : "/api/payees",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            methodType,
            methodDetail: methodDetail.trim(),
            notes: notes.trim(),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save the payee.");
      toast("success", initial ? "Payee updated." : "Payee added.");
      onSaved(data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the payee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit payee" : "Add a payee"}
      subtitle="Save the people and businesses you pay regularly."
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan Ellis"
            maxLength={60}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Method">
            <Select
              value={methodType}
              onChange={(e) =>
                setMethodType(e.target.value as "bank" | "email" | "mobile")
              }
            >
              <option value="bank">Bank account</option>
              <option value="email">Email</option>
              <option value="mobile">Mobile</option>
            </Select>
          </Field>
          <Field label={METHOD_LABELS[methodType]}>
            <Input
              value={methodDetail}
              onChange={(e) => setMethodDetail(e.target.value)}
              placeholder={detailPlaceholder}
              maxLength={80}
            />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember"
            maxLength={140}
          />
        </Field>

        {err && (
          <p className="rounded-lg bg-rose-soft px-3 py-2.5 text-xs font-semibold text-rose">
            {err}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading && <IconSpinner size={15} />}
            {initial ? "Save changes" : "Add payee"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
