import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';

const API_URL = 'http://localhost:8000';
const MAX_POINTS = 36;

const metricConfig = [
  {
    key: 'mse',
    label: 'Live MSE',
    description: 'Mechanical specific energy',
    unit: 'kJ/m³',
    color: '#4fa9b8',
    fill: '#4fa9b8',
    format: (value) => value.toFixed(1),
  },
  {
    key: 'torque_variance',
    label: 'Torque variance',
    description: 'Rotational load stability',
    unit: 'variance',
    color: '#68b99c',
    fill: '#68b99c',
    format: (value) => value.toFixed(3),
  },
  {
    key: 'pressure_variance',
    label: 'Pressure variance',
    description: 'Downhole pressure stability',
    unit: 'variance',
    color: '#6f9ed1',
    fill: '#6f9ed1',
    format: (value) => value.toFixed(3),
  },
];

function getTrend(data, key) {
  if (data.length < 2) return 'steady';
  const current = Number(data.at(-1)[key]);
  const previous = Number(data[Math.max(0, data.length - 6)][key]);
  const difference = current - previous;
  const scale = Math.max(Math.abs(previous), 1);
  if (Math.abs(difference) < scale * 0.02) return 'steady';
  return difference > 0 ? 'up' : 'down';
}

function TrendIndicator({ trend }) {
  return (
    <span className={`trend-indicator trend-indicator--${trend}`} aria-label={`Trend ${trend}`}>
      {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
    </span>
  );
}

function formatTime(value) {
  if (!value) return '--:--:--';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value).slice(-8)
    : date.toISOString().slice(11, 19);
}

function formatDate(value) {
  if (!value) return 'Waiting for telemetry';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

function MetricChart({ metric, data }) {
  return (
    <div className="metric-chart">
      <div className="metric-chart__heading">
        <div>
          <span className="eyebrow">{metric.description}</span>
          <h3>{metric.label} <TrendIndicator trend={getTrend(data, metric.key)} /></h3>
        </div>
        <span className="metric-unit">{metric.unit}</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.fill} stopOpacity={0.3} />
                <stop offset="100%" stopColor={metric.fill} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#25334a" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="displayTime" tick={{ fill: '#71809a', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#71809a', fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
            <Tooltip
              contentStyle={{ background: '#172237', border: '1px solid #2d405d', borderRadius: 8, color: '#f7f9fc' }}
              labelStyle={{ color: '#9eabc0' }}
              formatter={(value) => [metric.format(Number(value)), metric.label]}
            />
            <Area type="monotone" dataKey={metric.key} stroke={metric.color} fill={`url(#fill-${metric.key})`} strokeWidth={2} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const [telemetry, setTelemetry] = useState([]);
  const [systemStatus, setSystemStatus] = useState('Connecting to rig');
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [simWob, setSimWob] = useState(25);
  const [simRpm, setSimRpm] = useState(120);
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws/telemetry`);
    ws.onopen = () => setSystemStatus('Live telemetry connected');
    ws.onmessage = (event) => {
      const incoming = JSON.parse(event.data);
      const point = { ...incoming, displayTime: formatTime(incoming.time) };
      setIsAnomaly(point.status === 'Critical Anomaly');
      setTelemetry((previous) => [...previous, point].slice(-MAX_POINTS));
    };
    ws.onerror = () => setSystemStatus('Unable to reach telemetry service');
    ws.onclose = () => setSystemStatus('Telemetry connection closed');
    return () => ws.close();
  }, []);

  const latest = telemetry.at(-1);
  const anomalyCount = useMemo(
    () => telemetry.filter((point) => point.status === 'Critical Anomaly').length,
    [telemetry],
  );

  const runSimulation = async () => {
    if (!latest) return;
    setIsSimulating(true);
    try {
      const response = await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wob: Number(simWob),
          rpm: Number(simRpm),
          torque: latest.torque,
          torque_variance: latest.torque_variance,
          pressure_variance: latest.pressure_variance,
          stick_slip: latest.stick_slip,
          shock_peak: latest.shock_peak,
        }),
      });
      if (!response.ok) throw new Error('Simulation request failed');
      setSimResult(await response.json());
    } catch {
      setSimResult({ error: 'The simulator is unavailable. Check that the API is running.' });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <main className={`app-shell ${isAnomaly ? 'app-shell--alert' : ''}`}>
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">DT</span>
          <span>Downhole<span className="brand-accent">Twin</span></span>
        </div>
        <div className="topbar-meta">
          <span className={`status-dot ${systemStatus === 'Live telemetry connected' ? 'status-dot--live' : ''}`} />
          <span>{systemStatus}</span>
          <span className="topbar-divider" />
          <span>WELL F-9_A</span>
        </div>
      </nav>

      <div className="page-content">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="section-kicker">DRILLING INTELLIGENCE / REAL-TIME MONITORING</p>
            <h1>See the rig’s<br /><em>next move.</em></h1>
            <p className="hero-description">
              This digital twin uses real-time drilling data from the Volve field for well F-9_A
              to surface changing downhole conditions and flag early signs of instability.
            </p>
            <div className="hero-tags">
              <span>Volve field</span>
              <span>Well F-9_A</span>
              <span>Isolation Forest</span>
            </div>
          </div>
          <div className="process-flow" aria-label="Simplified drilling process flow">
            <div className="process-flow__header"><span>PROCESS OVERVIEW</span><strong>F-9_A / ACTIVE</strong></div>
            <div className="process-line">
              <div className="process-node"><span className="node-symbol">▣</span><small>RIG</small></div>
              <span className="pipe pipe--active" />
              <div className="process-node"><span className="node-symbol">◈</span><small>ROTARY</small></div>
              <span className="pipe pipe--active" />
              <div className="process-node"><span className="node-symbol">▽</span><small>BIT</small></div>
              <span className="pipe pipe--active" />
              <div className="process-node"><span className={`node-status ${isAnomaly ? 'node-status--alarm' : ''}`} /><small>DOWNHOLE</small></div>
            </div>
            <div className="process-flow__footer"><span>FLOW PATH: SURFACE → BOTTOM HOLE</span><span>{latest?.status || 'NO ALARM'}</span></div>
          </div>
        </section>

        <section className="section-block" aria-labelledby="live-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">01 / LIVE SECTION</p>
              <h2 id="live-heading">Live drilling conditions</h2>
            </div>
            <div className="section-summary">
              <span>Latest sample</span>
              <strong>{formatDate(latest?.time)} <small>{formatTime(latest?.time)}</small></strong>
            </div>
          </div>

          <div className="metric-grid">
            {metricConfig.map((metric) => (
              <article className="metric-card" key={metric.key}>
                <div className="metric-card__top">
                  <span className="metric-indicator" style={{ backgroundColor: metric.color }} />
                  <span className="metric-card__label">{metric.label}</span>
                  <span className="metric-card__live">LIVE</span>
                </div>
                <strong className="metric-value">
                  {latest ? metric.format(Number(latest[metric.key])) : '--'}
                </strong>
                <span className="metric-card__unit">{metric.unit}</span>
                <div className="metric-trend">
                  <TrendIndicator trend={getTrend(telemetry, metric.key)} />
                  <span>{getTrend(telemetry, metric.key) === 'steady' ? 'Stable' : `Trending ${getTrend(telemetry, metric.key)}`}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="chart-grid">
            {metricConfig.map((metric) => (
              <MetricChart key={metric.key} metric={metric} data={telemetry} />
            ))}
          </div>

          <div className="telemetry-footer">
            <span><i className={isAnomaly ? 'dot dot--alert' : 'dot'} /> Current model state: <strong>{latest?.status || 'Waiting for first sample'}</strong></span>
            <span>{anomalyCount} flagged sample{anomalyCount === 1 ? '' : 's'} in current window</span>
          </div>
        </section>

        <section className="simulator-section section-block" aria-labelledby="simulator-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">02 / WHAT-IF SIMULATOR</p>
              <h2 id="simulator-heading">Test an operating decision</h2>
            </div>
            <span className="simulator-badge">MODEL EXPLORER</span>
          </div>
          <div className="simulator-layout">
            <div className="simulator-explanation">
              <p>
                Explore how a change in surface controls could affect drilling stability before
                applying it to the rig. The simulator combines your hypothetical weight on bit
                and rotary speed with the latest live variances, then runs the same anomaly model
                used by the live monitor.
              </p>
              <div className="how-it-works">
                <div><span>01</span><strong>Adjust</strong><small>Set WOB and RPM</small></div>
                <div><span>02</span><strong>Estimate</strong><small>Calculate hypothetical MSE</small></div>
                <div><span>03</span><strong>Assess</strong><small>Check predicted stability</small></div>
              </div>
            </div>
            <div className="simulator-controls">
              <div className="control-row">
                <div className="control-label"><span>Weight on bit</span><strong>{simWob} <small>kkgf</small></strong></div>
                <input type="range" min="5" max="45" value={simWob} onChange={(event) => setSimWob(event.target.value)} />
                <div className="range-labels"><span>5</span><span>45 kkgf</span></div>
              </div>
              <div className="control-row">
                <div className="control-label"><span>Rotary speed</span><strong>{simRpm} <small>RPM</small></strong></div>
                <input type="range" min="60" max="200" value={simRpm} onChange={(event) => setSimRpm(event.target.value)} />
                <div className="range-labels"><span>60</span><span>200 RPM</span></div>
              </div>
              <button className="simulate-button" onClick={runSimulation} disabled={!latest || isSimulating}>
                {isSimulating ? 'Running model...' : 'Run what-if scenario'}
                <span>→</span>
              </button>
              {simResult && (
                <div className={`simulation-result ${simResult.status === 'Normal' ? 'simulation-result--normal' : 'simulation-result--alert'}`}>
                  {simResult.error ? (
                    <p>{simResult.error}</p>
                  ) : (
                    <>
                      <div><span>Predicted outcome</span><strong>{simResult.status}</strong></div>
                      <div><span>Hypothetical MSE</span><strong>{simResult.hypothetical_mse.toFixed(1)} <small>kJ/m³</small></strong></div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="page-footer">
          <span>DOWNHOLE DIGITAL TWIN</span>
          <span>REAL-TIME DRILLING ANALYTICS / VOLVE FIELD</span>
        </footer>
      </div>
    </main>
  );
}
