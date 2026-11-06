import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/pages/PublicInfoPage";
export const metadata: Metadata = { title: "Security | Meridian" };
export default function SecurityPage() { return <PublicInfoPage eyebrow="Security" title="Your account deserves careful protection." intro="Account access and security controls are part of the Meridian experience. These practical habits can also help you protect any online account." sections={[
  { title: "Use a unique password", body: "Choose a password you do not use on other sites. A password manager can help you create and store strong, unique passwords." },
  { title: "Keep your sign-in private", body: "Never share your password or verification codes. Meridian support will not ask you to disclose your password." },
  { title: "Review account activity", body: "Check recent activity and account details regularly. If something looks unfamiliar, use the available account controls and contact your service provider." },
  { title: "Protect your device", body: "Keep your browser and operating system up to date, use a screen lock, and sign out when using a shared device." },
]} action={{ label: "Sign in securely", href: "/login" }} />; }
