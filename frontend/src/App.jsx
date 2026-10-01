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

const API_URL = 'https://volve-equipment-failure-prediction.onrender.com';
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

const shapHelp = {
  MSE: 'Mechanical specific energy: the energy used to remove rock. An unusual value can suggest inefficient drilling or changing downhole conditions.',
  Torque_Variance: 'Torque variance: how much rotary torque changes. High variation can point to friction changes, irregular cutting, or instability.',
  Pressure_Variance: 'Pressure variance: how much drilling pressure changes. Unexpected variation can indicate unstable circulation or changing downhole conditions.',
  'MWD Stick-Slip PKtoPK RPM rpm': 'Stick-slip: downhole speed oscillation where the drill string alternately sticks and slips. High values can increase mechanical loading.',
  'MWD Shock Peak m/s2': 'Shock peak: the highest measured downhole acceleration. High shocks can expose the bit and tools to damaging impacts.',
};

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

function ShapResults({ values, compact = false }) {
  const [selectedFeature, setSelectedFeature] = useState(null);
  if (!values?.length) return null;

  return (
    <div className={`shap-grid ${compact ? 'shap-grid--compact' : ''}`}>
      {[...values].sort((a, b) => b.abs_impact - a.abs_impact).map((item) => (
        <button
          className={`shap-card ${selectedFeature === item.feature ? 'shap-card--active' : ''}`}
          key={item.feature}
          type="button"
          onClick={() => setSelectedFeature(selectedFeature === item.feature ? null : item.feature)}
          aria-expanded={selectedFeature === item.feature}
        >
          <div className="shap-card__heading">
            <strong>{item.feature}</strong>
            <span>{item.impact >= 0 ? '+' : ''}{item.impact.toFixed(3)}</span>
          </div>
          <div className="shap-bar"><span style={{ width: `${Math.min(item.abs_impact * 100, 100)}%` }} /></div>
          <small>Observed value: {item.value.toFixed(3)}</small>
          {selectedFeature === item.feature && (
            <span className="shap-card__explanation">{shapHelp[item.feature] || 'This feature contributed to the model prediction shown above.'}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [telemetry, setTelemetry] = useState([]);
  const [systemStatus, setSystemStatus] = useState('Connecting to rig');
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [simWob, setSimWob] = useState(25);
  const [simRpm, setSimRpm] = useState(120);
  const [manualFeatures, setManualFeatures] = useState(false);
  const [simFeatures, setSimFeatures] = useState({
    mse: 0,
    torque_variance: 0,
    pressure_variance: 0,
    stick_slip: 0,
    shock_peak: 0,
  });
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
  const isOnline = systemStatus === 'Live telemetry connected';
  const connectionLabel = isOnline
    ? 'Online'
    : systemStatus === 'Connecting to rig'
      ? 'Connecting'
      : 'Offline';
  const anomalyCount = useMemo(
    () => telemetry.filter((point) => point.status === 'Critical Anomaly').length,
    [telemetry],
  );

  const updateSimFeature = (key, value) => {
    setSimFeatures((previous) => ({ ...previous, [key]: value }));
  };

  const toggleManualFeatures = (enabled) => {
    if (enabled && latest) {
      setSimFeatures({
        mse: Number(latest.mse),
        torque_variance: Number(latest.torque_variance),
        pressure_variance: Number(latest.pressure_variance),
        stick_slip: Number(latest.stick_slip),
        shock_peak: Number(latest.shock_peak),
      });
    }
    setManualFeatures(enabled);
  };

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
          torque_variance: Number(simFeatures.torque_variance),
          pressure_variance: Number(simFeatures.pressure_variance),
          stick_slip: Number(simFeatures.stick_slip),
          shock_peak: Number(simFeatures.shock_peak),
          mse: Number(simFeatures.mse),
          manual_features: manualFeatures,
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
        <section className="intro-section section-block" aria-labelledby="intro-heading">
          <div className="intro-hero">
            <div>
              <p className="section-kicker">00 / PROJECT GUIDE</p>
              <h2 id="intro-heading">A digital twin for earlier drilling decisions.</h2>
              <p className="intro-lead">
                Monitors drilling data and flags unusual conditions early, before they become
                harder-to-manage drilling problems.
              </p>
            </div>
            <div className="intro-model-card">
              <span className="eyebrow">CURRENT MODEL</span>
              <strong>Isolation Forest</strong>
              <small>Unsupervised anomaly detection</small>
            </div>
          </div>

          <div className="intro-grid">
            <article className="intro-card">
              <span className="intro-card__number">01</span>
              <h3>What are we predicting?</h3>
              <p>
                Predicts whether the current combination of drilling measurements looks
                <strong> normal</strong> or <strong>unusual</strong> compared with the reference data.
              </p>
            </article>
            <article className="intro-card">
              <span className="intro-card__number">02</span>
              <h3>What are we trying to avoid?</h3>
              <p>
                Early signs of inefficient drilling, unstable torque or pressure, stick-slip, and
                damaging downhole shock.
              </p>
            </article>
            <article className="intro-card">
              <span className="intro-card__number">03</span>
              <h3>How should the result be used?</h3>
              <p>
                Treat an alert as a prompt to investigate the live values and test a what-if
                scenario. It is not a diagnosis.
              </p>
            </article>
          </div>
        </section>

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
            <div className={`data-status data-status--${connectionLabel.toLowerCase()}`} role="status" aria-live="polite">
              <div className={`drill-animation ${isOnline ? 'drill-animation--active' : ''}`} aria-hidden="true">
                <svg viewBox="0 0 72 58" role="presentation">
                  <path className="drill-animation__derrick" d="M8 48 28 7h16l20 41M18 28h36M13 38h46M28 7l8 41M44 7l-8 41" />
                  <path className="drill-animation__platform" d="M4 49h64M25 54h22" />
                  <path className="drill-animation__string" d="M36 7v39" />
                  <path className="drill-animation__bit" d="m30 46 6 9 6-9M31 48h10" />
                  <path className="drill-animation__signal" d="M51 13h5M53 18h8M55 23h11" />
                </svg>
              </div>
              <div className="data-status__copy">
                <span className="data-status__label">DATA LINK</span>
                <strong>{connectionLabel}</strong>
                <small>{isOnline ? 'The drill is sending live telemetry.' : systemStatus}</small>
              </div>
            </div>
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
          <div className="live-guide">
            <div>
              <strong>Features used by the model</strong>
              <span><b>MSE</b> drilling energy · <b>Torque variance</b> rotary stability · <b>Pressure variance</b> pressure stability · <b>Stick-slip</b> speed oscillation · <b>Shock peak</b> downhole impact</span>
            </div>
          </div>
          {latest?.shap?.length > 0 && (
            <div className="live-explanation">
              <div className="live-explanation__heading">
                <div>
                  <p className="section-kicker">WHY THIS STATE?</p>
                  <h3>
                    Features influencing the prediction
                    <span className="help-tooltip" tabIndex="0" aria-label="Why SHAP is important">
                      ?
                      <span className="help-tooltip__content">
                        SHAP shows which features had the most influence on this individual
                        prediction. It helps explain an alert, rather than proving its cause.
                      </span>
                    </span>
                  </h3>
                </div>
                <span className="simulator-badge">SHAP FEATURE IMPACT</span>
              </div>
              <p className="explanation-note">
                Larger bars mean more influence on this result. This explains the model’s
                decision, but does not prove a feature caused the condition.
              </p>
              <ShapResults values={latest.shap} />
            </div>
          )}
          <div className={`live-state ${isAnomaly ? 'live-state--alert' : ''}`}>
            <div>
              <span className="eyebrow">CURRENT MODEL STATE</span>
              <strong>{latest?.status || 'Waiting for telemetry'}</strong>
            </div>
            <p>
              {latest?.status === 'Critical Anomaly'
                ? 'This combination is unusual compared with the reference data. The feature impacts above show what influenced the alert most.'
                : 'This combination looks normal compared with the reference data. The feature impacts above show what influenced this result.'}
            </p>
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
                Test a change without affecting the live stream. The simulator runs the same
                Isolation Forest model used by the monitor.
              </p>
              <div className="control-guide">
                <div>
                  <strong>Weight on bit (WOB)</strong>
                  <span>How much force pushes the bit into the rock. Increasing it can improve
                    drilling, but an unusual force for the current RPM and formation may raise
                    MSE, torque, or vibration.</span>
                </div>
                <div>
                  <strong>Rotary speed (RPM)</strong>
                  <span>How fast the drill string turns. Changing it changes energy and contact
                    at the bit; an unusual speed can interact with WOB and create unstable
                    torque, stick-slip, or shock.</span>
                </div>
              </div>
              <p className="simulator-tip">
                Most WOB and RPM changes will remain normal. An anomaly is more likely when their
                combination creates an unusual pattern across the other features.
              </p>
              <div className="mode-quick-guide">
                <div><strong>Automatic</strong><span>Uses the latest telemetry. Change WOB and RPM to test a live-baseline scenario.</span></div>
                <div><strong>Manual</strong><span>Edit all five model inputs to create and test your own condition.</span></div>
              </div>
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
              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={manualFeatures}
                  onChange={(event) => toggleManualFeatures(event.target.checked)}
                />
                <span className="toggle-track" aria-hidden="true"><span /></span>
                <span>
                  <strong>Manual feature override</strong>
                  <small>{manualFeatures ? 'Edit the model inputs below' : 'Use the latest live telemetry'}</small>
                </span>
              </label>
              {manualFeatures && (
                <div className="manual-features">
                  {[
                    ['mse', 'MSE', 'kJ/m³', 0, 10000, 0.1],
                    ['torque_variance', 'Torque variance', 'variance', 0, 10, 0.001],
                    ['pressure_variance', 'Pressure variance', 'variance', 0, 10, 0.001],
                    ['stick_slip', 'Stick-slip', 'RPM', 0, 100, 0.1],
                    ['shock_peak', 'Shock peak', 'm/s²', 0, 100, 0.1],
                  ].map(([key, label, unit, min, max, step]) => (
                    <div className="manual-feature" key={key}>
                      <label htmlFor={`sim-${key}`}>{label}</label>
                      <div>
                        <input
                          id={`sim-${key}`}
                          type="number"
                          min={min}
                          max={max}
                          step={step}
                          value={simFeatures[key]}
                          onChange={(event) => updateSimFeature(key, event.target.value)}
                        />
                        <span>{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <div className="simulation-result__wide"><span>Primary driver</span><strong>{simResult.root_cause}</strong></div>
                      <div className="simulation-result__wide">
                        <span>Feature impact</span>
                        <ShapResults values={simResult.shap} compact />
                      </div>
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
