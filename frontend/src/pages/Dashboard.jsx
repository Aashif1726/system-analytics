import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatBytes, formatDuration } from '../format.js';

function Meter({ label, value, detail }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const level = pct >= 90 ? 'hot' : pct >= 70 ? 'warm' : 'ok';
  return (
    <div className="card meter">
      <div className="meter-head">
        <span className="label">{label}</span>
        <span className="meter-value">{pct}%</span>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`bar-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="muted small">{detail}</div>
    </div>
  );
}

function Stat({ label, value, href }) {
  const inner = (
    <>
      <span className="stat-value">{value}</span>
      <span className="label">{label}</span>
    </>
  );
  return href ? <a className="card stat" href={href}>{inner}</a> : <div className="card stat">{inner}</div>;
}

export default function Dashboard() {
  const [sys, setSys] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function pollSystem() {
      try {
        const s = await api.get('/system');
        if (alive) { setSys(s); setError(''); }
      } catch (e) {
        if (alive) setError(e.message);
      }
    }
    async function pollSummary() {
      try {
        const s = await api.get('/summary');
        if (alive) setSummary(s);
      } catch {
        /* the system poll already reports connection problems */
      }
    }
    pollSystem();
    pollSummary();
    const a = setInterval(pollSystem, 3000);
    const b = setInterval(pollSummary, 15000);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, []);

  const memUsed = sys?.memoryTotal ? sys.memoryTotal - sys.memoryFree : 0;
  const diskUsed = sys?.diskTotal ? sys.diskTotal - sys.diskFree : 0;
  const swapUsed = sys?.swapTotal ? sys.swapTotal - sys.swapFree : 0;

  return (
    <>
      <header className="page-head">
        <h1>Dashboard</h1>
        {sys && <span className="muted">{sys.hostname} · {sys.os} · {sys.arch}</span>}
      </header>

      {error && <p className="error" role="alert">Can’t reach the server: {error}</p>}

      <section className="grid stats">
        <Stat label="Open tasks" value={summary?.tasksOpen ?? '–'} href="#/tasks" />
        <Stat label="Notes" value={summary?.notes ?? '–'} href="#/notes" />
        <Stat label="Saved links" value={summary?.links ?? '–'} href="#/links" />
        <Stat label="Files stored" value={summary ? `${summary.files} · ${formatBytes(summary.filesBytes)}` : '–'} href="#/files" />
      </section>

      <h2 className="section-title">System</h2>
      {!sys ? (
        <p className="muted">Reading system stats…</p>
      ) : (
        <>
          <section className="grid meters">
            {sys.cpuLoad != null && (
              <Meter label="CPU" value={sys.cpuLoad}
                     detail={`${sys.cores} cores${sys.loadAverage >= 0 ? ` · load ${sys.loadAverage.toFixed(2)}` : ''}`} />
            )}
            {sys.memoryTotal > 0 && (
              <Meter label="Memory" value={memUsed / sys.memoryTotal}
                     detail={`${formatBytes(memUsed)} of ${formatBytes(sys.memoryTotal)}`} />
            )}
            {sys.diskTotal > 0 && (
              <Meter label="Disk" value={diskUsed / sys.diskTotal}
                     detail={`${formatBytes(diskUsed)} of ${formatBytes(sys.diskTotal)}`} />
            )}
            {sys.swapTotal > 0 && (
              <Meter label="Swap" value={swapUsed / sys.swapTotal}
                     detail={`${formatBytes(swapUsed)} of ${formatBytes(sys.swapTotal)}`} />
            )}
          </section>

          <section className="card info">
            <dl>
              <div><dt>Host uptime</dt><dd>{formatDuration(sys.hostUptimeSeconds)}</dd></div>
              <div><dt>Server uptime</dt><dd>{formatDuration(sys.serverUptimeSeconds)}</dd></div>
              <div><dt>Java</dt><dd>{sys.javaVersion}</dd></div>
              <div><dt>JVM heap</dt><dd>{formatBytes(sys.jvmUsed)} / {formatBytes(sys.jvmMax)}</dd></div>
            </dl>
          </section>
        </>
      )}
    </>
  );
}
