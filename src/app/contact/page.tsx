import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/pages/PublicInfoPage";
export const metadata: Metadata = { title: "Contact | Meridian" };
export default function ContactPage() { return <PublicInfoPage eyebrow="Contact" title="We’re here to point you in the right direction." intro="Choose the route that best matches what you need. For account-specific help, sign in first so you can find the relevant account information." sections={[
  { title: "Using Meridian", body: "Visit the Help Centre for guidance on sign-in, account activity, payments and statements." },
  { title: "Account access", body: "Use Log in to access your account, or choose Get started to create one." },
  { title: "Security questions", body: "Visit the Security page for general account safety guidance and the security controls available in the app." },
  { title: "Account-specific support", body: "For questions about your account, use the support channel provided with your account or service documentation." },
]} action={{ label: "Visit the help centre", href: "/help" }} />; }
