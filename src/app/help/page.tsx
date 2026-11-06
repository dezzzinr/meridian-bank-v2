import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/pages/PublicInfoPage";
export const metadata: Metadata = { title: "Help centre | Meridian" };
export default function HelpPage() { return <PublicInfoPage eyebrow="Help centre" title="A hand when you need one." intro="Find a quick answer to common questions about your Meridian account and the tools available in online banking." sections={[
  { title: "How do I get started?", body: "Choose Get started to create your account, or log in if you already have one. Follow the prompts to continue." },
  { title: "Where can I see my activity?", body: "After signing in, open Activity from the app navigation to review the transactions available in your account." },
  { title: "How do I manage a payment?", body: "Open Payments to review the available transfer and payee tools. Make sure the details are correct before submitting an action." },
  { title: "Still need help?", body: "Visit Contact to find guidance on reaching the appropriate support channel." },
]} action={{ label: "Contact us", href: "/contact" }} />; }
