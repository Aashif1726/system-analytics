import { useEffect, useState } from 'react';
import { useMetrics } from './useMetrics.js';
import Overview from './pages/Overview.jsx';
import Cpu from './pages/Cpu.jsx';
import Memory from './pages/Memory.jsx';
import Gpu from './pages/Gpu.jsx';
import Benchmark from './pages/Benchmark.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'cpu', label: 'Processor' },
  { id: 'memory', label: 'Memory' },
  { id: 'gpu', label: 'Graphics' },
  { id: 'benchmark', label: 'Benchmarks' },
];

function tabFromHash() {
  const id = window.location.hash.replace('#/', '');
  return TABS.some((t) => t.id === id) ? id : 'overview';
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash);
  const m = useMetrics();

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const shared = { rows: m.rows, points: m.points, latest: m.latest, info: m.info, procs: m.procs };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 13h4l3-8 5 15 3-7h5" />
            </svg>
          </span>
          <div>
            <h1>System Analytics</h1>
            {m.info && <span className="muted small">{m.info.hostname} · {m.info.os}</span>}
          </div>
        </div>
        <span className={`live ${m.error ? 'off' : ''}`} role="status">
          <i /> {m.error ? 'Disconnected' : 'Live · 1s'}
        </span>
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} role="tab" aria-selected={t.id === tab}
             className={t.id === tab ? 'tab active' : 'tab'}>{t.label}</a>
        ))}
      </nav>

      {m.error && <p className="error" role="alert">Can’t reach the server: {m.error}</p>}

      <main>
        {tab === 'overview' && <Overview {...shared} />}
        {tab === 'cpu' && <Cpu {...shared} />}
        {tab === 'memory' && <Memory {...shared} />}
        {tab === 'gpu' && <Gpu {...shared} />}
        {tab === 'benchmark' && <Benchmark />}
      </main>
    </div>
  );
}
