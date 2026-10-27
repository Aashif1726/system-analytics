import { TimeChart, Ring } from '../components/Charts.jsx';
import { bytes, duration, rate, pct } from '../format.js';

export default function Overview({ rows, latest, info, procs }) {
  if (!latest) return <p className="muted">Reading system stats…</p>;
  const memPct = latest.memTotal ? (latest.memUsed / latest.memTotal) * 100 : null;
  const gpu = latest.gpus?.[0];
  const gpuMemPct = gpu?.memTotalMb ? (gpu.memUsedMb / gpu.memTotalMb) * 100 : null;

  const series = [
    { key: 'cpu', name: 'CPU' },
    { key: 'mem', name: 'Memory' },
    ...(gpu ? [{ key: 'gpu', name: 'GPU' }] : []),
  ];

  return (
    <>
      <section className="card rings">
        <Ring value={latest.cpu * 100} label="CPU"
              detail={`${info?.cores ?? latest.cores.length} threads`} />
        <Ring value={memPct} label="Memory" color="var(--c2)"
              detail={`${bytes(latest.memUsed)} / ${bytes(latest.memTotal)}`} />
        {gpu ? (
          <Ring value={gpu.utilization} label="GPU" color="var(--c3)"
                detail={gpuMemPct != null ? `VRAM ${Math.round(gpuMemPct)}%` : gpu.name} />
        ) : (
          <Ring value={null} label="GPU" detail="No NVIDIA stats" />
        )}
        <div className="ring">
          <div className="net">
            <div><span className="muted small">↓ Download</span><strong>{rate(latest.netRxBps)}</strong></div>
            <div><span className="muted small">↑ Upload</span><strong>{rate(latest.netTxBps)}</strong></div>
          </div>
          <div className="ring-label">Network</div>
          <div className="muted small">{latest.netRxBps == null ? 'Linux only' : 'all interfaces'}</div>
        </div>
      </section>

      <h2 className="section-title">Last 3 minutes</h2>
      <section className="card">
        <TimeChart data={rows} series={series} unit="%" domain={[0, 100]} area={false} digits={0} />
      </section>

      <div className="two-col">
        <section>
          <h2 className="section-title">Top processes (CPU)</h2>
          <div className="card">
            {procs.length === 0 ? (
              <p className="empty">Collecting… processes appear after a few seconds.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Process</th><th className="num">PID</th><th className="num">CPU</th></tr></thead>
                <tbody>
                  {procs.map((p) => (
                    <tr key={p.pid}>
                      <td>{p.name}</td>
                      <td className="num muted">{p.pid}</td>
                      <td className="num">{pct(p.cpu, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="section-title">System</h2>
          <div className="card">
            {info ? (
              <dl className="facts">
                <div><dt>Host</dt><dd>{info.hostname}</dd></div>
                <div><dt>OS</dt><dd>{info.os} ({info.arch})</dd></div>
                <div><dt>Processor</dt><dd>{info.cpuName || '–'}</dd></div>
                <div><dt>Memory</dt><dd>{bytes(info.memTotal)}</dd></div>
                <div><dt>Graphics</dt><dd>{info.gpuAdapters.length ? info.gpuAdapters.join(', ') : (gpu?.name ?? '–')}</dd></div>
                <div><dt>Uptime</dt><dd>{duration(info.uptimeSeconds)}</dd></div>
              </dl>
            ) : <p className="muted">Loading…</p>}
          </div>
        </section>
      </div>

      {info?.disks?.length > 0 && (
        <>
          <h2 className="section-title">Storage</h2>
          <section className="grid disks">
            {info.disks.map((d) => {
              const used = d.total ? (d.used / d.total) * 100 : 0;
              return (
                <div className="card" key={d.name}>
                  <div className="disk-head"><span className="disk-name">{d.name}</span><span className="muted small">{d.type}</span></div>
                  <div className="bar" role="progressbar" aria-valuenow={Math.round(used)} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.name} used`}>
                    <div className={`bar-fill ${used >= 90 ? 'hot' : used >= 75 ? 'warm' : 'ok'}`} style={{ width: `${used}%` }} />
                  </div>
                  <div className="muted small">{bytes(d.used)} of {bytes(d.total)} used</div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
