export function bytes(n) {
  if (n == null || Number.isNaN(n)) return '–';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export const rate = (bps) => (bps == null ? '–' : `${bytes(bps)}/s`);

export function duration(seconds) {
  if (seconds == null || seconds < 0) return '–';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

export const pct = (v, digits = 0) => (v == null ? '–' : `${v.toFixed(digits)}%`);
export const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour12: false });
export const num = (v, digits = 1) => (v == null ? '–' : Number(v).toFixed(digits));
