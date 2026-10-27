import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const WINDOW = 180; // seconds kept in the browser

/** Polls the backend once a second and keeps a rolling window. */
export function useMetrics() {
  const [points, setPoints] = useState([]);
  const [info, setInfo] = useState(null);
  const [procs, setProcs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    api.get('/info').then((i) => alive && setInfo(i)).catch(() => {});
    api.get(`/metrics/history?seconds=${WINDOW}`)
      .then((h) => alive && setPoints(h))
      .catch(() => {});

    const tick = async () => {
      try {
        const s = await api.get('/metrics/current');
        if (!alive) return;
        setPoints((p) => (p.length && p[p.length - 1].ts === s.ts ? p : [...p, s].slice(-WINDOW)));
        setError('');
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    const tickProcs = async () => {
      try {
        const p = await api.get('/processes');
        if (alive) setProcs(p);
      } catch {
        /* the main poll reports connectivity problems */
      }
    };
    const refreshInfo = () => api.get('/info').then((i) => alive && setInfo(i)).catch(() => {});

    tickProcs();
    const a = setInterval(tick, 1000);
    const b = setInterval(tickProcs, 3000);
    const c = setInterval(refreshInfo, 30000);
    return () => {
      alive = false;
      clearInterval(a);
      clearInterval(b);
      clearInterval(c);
    };
  }, []);

  // Flatten samples into chart rows.
  const rows = useMemo(() => points.map((p) => ({
    t: p.ts,
    cpu: p.cpu * 100,
    mem: p.memTotal ? (p.memUsed / p.memTotal) * 100 : 0,
    memGb: p.memUsed / 2 ** 30,
    swapGb: p.swapUsed / 2 ** 30,
    mhz: p.cpuMhz,
    temp: p.cpuTempC,
    load: p.loadAvg >= 0 ? p.loadAvg : null,
    rx: p.netRxBps == null ? null : p.netRxBps / 1024,
    tx: p.netTxBps == null ? null : p.netTxBps / 1024,
    gpu: p.gpus?.[0]?.utilization ?? null,
  })), [points]);

  return { points, rows, latest: points[points.length - 1] ?? null, info, procs, error };
}
