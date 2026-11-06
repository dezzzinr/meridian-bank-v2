import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/pages/PublicInfoPage";
export const metadata: Metadata = { title: "About Meridian" };
export default function AboutPage() { return <PublicInfoPage eyebrow="About Meridian" title="Banking should make life feel a little simpler." intro="Meridian is built around a straightforward idea: the tools you use for everyday banking should be clear, useful and easy to find." sections={[
  { title: "Clarity comes first", body: "A focused dashboard brings accounts, balances and recent activity together, helping you get oriented without the clutter." },
  { title: "Made for everyday", body: "From checking your balance to setting up a payment, the experience centres on common tasks and clear next steps." },
  { title: "Designed around you", body: "Choose how you use the app, review your profile and keep key account controls close at hand." },
  { title: "One connected experience", body: "Accounts, payments, cards, saved payees and account activity are available from a single, consistent workspace." },
]} action={{ label: "Explore the app", href: "/register" }} />; }
