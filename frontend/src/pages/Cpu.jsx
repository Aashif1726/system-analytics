import { TimeChart, CoreBars } from '../components/Charts.jsx';
import { num } from '../format.js';

export default function Cpu({ rows, latest, info }) {
  if (!latest) return <p className="muted">Reading CPU stats…</p>;
  const hasCores = latest.cores?.length > 0;
  const hasFreq = latest.cpuMhz != null;
  const hasTemp = latest.cpuTempC != null;

  return (
    <>
      <section className="grid stats">
        <div className="card stat"><span className="stat-value">{num(latest.cpu * 100, 0)}%</span><span className="label">Total load</span></div>
        <div className="card stat"><span className="stat-value">{info?.cores ?? '–'}</span><span className="label">Logical processors</span></div>
        <div className="card stat">
          <span className="stat-value">{hasFreq ? `${(latest.cpuMhz / 1000).toFixed(2)} GHz` : '–'}</span>
          <span className="label">Average clock{hasFreq ? '' : ' (Linux only)'}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{hasTemp ? `${latest.cpuTempC.toFixed(0)} °C` : '–'}</span>
          <span className="label">Temperature{hasTemp ? '' : ' (not exposed)'}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{latest.loadAvg >= 0 ? latest.loadAvg.toFixed(2) : '–'}</span>
          <span className="label">Load average (1 min){latest.loadAvg >= 0 ? '' : ' (not on Windows)'}</span>
        </div>
      </section>
      {info?.cpuName && <p className="muted small cpu-name">{info.cpuName}</p>}

      <h2 className="section-title">Utilization</h2>
      <section className="card">
        <TimeChart data={rows} series={[{ key: 'cpu', name: 'CPU load' }]} unit="%" domain={[0, 100]} digits={0} />
      </section>

      <div className="two-col">
        <section>
          <h2 className="section-title">Per core, right now</h2>
          <div className="card">
            {hasCores ? <CoreBars cores={latest.cores} /> : (
              <p className="empty">Per-core load is available on Linux. On this OS only the total is reported.</p>
            )}
          </div>
        </section>
        <section>
          <h2 className="section-title">Clock and temperature</h2>
          <div className="card">
            {hasFreq || hasTemp ? (
              <TimeChart data={rows} unit=""
                         series={[
                           ...(hasFreq ? [{ key: 'mhz', name: 'Clock (MHz)', color: 'var(--c2)' }] : []),
                           ...(hasTemp ? [{ key: 'temp', name: 'Temp (°C)', color: 'var(--c3)' }] : []),
                         ]} area={false} domain={['auto', 'auto']} digits={0} />
            ) : (
              <p className="empty">This OS does not expose CPU clock or temperature to Java.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
