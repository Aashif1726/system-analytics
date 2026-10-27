import { TimeChart } from '../components/Charts.jsx';
import { bytes, rate } from '../format.js';

export default function Memory({ rows, latest }) {
  if (!latest) return <p className="muted">Reading memory stats…</p>;
  const total = latest.memTotal;
  const memPct = total ? (latest.memUsed / total) * 100 : 0;
  const totalGb = total / 2 ** 30;

  return (
    <>
      <section className="grid stats">
        <div className="card stat"><span className="stat-value">{memPct.toFixed(0)}%</span><span className="label">RAM in use</span></div>
        <div className="card stat"><span className="stat-value">{bytes(latest.memUsed)}</span><span className="label">Used of {bytes(total)}</span></div>
        <div className="card stat"><span className="stat-value">{bytes(Math.max(0, total - latest.memUsed))}</span><span className="label">Available</span></div>
        <div className="card stat">
          <span className="stat-value">{latest.swapTotal ? bytes(latest.swapUsed) : 'None'}</span>
          <span className="label">{latest.swapTotal ? `Swap of ${bytes(latest.swapTotal)}` : 'Swap / page file'}</span>
        </div>
      </section>

      <h2 className="section-title">RAM usage</h2>
      <section className="card">
        <TimeChart data={rows} unit=" GB" domain={[0, Math.ceil(totalGb)]}
                   series={[{ key: 'memGb', name: 'RAM used (GB)', color: 'var(--c2)' }]} digits={2} />
      </section>

      <div className="two-col">
        <section>
          <h2 className="section-title">Swap / page file</h2>
          <div className="card">
            {latest.swapTotal > 0 ? (
              <TimeChart data={rows} unit=" GB" domain={[0, Math.max(1, Math.ceil(latest.swapTotal / 2 ** 30))]}
                         series={[{ key: 'swapGb', name: 'Swap used (GB)', color: 'var(--c3)' }]} digits={2} height={180} />
            ) : <p className="empty">No swap configured.</p>}
          </div>
        </section>
        <section>
          <h2 className="section-title">Network throughput</h2>
          <div className="card">
            {latest.netRxBps != null ? (
              <>
                <TimeChart data={rows} unit=" KB/s" domain={[0, 'auto']} height={180}
                           series={[{ key: 'rx', name: 'Download', color: 'var(--c1)' }, { key: 'tx', name: 'Upload', color: 'var(--c4)' }]} digits={1} />
                <p className="muted small">Now: ↓ {rate(latest.netRxBps)} · ↑ {rate(latest.netTxBps)}</p>
              </>
            ) : <p className="empty">Network throughput is available on Linux.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
