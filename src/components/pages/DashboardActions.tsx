"use client";
import { useState } from "react";
import type { AccountDTO } from "@/lib/queries";
import { isTermLocked } from "@/lib/banking";
import { useCurrentUser } from "../CurrencyContext";
import { OpenAccountModal } from "../modals/OpenAccountModal";
import { NewTransferModal } from "../modals/NewTransferModal";
import { IconPlus, IconSend } from "../icons";
export function DashboardActions({ accounts, onboarding }: { accounts: AccountDTO[]; onboarding: boolean }) {
  const { user } = useCurrentUser();
  const [transferOpen, setTransferOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  return <>
    <div className="flex gap-2"><button className={onboarding ? "btn-primary" : "btn-outline"} disabled={user.status !== "active"} onClick={() => setAccountOpen(true)}><IconPlus size={16} />{onboarding ? "Open your first account" : "Open account"}</button>{!onboarding && <button className="btn-primary" onClick={() => setTransferOpen(true)} disabled={user.status !== "active" || !accounts.some((a) => !isTermLocked(a))}><IconSend size={15} />Send money</button>}</div>
    <OpenAccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    <NewTransferModal accounts={accounts} open={transferOpen} onClose={() => setTransferOpen(false)} />
  </>;
}
