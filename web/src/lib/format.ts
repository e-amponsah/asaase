const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function monthTicks(from: string, to: string): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const start = new Date(toTime(from));
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1; // first whole month after `from` (0-based)
  for (;;) {
    if (m > 11) {
      y += 1;
      m = 0;
    }
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    if (toTime(iso) > toTime(to)) break;
    out.push({ iso, label: MONTHS[m] });
    m += 1;
  }
  return out;
}

export function formatValue(v: number, unit: string): string {
  const n = v >= 100 ? Math.round(v).toLocaleString("en-GB") : v.toFixed(v < 10 ? 1 : 0);
  return `${n} ${unit}`;
}
