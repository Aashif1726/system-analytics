import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { clock } from '../format.js';

export const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];

const axis = { tick: { fill: 'var(--muted)', fontSize: 11 }, stroke: 'var(--border)' };

const tooltipProps = {
  contentStyle: {
    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12,
  },
  labelStyle: { color: 'var(--muted)' },
  isAnimationActive: false,
};

function fmtValue(v, unit, digits) {
  return v == null ? '–' : `${Number(v).toFixed(digits)}${unit}`;
}

/**
 * Rolling time-series. series: [{ key, name, color? }]. Use `area` for filled charts, otherwise lines.
 */
export function TimeChart({ data, series, unit = '', domain = [0, 'auto'], height = 210, area = true, digits = 1,
                           xAsElapsed = false }) {
  const Chart = area ? AreaChart : LineChart;
  // Wall-clock timestamps by default; with xAsElapsed, `t` is milliseconds since the start of a run.
  const fmtX = xAsElapsed ? (ms) => `${(ms / 1000).toFixed(1)}s` : clock;
  return (
    <div className="chart">
      <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={fmtX} minTickGap={56} {...axis} />
          <YAxis domain={domain} width={44} tickFormatter={(v) => `${Math.round(v * 10) / 10}${unit}`} {...axis} />
          <Tooltip {...tooltipProps} labelFormatter={fmtX}
                   formatter={(v, name) => [fmtValue(v, unit, digits), name]} />
          {series.map((s, i) => {
            const color = s.color || COLORS[i % COLORS.length];
            return area ? (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={color} fill={color}
                    fillOpacity={0.16} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={color}
                    strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            );
          })}
        </Chart>
      </ResponsiveContainer>
      </div>
      {series.length > 1 && (
        <div className="legend">
          {series.map((s, i) => (
            <span key={s.key}><i style={{ background: s.color || COLORS[i % COLORS.length] }} />{s.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** One bar per CPU core, current load. */
export function CoreBars({ cores, height = 200 }) {
  const data = cores.map((v, i) => ({ core: `${i}`, load: v * 100 }));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="core" interval={cores.length > 24 ? 'preserveStartEnd' : 0} {...axis} />
          <YAxis domain={[0, 100]} width={44} tickFormatter={(v) => `${v}%`} {...axis} />
          <Tooltip {...tooltipProps} cursor={{ fill: 'var(--panel-2)' }}
                   labelFormatter={(l) => `Core ${l}`} formatter={(v) => [`${v.toFixed(0)}%`, 'Load']} />
          <Bar dataKey="load" fill="var(--c1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Circular gauge. value is 0..100, or null when the sensor is unavailable. */
export function Ring({ value, label, detail, color = 'var(--c1)' }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const has = value != null;
  const v = has ? Math.max(0, Math.min(100, value)) : 0;
  const tone = v >= 90 ? 'var(--danger)' : v >= 75 ? 'var(--warn)' : color;
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label}: ${has ? `${Math.round(v)} percent` : 'not available'}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="9" />
        {has && (
          <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        )}
        <text x="50" y="55" textAnchor="middle" className="ring-num">{has ? `${Math.round(v)}%` : '–'}</text>
      </svg>
      <div className="ring-label">{label}</div>
      <div className="muted small">{detail}</div>
    </div>
  );
}
