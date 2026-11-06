import type { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/shell/PublicSite";
import { IconChevronDown, IconCircleHelp } from "@/components/icons";
export const metadata: Metadata = { title: "Frequently asked questions | Meridian" };
const faq = [
  ["How do I open an account?", "Choose Get started and follow the registration steps. You’ll be asked for your name, email address and a password."],
  ["Where can I see my balance and recent activity?", "Sign in to your dashboard for an overview of your accounts and recent activity. Open Activity to search and review transactions."],
  ["Can I manage more than one account?", "The Accounts area brings your available accounts together and lets you manage the account options offered to you."],
  ["How do I send a payment?", "Go to Payments, select the relevant account and follow the instructions. Review the recipient and amount carefully before confirming."],
  ["Can I save a recipient for next time?", "Yes. Use Payees to add and manage saved payment recipients."],
  ["How can I manage my card?", "Open Cards to review the card controls and settings available on your account."],
  ["Where can I download a statement?", "Open the relevant account and choose Statements to find available statement periods and download options."],
  ["Is a mobile app available?", "A Meridian mobile app is coming soon. The current online banking experience is designed to adapt to mobile screens."],
  ["How do I get help with my account?", "Visit Contact for guidance, or sign in first if your question relates to your account details."],
];
export default function FAQPage(){return <PublicLayout><main className="bg-[#f4f3ee]"><section className="bg-night px-5 py-16 text-white sm:px-8 sm:py-20"><div className="mx-auto max-w-5xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#c8e4d1]"><IconCircleHelp size={24}/></span><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#a7d4b5]">Help, made clearer</p><h1 className="mt-4 font-display text-5xl font-medium tracking-[-.055em] sm:text-6xl">Frequently asked questions.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/60">Straightforward answers about accounts, payments and using Meridian.</p></div></section><section className="px-5 py-12 sm:px-8 sm:py-16"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.65fr_1.35fr]"><aside className="h-fit rounded-2xl bg-brand p-6 text-white"><h2 className="font-display text-2xl font-semibold">Need a hand?</h2><p className="mt-2 text-sm leading-6 text-white/65">Find more help or get in touch with the right team.</p><Link href="/contact" className="mt-5 inline-flex rounded-lg bg-[#c8e4d1] px-4 py-2.5 text-sm font-bold text-[#163d30]">Contact Meridian</Link></aside><div className="space-y-3">{faq.map(([q,a])=><details key={q} className="group rounded-xl border border-line bg-card"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden"><span>{q}</span><IconChevronDown size={18} className="shrink-0 text-brand transition group-open:rotate-180"/></summary><p className="max-w-3xl px-5 pb-5 text-sm leading-6 text-ink-soft">{a}</p></details>)}</div></div></section></main></PublicLayout>}
