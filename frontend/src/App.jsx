
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  Cpu,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  Thermometer,
  Zap
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fmt = (value, digits = 1) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(digits)
    : '—';

const statusLabel = (status) =>
  status === 'CRITICAL'
    ? 'Critical'
    : status === 'WARNING'
      ? 'Warning'
      : 'Normal';

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  tone = 'blue',
  note
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>

      <div className="metric-copy">
        <span>{label}</span>
        <strong>
          {value}
          <small>{unit}</small>
        </strong>
        <em>{note}</em>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = status || 'NORMAL';

  return (
    <span className={`pill ${normalized.toLowerCase()}`}>
      <i />
      {statusLabel(normalized)}
    </span>
  );
}

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'live-monitoring', label: 'Live monitoring', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'charging-bays', label: 'Charging bays', icon: CircleGauge },
  { id: 'history', label: 'History', icon: Clock3 }
];

export default function App() {
  const [summary, setSummary] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedBay, setSelectedBay] = useState('ALL');
  const [activeSection, setActiveSection] = useState('overview');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [summaryResponse, readingsResponse, alertsResponse] =
        await Promise.all([
          fetch(`${API}/api/dashboard/summary`),
          fetch(`${API}/api/readings?limit=100`),
          fetch(`${API}/api/alerts?limit=100`)
        ]);

      if (
        !summaryResponse.ok ||
        !readingsResponse.ok ||
        !alertsResponse.ok
      ) {
        throw new Error('API request failed');
      }

      const summaryData = await summaryResponse.json();
      const readingsData = await readingsResponse.json();
      const alertsData = await alertsResponse.json();

      setSummary(summaryData);
      setReadings(readingsData.readings || []);
      setAlerts(alertsData.alerts || []);
      setError('');
      setLastUpdate(new Date());
    } catch (err) {
      setError(
        'Cannot reach the API. Check that the backend is running.'
      );
    }
  }

  useEffect(() => {
    refresh();

    const socket = io(API, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on('reading:new', (item) => {
      setReadings((previous) =>
        [...previous, item].slice(-150)
      );

      setLastUpdate(new Date());

      // Refresh aggregate bay counts after a new reading arrives.
      refresh();
    });

    socket.on('alert:new', (item) => {
      setAlerts((previous) =>
        [item, ...previous].slice(0, 100)
      );

      refresh();
    });

    const timer = setInterval(refresh, 12000);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  function navigateTo(sectionId) {
    setActiveSection(sectionId);

    const target = document.getElementById(sectionId);

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  function handleNavigationKey(event, sectionId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateTo(sectionId);
    }
  }

  const bays = summary?.latestReadings || [];

  const chosen =
    selectedBay === 'ALL'
      ? readings
      : readings.filter(
          (reading) => reading.bayId === selectedBay
        );

  const chartData = useMemo(
    () =>
      chosen.slice(-35).map((reading) => ({
        ...reading,
        time: new Date(
          reading.recordedAt ||
          reading.createdAt ||
          Date.now()
        ).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      })),
    [chosen]
  );

  const avgTemp = bays.length
    ? bays.reduce(
        (total, bay) =>
          total + Number(bay.temperatureC || 0),
        0
      ) / bays.length
    : null;

  const avgCurrent = bays.length
    ? bays.reduce(
        (total, bay) =>
          total + Number(bay.currentA || 0),
        0
      ) / bays.length
    : null;

  async function acknowledge(id) {
    try {
      const response = await fetch(
        `${API}/api/alerts/${id}/acknowledge`,
        { method: 'PATCH' }
      );

      if (!response.ok) {
        throw new Error('Could not acknowledge alert');
      }

      await refresh();
    } catch {
      setError('Could not acknowledge alert.');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={23} />
          </div>

          <div>
            <b>
              VOLT<span>SHIELD</span>
            </b>
            <small>AI SAFETY PLATFORM</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-item ${
                activeSection === id ? 'active' : ''
              }`}
              role="button"
              tabIndex={0}
              aria-current={
                activeSection === id ? 'page' : undefined
              }
              onClick={() => navigateTo(id)}
              onKeyDown={(event) =>
                handleNavigationKey(event, id)
              }
            >
              <Icon size={18} />

              <span>{label}</span>

              {id === 'overview' &&
                activeSection === id && (
                  <span className="nav-dot" />
                )}

              {id === 'alerts' && (
                <span className="nav-count">
                  {alerts.length}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-shield">
            <ShieldCheck size={19} />
          </div>

          <b>Safety at the edge</b>

          <p>
            Local monitoring designed to keep operating
            even when cloud connectivity is unavailable.
          </p>

          <div className="version">
            VOLTSHIELD AI · PROTOTYPE
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar" id="overview">
          <div>
            <div className="eyebrow">
              OPERATIONS CENTER / EV FLEET
            </div>

            <h1>Charging Safety Overview</h1>

            <p>
              Monitor bay conditions, sensor telemetry and
              safety events.
            </p>
          </div>

          <div className="top-actions">
            <div
              className={`connection ${
                connected ? 'online' : ''
              }`}
            >
              <span />
              {connected ? 'Live connection' : 'Connecting'}
            </div>

            <div className="avatar">VS</div>
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={17} />
            {error}
          </div>
        )}

        <section className="welcome-row">
          <div>
            <h2>Fleet overview</h2>
            <p>
              Here’s the latest status across your charging bays.
            </p>
          </div>

          <div className="updated">
            <Clock3 size={15} />
            Updated{' '}
            {lastUpdate
              ? lastUpdate.toLocaleTimeString()
              : '—'}
          </div>
        </section>

        <section className="metrics">
          <Metric
            icon={Cpu}
            label="Charging bays"
            value={summary?.totalBays ?? 0}
            unit=""
            note={`${summary?.onlineBays ?? 0} devices reporting`}
          />

          <Metric
            icon={ShieldCheck}
            label="Normal status"
            value={summary?.normalBays ?? 0}
            unit=""
            tone="green"
            note="Within demo thresholds"
          />

          <Metric
            icon={Thermometer}
            label="Average temperature"
            value={avgTemp == null ? '—' : fmt(avgTemp)}
            unit="°C"
            tone="orange"
            note="Across latest bay readings"
          />

          <Metric
            icon={Zap}
            label="Average current"
            value={
              avgCurrent == null ? '—' : fmt(avgCurrent)
            }
            unit=" A"
            tone="purple"
            note="Across latest bay readings"
          />
        </section>

        <section className="content-grid">
          <div
            className="panel chart-panel"
            id="live-monitoring"
          >
            <div className="panel-heading">
              <div>
                <h3>Sensor telemetry</h3>
                <p>
                  Temperature and current over recent samples
                </p>
              </div>

              <select
                value={selectedBay}
                onChange={(event) =>
                  setSelectedBay(event.target.value)
                }
                aria-label="Filter chart by charging bay"
              >
                <option value="ALL">All bays</option>

                {bays.map((bay) => (
                  <option key={bay.bayId} value={bay.bayId}>
                    {bay.bayId}
                  </option>
                ))}
              </select>
            </div>

            <div className="chart-legend">
              <span>
                <i className="legend-temp" />
                Temperature (°C)
              </span>

              <span>
                <i className="legend-current" />
                Current (A)
              </span>
            </div>

            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e9eef5"
                  />

                  <XAxis
                    dataKey="time"
                    tick={{
                      fontSize: 10,
                      fill: '#8190a5'
                    }}
                    minTickGap={28}
                  />

                  <YAxis
                    yAxisId="left"
                    tick={{
                      fontSize: 10,
                      fill: '#8190a5'
                    }}
                    width={34}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{
                      fontSize: 10,
                      fill: '#8190a5'
                    }}
                    width={30}
                  />

                  <Tooltip />

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperatureC"
                    name="Temperature °C"
                    stroke="#e78b42"
                    strokeWidth={2.3}
                    dot={false}
                  />

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="currentA"
                    name="Current A"
                    stroke="#3978e8"
                    strokeWidth={2.3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {!chartData.length && (
              <div className="empty-overlay">
                Waiting for sensor readings. Start the simulator
                to populate this chart.
              </div>
            )}
          </div>

          <div className="panel health-panel">
            <div className="panel-heading">
              <div>
                <h3>Safety distribution</h3>
                <p>Latest state per bay</p>
              </div>

              <ShieldCheck size={20} color="#4779d4" />
            </div>

            <div className="distribution">
              {[
                {
                  label: 'Normal',
                  value: summary?.normalBays ?? 0,
                  className: 'green-dot',
                  barClass: 'bar-green'
                },
                {
                  label: 'Warning',
                  value: summary?.warningBays ?? 0,
                  className: 'orange-dot',
                  barClass: 'bar-orange'
                },
                {
                  label: 'Critical',
                  value: summary?.criticalBays ?? 0,
                  className: 'red-dot',
                  barClass: 'bar-red'
                }
              ].map((item) => (
                <div key={item.label}>
                  <div className="distribution-row">
                    <span>
                      <i className={`dot ${item.className}`} />
                      {item.label}
                    </span>

                    <b>{item.value}</b>
                  </div>

                  <div className="bar">
                    <i
                      className={item.barClass}
                      style={{
                        width: `${
                          bays.length
                            ? (item.value / bays.length) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="health-note">
              <div className="health-note-icon">
                <Radio size={18} />
              </div>

              <div>
                <b>
                  {connected
                    ? 'Dashboard connected'
                    : 'Connecting to server'}
                </b>

                <p>
                  Live updates are delivered through Socket.IO.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="panel bays-panel"
          id="charging-bays"
        >
          <div className="panel-heading">
            <div>
              <h3>Charging bay status</h3>
              <p>
                Current sensor readings and evaluated status
              </p>
            </div>

            <span className="table-count">
              {bays.length} bays
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CHARGING BAY</th>
                  <th>DEVICE</th>
                  <th>TEMPERATURE</th>
                  <th>CURRENT</th>
                  <th>RISK SCORE*</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {bays.map((bay) => (
                  <tr key={bay.bayId}>
                    <td>
                      <div className="bay-name">
                        <div className="bay-icon">
                          <Zap size={16} />
                        </div>

                        <div>
                          <b>{bay.bayId}</b>
                          <small>EV charging point</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`device-state ${
                          bay.deviceOnline ? 'device-on' : ''
                        }`}
                      >
                        <i />
                        {bay.deviceOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>

                    <td>
                      <b>{fmt(bay.temperatureC)} °C</b>
                      <div className="subvalue">
                        Temperature sensor
                      </div>
                    </td>

                    <td>
                      <b>{fmt(bay.currentA, 2)} A</b>
                      <div className="subvalue">
                        Current sensor
                      </div>
                    </td>

                    <td>
                      <div className="risk-cell">
                        <div className="risk-track">
                          <i
                            style={{
                              width: `${Math.min(
                                100,
                                bay.riskScore || 0
                              )}%`
                            }}
                          />
                        </div>

                        <span>{bay.riskScore ?? 0}</span>
                      </div>
                    </td>

                    <td>
                      <StatusPill status={bay.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!bays.length && (
            <div className="empty-table">
              <Cpu size={25} />
              <b>No charging bays yet</b>
              <span>
                Start the simulator or connect your ESP32 to
                begin receiving data.
              </span>
            </div>
          )}

          <div className="table-foot">
            *Demo risk score is a rule-based indicator, not a
            probability of fire.
          </div>
        </section>

        <section
          className="panel alerts-panel"
          id="alerts"
        >
          <div className="panel-heading">
            <div>
              <h3>Recent safety events</h3>
              <p>
                Warnings and critical readings from the
                monitoring system
              </p>
            </div>

            <div className="alert-total">
              <AlertTriangle size={15} />
              {alerts.length} events
            </div>
          </div>

          <div className="alerts-list">
            {alerts.slice(0, 6).map((alert) => (
              <div className="alert-row" key={alert._id}>
                <div
                  className={`alert-symbol ${
                    alert.status === 'CRITICAL'
                      ? 'critical-symbol'
                      : ''
                  }`}
                >
                  <AlertTriangle size={17} />
                </div>

                <div className="alert-text">
                  <b>
                    {alert.bayId} · {statusLabel(alert.status)}
                  </b>

                  <p>{alert.message}</p>

                  <small>
                    {alert.createdAt
                      ? new Date(alert.createdAt).toLocaleString()
                      : 'Time unavailable'}
                  </small>
                </div>

                <div className="alert-action">
                  {alert.acknowledged ? (
                    <span className="acknowledged">
                      <CheckCircle2 size={14} />
                      Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => acknowledge(alert._id)}
                    >
                      Acknowledge
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!alerts.length && (
            <div className="empty-alerts">
              <CheckCircle2 size={19} />
              No alerts recorded. The system will show events
              when thresholds are exceeded.
            </div>
          )}
        </section>

        <section className="panel bays-panel" id="history">
          <div className="panel-heading">
            <div>
              <h3>Reading history</h3>
              <p>
                Recent sensor samples received by the backend
              </p>
            </div>

            <span className="table-count">
              {readings.length} readings
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>CHARGING BAY</th>
                  <th>TEMPERATURE</th>
                  <th>CURRENT</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {[...readings]
                  .reverse()
                  .slice(0, 20)
                  .map((reading, index) => (
                    <tr
                      key={
                        reading._id ||
                        `${reading.bayId}-${reading.recordedAt}-${index}`
                      }
                    >
                      <td>
                        {reading.recordedAt || reading.createdAt
                          ? new Date(
                              reading.recordedAt ||
                                reading.createdAt
                            ).toLocaleString()
                          : '—'}
                      </td>

                      <td>
                        <b>{reading.bayId || 'Unknown'}</b>
                      </td>

                      <td>
                        {fmt(reading.temperatureC)} °C
                      </td>

                      <td>
                        {fmt(reading.currentA, 2)} A
                      </td>

                      <td>
                        <StatusPill status={reading.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!readings.length && (
            <div className="empty-table">
              <Clock3 size={25} />
              <b>No reading history yet</b>
              <span>
                Sensor readings will appear here after the
                simulator or ESP32 sends data.
              </span>
            </div>
          )}
        </section>

        <footer>
          <span>
            <ShieldCheck size={15} />
            VOLTSHIELD AI
          </span>

          <span>
            Prototype monitoring interface · Validate thresholds
            before real-world use
          </span>
        </footer>
      </main>
    </div>
  );
}
