export function normalizeDateInput(d: any): string | null {
  if (!d) return null;
  if (typeof d !== 'string') {
    try { d = String(d); } catch { return null; }
  }
  // already in DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return d;
  // ISO YYYY-MM-DD
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = m[1], mo = m[2], day = m[3];
    return `${day}.${mo}.${y}`;
  }
  // fallback: try Date parsing
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}.${mm}.${yy}`;
  }
  return null;
}
