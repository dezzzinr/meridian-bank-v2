import type { CardDTO } from "@/lib/banking";
import { BankIcon } from "./BankIcon";

export function CardFace({ card, revealed }: { card: CardDTO; revealed?: string | null }) {
  const muted = ["frozen", "closed", "replaced"].includes(card.status);
  const number = revealed ? revealed.match(/.{1,4}/g)?.join("  ") : `••••  ••••  ••••  ${card.last4}`;
  return <div className={`relative isolate flex aspect-[1.62] w-full sm:aspect-[1.7] flex-col justify-between overflow-hidden rounded-[22px] p-5 text-white shadow-[0_18px_45px_-20px_rgba(12,65,47,.55)] transition-all sm:p-7 ${muted ? "bg-[#34473f]" : card.kind === "physical" ? "bg-[#182c26]" : "bg-[#0b5744]"}`}>
    <div className="pointer-events-none absolute -right-[32%] -top-[80%] h-[220%] w-[100%] -rotate-12 rounded-[50%] border-[35px] border-white/[.045]" />
    <div className="pointer-events-none absolute -bottom-[83%] -right-[15%] h-[220%] w-[96%] -rotate-12 rounded-[50%] border border-white/10" />
    <div className="pointer-events-none absolute bottom-[-62%] right-[-9%] h-[200%] w-[80%] -rotate-12 rounded-[50%] border border-white/10" />
    <div className="relative flex items-center justify-between"><span className="flex items-center gap-2 font-display text-xl font-medium tracking-tight"><BankIcon name="globe" size={25} />Meridian</span><span className="rounded-full border border-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.17em]">{card.kind} · {card.currency}</span></div>
    <div className="relative mt-5 flex items-center justify-between"><svg width="37" height="29" viewBox="0 0 37 29" aria-hidden><rect x=".5" y=".5" width="36" height="28" rx="6" fill="#d6cfac" stroke="#b1a77d" /><path d="M12 1v7L6 10v9l6 3v7M25 1v7l6 2v9l-6 3v7M12 8h13M12 22h13M1 14h5M31 14h6M12 8v14M25 8v14" stroke="#9e9265" fill="none" /></svg><BankIcon name="contactless" size={24} className="text-white/60" /></div>
    <p className="relative my-3 whitespace-nowrap font-mono text-base tracking-[.1em] sm:text-[23px]" aria-label={revealed ? "Revealed card number" : `Card ending ${card.last4}`}>{number}</p>
    <div className="relative flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-[8px] uppercase tracking-[.16em] text-white/45">Cardholder</p><p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[.12em]">{card.holderName}</p></div><div><p className="text-[8px] uppercase tracking-wider text-white/45">Expires</p><p className="mt-1 font-mono text-xs">{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</p></div><div className="text-right"><p className="font-display text-base font-medium italic tracking-wider">DEBIT</p><p className="text-[8px] tracking-wider text-white/45">PLATINUM DEBIT</p></div></div>
  </div>;
}
