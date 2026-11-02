// Turns "98765 43210", "+91 98765-43210", "09876543210" into "+919876543210".
// Returns null if it doesn't look like a real number.
export function normalizePhone(raw: string, defaultCountryCode = "91"): string | null {
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    s = s.replace(/^0+/, "");
    s = "+" + defaultCountryCode + s;
  }
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}
