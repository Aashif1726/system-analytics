import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { TimeChart } from '../components/Charts.jsx';
import { runGpuBench, gpuInfo } from '../gpuBench.js';

function fmt(v) {
  return v >= 100 ? v.toFixed(0) : v.toFixed(2);
}

function CpuBench() {
  const [state, setState] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function run() {
    setState('running');
    setError('');
    try {
      setResult(await api.post('/benchmark/cpu'));
      setState('done');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  return (
    <section className="card bench">
      <div className="bench-head">
        <div>
          <h2>CPU benchmark</h2>
          <p className="muted small">
            Four kernels, each timed on one thread and on every core: integer, floating point, hashing and memory copy.
            Takes about 10 seconds and pushes the CPU to 100%.
          </p>
        </div>
        <button className="btn primary" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? 'Running…' : result ? 'Run again' : 'Run CPU benchmark'}
        </button>
      </div>
      {state === 'running' && <p className="muted" role="status">Measuring… watch the CPU chart on the Overview tab spike.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {result && (
        <>
          <table className="table">
            <thead>
              <tr><th>Test</th><th className="num">1 thread</th><th className="num">{result.threads} threads</th><th>Scaling</th></tr>
            </thead>
            <tbody>
              {result.tests.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td className="num">{fmt(t.single)} <span className="muted small">{t.unit}</span></td>
                  <td className="num">{fmt(t.multi)} <span className="muted small">{t.unit}</span></td>
                  <td className="scale">
                    <div className="bar"><div className="bar-fill ok" style={{ width: `${Math.min(100, (t.scaling / result.threads) * 100)}%` }} /></div>
                    <span className="small">{t.scaling.toFixed(2)}×</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            Scaling is multi-thread speed divided by single-thread speed (ideal = {result.threads}×). Memory copy is
            capped at 8 threads. Completed in {(result.durationMs / 1000).toFixed(1)} s. Use these numbers to compare
            this machine with itself over time (e.g. before and after a driver or cooling change).
          </p>
        </>
      )}
    </section>
  );
}

function GpuBench() {
  const [state, setState] = useState('idle'); // idle | running | done | error
  const [live, setLive] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const abort = useRef(null);
  const supported = useRef(gpuInfo() !== null);

  useEffect(() => () => abort.current?.abort(), []);

  async function run() {
    abort.current = new AbortController();
    setState('running');
    setLive([]);
    setResult(null);
    setError('');
    try {
      const r = await runGpuBench({
        seconds: 5,
        signal: abort.current.signal,
        onSample: (s) => setLive((l) => [...l, { t: s.t, gflops: s.gflops }]),
      });
      setResult(r);
      setState('done');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  return (
    <section className="card bench">
      <div className="bench-head">
        <div>
          <h2>GPU benchmark</h2>
          <p className="muted small">
            Runs a multiply-add shader on the GPU your browser uses (WebGL) and converts the timing to GFLOPS.
            Open this page on the machine you want to test.
          </p>
        </div>
        {state === 'running' ? (
          <button className="btn" onClick={() => abort.current?.abort()}>Stop</button>
        ) : (
          <button className="btn primary" onClick={run} disabled={!supported.current}>
            {result ? 'Run again' : 'Run GPU benchmark'}
          </button>
        )}
      </div>
      {!supported.current && <p className="error">WebGL is not available in this browser, so the GPU benchmark cannot run.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {live.length > 0 && (
        <div className="live-chart">
          <TimeChartSeconds data={live} />
        </div>
      )}

      {result && (
        <dl className="facts results">
          <div><dt>Typical (median)</dt><dd className="big">{fmt(result.median)} GFLOPS</dd></div>
          <div><dt>Peak</dt><dd className="big">{fmt(result.peak)} GFLOPS</dd></div>
          <div><dt>GPU</dt><dd>{result.renderer}</dd></div>
        </dl>
      )}
      {result && (
        <p className="muted small">
          Indicative FP32 shader throughput measured through the browser; it is not the vendor’s rated TFLOPS
          and varies with drivers, power mode and thermals. Software renderers (names containing “SwiftShader”
          or “llvmpipe”) mean no hardware GPU is being used.
        </p>
      )}
    </section>
  );
}

/** Same look as TimeChart, but the x axis is seconds into the run. */
function TimeChartSeconds({ data }) {
  const rows = data.map((d) => ({ t: d.t * 1000, gflops: d.gflops }));
  return (
    <TimeChart data={rows} series={[{ key: 'gflops', name: 'GFLOPS', color: 'var(--c3)' }]}
               domain={[0, 'auto']} digits={0} height={200} xAsElapsed />
  );
}

export default function Benchmark() {
  return (
    <>
      <CpuBench />
      <GpuBench />
    </>
  );
}
