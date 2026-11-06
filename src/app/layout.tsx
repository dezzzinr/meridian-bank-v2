import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meridian — Online banking",
  description:
    "Check balances, move money, and manage payees in one calm place.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%230F5A48'/%3E%3Cpath d='M16 7a9.5 9.5 0 0 1 0 19M16 7a9.5 9.5 0 0 0 0 19M7 12.5h18M7 19.5h18' stroke='%23EAF4EF' stroke-width='1.8' stroke-linecap='round' fill='none'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${grotesk.variable} bg-paper font-sans text-ink antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
