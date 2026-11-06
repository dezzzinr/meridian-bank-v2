import type { ReactNode, SVGProps } from "react";
const paths: Record<string, ReactNode> = {
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></>,
  freeze: <><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 3 3-3M9 19l3-3 3 3M4 11l4-1-1-4M20 13l-4 1 1 4M7 18l1-4-4-1M17 6l-1 4 4 1" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  online: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4M7 8h4" /></>,
  atm: <><rect x="3" y="4" width="18" height="10" rx="2" /><path d="M7 10h10v10H7zM10 17h4M7 7h10" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  replace: <><path d="M20 7A8 8 0 0 0 6 5L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  contactless: <><path d="M9 9a5 5 0 0 1 0 6M12 6a9 9 0 0 1 0 12M15 3a13 13 0 0 1 0 18" /></>,
  document: <><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6" /></>,
  wallet: <><path d="M20 8V5H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V7" /><path d="M20 12h-5v5h5M17 14.5h.01" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2" /></>,
};
export function BankIcon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>{paths[name] ?? paths.card}</svg>;
}
