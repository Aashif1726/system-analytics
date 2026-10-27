import { useMemo } from 'react';
import { TimeChart, Ring } from '../components/Charts.jsx';
import { gpuInfo } from '../gpuBench.js';
import { num } from '../format.js';

function GpuPanel({ index, points, latest }) {
  const g = latest.gpus.find((x) => x.index === index);
  const rows = useMemo(() => points.map((p) => {
    const x = p.gpus?.find((q) => q.index === index);
    return {
      t: p.ts,
      util: x?.utilization ?? null,
      vram: x?.memTotalMb ? (x.memUsedMb / x.memTotalMb) * 100 : null,
      temp: x?.tempC ?? null,
      power: x?.powerW ?? null,
      clock: x?.clockMhz ?? null,
      memClock: x?.memClockMhz ?? null,
    };
  }), [points, index]);
  if (!g) return null;
  const vramPct = g.memTotalMb ? (g.memUsedMb / g.memTotalMb) * 100 : null;
  const powerPct = g.powerW != null && g.powerLimitW ? (g.powerW / g.powerLimitW) * 100 : null;

  return (
    <section className="gpu-panel">
      <h2 className="section-title">GPU {g.index} · {g.name}</h2>
      <div className="card rings">
        <Ring value={g.utilization} label="Core load" color="var(--c3)" />
        <Ring value={vramPct} label="VRAM" color="var(--c2)"
              detail={g.memUsedMb != null ? `${num(g.memUsedMb / 1024, 1)} / ${num(g.memTotalMb / 1024, 1)} GB` : ''} />
        <Ring value={powerPct} label="Power" color="var(--c4)"
              detail={g.powerW != null ? `${num(g.powerW, 0)} W of ${num(g.powerLimitW, 0)} W` : 'not reported'} />
        <Ring value={g.tempC} label="Temperature" color="var(--c1)" detail={g.tempC != null ? `${num(g.tempC, 0)} °C` : ''} />
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="chart-title">Load and VRAM</h3>
          <TimeChart data={rows} unit="%" domain={[0, 100]} digits={0} height={190}
                     series={[{ key: 'util', name: 'Core load', color: 'var(--c3)' }, { key: 'vram', name: 'VRAM', color: 'var(--c2)' }]} />
        </div>
        <div className="card">
          <h3 className="chart-title">Core clock (MHz){g.memClockMhz != null ? ` · memory ${num(g.memClockMhz, 0)} MHz` : ''}</h3>
          <TimeChart data={rows} area={false} domain={[0, 'auto']} digits={0} height={190}
                     series={[{ key: 'clock', name: 'Core clock', color: 'var(--c1)' }]} />
        </div>
        <div className="card">
          <h3 className="chart-title">Temperature (°C)</h3>
          <TimeChart data={rows} area={false} domain={['auto', 'auto']} digits={0} height={190}
                     series={[{ key: 'temp', name: 'Temperature', color: 'var(--danger)' }]} />
        </div>
        <div className="card">
          <h3 className="chart-title">Power draw (W)</h3>
          <TimeChart data={rows} area={false} domain={[0, 'auto']} digits={0} height={190}
                     series={[{ key: 'power', name: 'Power', color: 'var(--c4)' }]} />
        </div>
      </div>
    </section>
  );
}

export default function Gpu({ points, latest, info }) {
  const browserGpu = useMemo(() => gpuInfo(), []);
  if (!latest) return <p className="muted">Reading GPU stats…</p>;
  const gpus = latest.gpus ?? [];

  return (
    <>
      {gpus.length > 0 ? (
        gpus.map((g) => <GpuPanel key={g.index} index={g.index} points={points} latest={latest} />)
      ) : (
        <section className="card notice">
          <h2>No live GPU stats</h2>
          <p>
            Live load, memory, temperature and power need <code>nvidia-smi</code>, which comes with the NVIDIA driver
            and must be on the PATH of the machine running the server. Nothing answered here, so either this is
            an AMD or Intel GPU (these have no cross-platform command-line sensor) or the NVIDIA driver is missing.
          </p>
          <p className="muted small">The Benchmarks tab can still measure your GPU’s shader speed through the browser.</p>
        </section>
      )}

      <h2 className="section-title">Detected graphics hardware</h2>
      <section className="grid two">
        <div className="card">
          <h3 className="chart-title">Reported by the OS</h3>
          {info?.gpuAdapters?.length ? (
            <ul className="plain">{info.gpuAdapters.map((a) => <li key={a}>{a}</li>)}</ul>
          ) : <p className="muted small">Nothing reported.</p>}
        </div>
        <div className="card">
          <h3 className="chart-title">Used by this browser (WebGL)</h3>
          {browserGpu ? (
            <dl className="facts">
              <div><dt>Renderer</dt><dd>{browserGpu.renderer}</dd></div>
              <div><dt>Vendor</dt><dd>{browserGpu.vendor}</dd></div>
              <div><dt>API</dt><dd>{browserGpu.version}</dd></div>
              <div><dt>Max texture</dt><dd>{browserGpu.maxTexture}px</dd></div>
            </dl>
          ) : <p className="muted small">WebGL is not available in this browser.</p>}
        </div>
      </section>
    </>
  );
}
