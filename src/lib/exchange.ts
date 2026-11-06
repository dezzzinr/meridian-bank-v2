/**
 * Hardcoded exchange rates (base: USD). In production you'd fetch these
 * from a live API, but for the demo they're realistic fixed rates.
 */
const RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1650.0,
  KES: 153.0,
  GHS: 15.2,
  ZAR: 18.1,
  INR: 83.0,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.0,
  BRL: 4.95,
};

export function getRates(base = "USD"): Record<string, number> {
  const baseRate = RATES[base] ?? 1;
  const result: Record<string, number> = {};
  for (const [code, rate] of Object.entries(RATES)) {
    result[code] = rate / baseRate;
  }
  return result;
}

export function convert(
  amountCents: number,
  from: string,
  to: string,
): number {
  const fromRate = RATES[from] ?? 1;
  const toRate = RATES[to] ?? 1;
  return Math.round((amountCents / fromRate) * toRate);
}

export function formatRate(from: string, to: string): string {
  const fromRate = RATES[from] ?? 1;
  const toRate = RATES[to] ?? 1;
  return (toRate / fromRate).toFixed(4);
}
