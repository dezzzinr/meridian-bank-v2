/**
 * Supported currencies + regions. `code` is the ISO currency code used
 * by Intl.NumberFormat. Monetary fields use fixed hundredths for all
 * currencies; whole-unit currencies such as JPY reject fractional inputs.
 */
export interface CurrencyOption {
  code: string;
  label: string;
  region: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", label: "US Dollar", region: "United States" },
  { code: "EUR", label: "Euro", region: "Eurozone" },
  { code: "GBP", label: "British Pound", region: "United Kingdom" },
  { code: "NGN", label: "Nigerian Naira", region: "Nigeria" },
  { code: "KES", label: "Kenyan Shilling", region: "Kenya" },
  { code: "GHS", label: "Ghanaian Cedi", region: "Ghana" },
  { code: "ZAR", label: "South African Rand", region: "South Africa" },
  { code: "INR", label: "Indian Rupee", region: "India" },
  { code: "CAD", label: "Canadian Dollar", region: "Canada" },
  { code: "AUD", label: "Australian Dollar", region: "Australia" },
  { code: "JPY", label: "Japanese Yen", region: "Japan" },
  { code: "BRL", label: "Brazilian Real", region: "Brazil" },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function isValidCurrency(code: unknown): code is string {
  return typeof code === "string" && BY_CODE.has(code);
}

export function regionForCurrency(code: string): string {
  return BY_CODE.get(code)?.region ?? "United States";
}

export function currencyLabel(code: string): string {
  return BY_CODE.get(code)?.label ?? code;
}
