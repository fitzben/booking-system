/** Format a YYYY-MM-DD string to a human-readable Indonesian date. */
export function fmtDate(d?: string, long = false): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(
    "id-ID",
    long
      ? { weekday: "long", day: "2-digit", month: "long", year: "numeric" }
      : { day: "2-digit", month: "short", year: "numeric" },
  );
}

/** Format a number as IDR currency. */
export function fmtPrice(n: number | null): string {
  if (n === null) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Safely parse the `details` JSON column from bookings. Returns null on failure. */
export function parseDetails(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
