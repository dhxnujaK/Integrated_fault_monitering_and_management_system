import { useMemo, useState } from 'react'
import './App.css'

const navigationItems = [
  { label: 'Dashboard', short: 'DB' },
  { label: 'Generator', short: 'GE' },
  { label: 'ATS Status', short: 'AT' },
  { label: 'UPS Status', short: 'UP' },
  { label: 'MDP Status', short: 'MD' },
  { label: 'SDP Status', short: 'SD' },
  { label: 'Settings', short: 'ST' },
  { label: 'Log out', short: 'LO' },
]

const generatorPage = {
  cards: [
    { title: 'Generator Running', icon: 'OK', value: 'Auto Mode', mode: 'badge' },
    { title: 'Output Power', icon: 'OP', value: '250 kW / 312 kVA' },
    { title: 'Fuel Level', icon: 'FL', value: '65% - 8 Hours' },
    { title: 'Battery Voltage', icon: 'BV', value: '11.1v Charging' },
  ],
  upperPanels: [
    {
      title: 'Power & Voltage',
      subtitle: '30 Min | 24 Hours',
      type: 'chart',
      variant: 'power',
      legend: ['Power', 'Voltage'],
    },
    {
      title: 'Engine Parameters',
      type: 'chart',
      variant: 'engine',
      legend: ['Coolant Temp (°C)', 'Oil Pressure (psi)'],
    },
  ],
  lowerPanels: [
    {
      type: 'alarms',
      title: 'Active Alarms',
      tabs: ['Active', 'Acknowledged', 'History'],
      activeTab: 'Active',
      alarms: [
        { message: 'High Coolant Temperature', severity: 'high', meta: '10:15 am', action: 'Acknowledge' },
        { message: 'Low Fuel Warning', severity: 'medium', meta: '09:20 am', action: 'Acknowledge' },
        { message: 'Battery Low Voltage', severity: 'high', meta: '08:50 am', action: 'Acknowledge' },
      ],
      actions: ['Export Report', 'Create Maintenance ticket'],
    },
    {
      type: 'fault',
      title: 'Fault Diagnosis',
      alert: 'High Coolant temperature',
      sections: [
        { title: 'Probable Causes:', items: ['Low coolant level', 'Faulty radiator fan'] },
        {
          title: 'Recommended Actions:',
          items: ['Check coolant level', 'Inspect radiator fan', 'Schedule maintenance'],
        },
      ],
    },
  ],
}

const atsPage = {
  cards: [
    { title: 'Utility Supply', icon: 'US', value: '250 V / 31 HZ' },
    { title: 'Generator', icon: 'GE', value: 'AVAILABLE', subValue: 'Ready for Transfer' },
    { title: 'ATS Position', icon: 'AP', value: 'Load on GENERATOR' },
    { title: 'ATS Mode', icon: 'AM', value: 'Auto Mode', mode: 'badge' },
  ],
  upperPanels: [
    {
      title: 'Transfer Path',
      type: 'diagram',
      lines: [
        'Utility Source -> ATS Controller',
        'Generator Standby -> Auto Transfer',
        'Load side currently on Generator',
      ],
    },
    {
      title: 'Electrical Parameters',
      type: 'table',
      rows: [
        ['Utility Voltage', '415 V'],
        ['Generator Voltage L - L', '400 V'],
        ['Frequency', '50 Hz'],
        ['Phases', 'R | Y | B'],
      ],
    },
  ],
  lowerPanels: [
    {
      type: 'events',
      title: 'Transfer Events',
      events: [
        { time: '10:12 am', title: 'Transfer Failure', detail: 'Unable to connect to utility' },
        { time: '10:12 am', title: 'Load transferred to Generator', detail: 'Utility not available' },
        { time: '09:52 am', title: 'Utility Failure Detected', detail: 'Voltage dropped below 400V' },
        { time: '09:15 am', title: 'Load transferred to Utility', detail: 'Utility restored' },
      ],
    },
    {
      type: 'status',
      title: 'Interlock Status',
      checks: [
        ['Generator breaker', 'Closed'],
        ['Utility breaker', 'Open'],
        ['Mechanical interlock', 'Healthy'],
        ['Auto transfer timer', 'Enabled'],
      ],
    },
  ],
}

const pageConfigs = {
  Dashboard: {
    cards: [
      { title: 'System Health', icon: 'SH', value: '6 / 7 Normal' },
      { title: 'Critical Alerts', icon: 'AL', value: '03 Active' },
      { title: 'Plant Load', icon: 'PL', value: '72%' },
      { title: 'Fuel Reserve', icon: 'FR', value: '65% - 8 Hours' },
    ],
    upperPanels: [
      {
        title: 'Site Overview',
        type: 'table',
        rows: [
          ['Generator', 'Running / Auto Mode'],
          ['ATS', 'Load on Generator'],
          ['UPS', 'Healthy'],
          ['MDP', 'No breaker trips'],
          ['SDP', '3 feeders critical'],
        ],
      },
      {
        title: 'Energy Trend',
        subtitle: 'Last 24 Hours',
        type: 'chart',
        variant: 'dashboard',
        legend: ['Total Load', 'Critical Load'],
      },
    ],
    lowerPanels: [
      {
        type: 'events',
        title: 'Recent Events',
        events: [
          { time: '10:16 am', title: 'Alarm acknowledged', detail: 'High Coolant Temperature' },
          { time: '10:12 am', title: 'ATS transfer', detail: 'Load transferred to Generator' },
          { time: '09:48 am', title: 'UPS battery cycle', detail: 'Routine equalization completed' },
        ],
      },
      {
        type: 'status',
        title: 'Action Center',
        checks: [
          ['Create maintenance ticket', 'Pending'],
          ['Review ATS incident report', 'Pending'],
          ['Weekly generator test', 'Scheduled'],
          ['Update notification group', 'Completed'],
        ],
      },
    ],
  },
  Generator: generatorPage,
  'ATS Status': atsPage,
  'UPS Status': {
    cards: [
      { title: 'Input Supply', icon: 'IN', value: '230 V / 50 Hz' },
      { title: 'Output Supply', icon: 'OUT', value: '230 V Stable' },
      { title: 'Battery Bank', icon: 'BB', value: '92%', subValue: '45 min runtime' },
      { title: 'Load Level', icon: 'LL', value: '48%' },
    ],
    upperPanels: [
      {
        title: 'Battery Runtime Trend',
        subtitle: 'Last 6 Hours',
        type: 'chart',
        variant: 'ups',
        legend: ['Battery %', 'Runtime'],
      },
      {
        title: 'UPS Bank Status',
        type: 'table',
        rows: [
          ['Module A', 'Healthy'],
          ['Module B', 'Healthy'],
          ['Module C', 'Charging'],
          ['Bypass', 'Standby'],
        ],
      },
    ],
    lowerPanels: [
      {
        type: 'alarms',
        title: 'UPS Alerts',
        tabs: ['Active', 'Cleared'],
        activeTab: 'Active',
        alarms: [
          { message: 'Battery temperature high', severity: 'medium', meta: '09:32 am', action: 'View' },
          { message: 'Input ripple warning', severity: 'medium', meta: '08:55 am', action: 'View' },
        ],
        actions: ['Export UPS Log'],
      },
      {
        type: 'status',
        title: 'Maintenance Window',
        checks: [
          ['Next battery test', 'Mar 14, 2026'],
          ['Filter replacement', 'Mar 18, 2026'],
          ['Firmware package', 'v2.4.1'],
          ['Technician assigned', 'Yes'],
        ],
      },
    ],
  },
  'MDP Status': {
    cards: [
      { title: 'Main Incomer', icon: 'MI', value: 'Closed' },
      { title: 'Bus Voltage', icon: 'BV', value: '415 V' },
      { title: 'Panel Load', icon: 'LD', value: '67%' },
      { title: 'Power Factor', icon: 'PF', value: '0.96' },
    ],
    upperPanels: [
      {
        title: 'Feeder Loads',
        type: 'table',
        rows: [
          ['Feeder 1', '52%'],
          ['Feeder 2', '61%'],
          ['Feeder 3', '47%'],
          ['Feeder 4', '69%'],
        ],
      },
      {
        title: 'Breaker Status',
        type: 'status-list',
        lines: ['BKR-A1: Closed', 'BKR-A2: Closed', 'BKR-B1: Open (maintenance)', 'BKR-C1: Closed'],
      },
    ],
    lowerPanels: [
      {
        type: 'events',
        title: 'MDP Alarm Log',
        events: [
          { time: '09:10 am', title: 'Phase imbalance warning', detail: 'L2 exceeded threshold by 4%' },
          { time: '08:42 am', title: 'Breaker test complete', detail: 'BKR-B1 manual isolation complete' },
        ],
      },
      {
        type: 'status',
        title: 'Protection Summary',
        checks: [
          ['Earth fault relay', 'Healthy'],
          ['Overcurrent relay', 'Healthy'],
          ['Surge protection', 'Online'],
          ['Thermal trip margin', '12%'],
        ],
      },
    ],
  },
  'SDP Status': {
    cards: [
      { title: 'Panel Health', icon: 'PH', value: 'Normal' },
      { title: 'Active Feeders', icon: 'AF', value: '8 / 10' },
      { title: 'Critical Loads', icon: 'CL', value: '03' },
      { title: 'Panel Temp', icon: 'TP', value: '32 °C' },
    ],
    upperPanels: [
      {
        title: 'Branch Circuit Loads',
        type: 'table',
        rows: [
          ['Lighting', '31%'],
          ['HVAC', '72%'],
          ['Data Racks', '64%'],
          ['Auxiliary', '28%'],
        ],
      },
      {
        title: 'Energy Split',
        type: 'chart',
        variant: 'sdp',
        legend: ['Critical', 'Non-critical'],
      },
    ],
    lowerPanels: [
      {
        type: 'events',
        title: 'Recent Trips',
        events: [
          { time: '07:45 am', title: 'Feeder F6 trip', detail: 'Overload cleared after reset' },
          { time: '06:20 am', title: 'Feeder F2 warning', detail: 'Short transient detected' },
        ],
      },
      {
        type: 'status',
        title: 'Restoration Checklist',
        checks: [
          ['Feeder inspection', 'Completed'],
          ['Load rebalance', 'In progress'],
          ['Insulation check', 'Scheduled'],
          ['Final sign-off', 'Pending'],
        ],
      },
    ],
  },
  Settings: {
    cards: [
      { title: 'Notification Profile', icon: 'NP', value: 'Operations Team' },
      { title: 'Alarm Escalation', icon: 'AE', value: 'Enabled' },
      { title: 'Report Schedule', icon: 'RS', value: 'Daily 06:00' },
      { title: 'Time Zone', icon: 'TZ', value: 'Asia/Colombo' },
    ],
    upperPanels: [
      {
        title: 'System Preferences',
        type: 'settings-list',
        lines: [
          'High coolant alert threshold: 92°C',
          'Low fuel alert threshold: 20%',
          'Auto report export: Enabled',
          'Maintenance reminder cadence: Weekly',
        ],
      },
      {
        title: 'Notification Channels',
        type: 'status-list',
        lines: ['Email alerts: Enabled', 'SMS alerts: Enabled', 'Push alerts: Disabled', 'Escalation delay: 3 min'],
      },
    ],
    lowerPanels: [
      {
        type: 'status',
        title: 'Access Control',
        checks: [
          ['Admin users', '3'],
          ['Operator users', '8'],
          ['Last password rotation', 'Mar 01, 2026'],
          ['MFA enforcement', 'Required'],
        ],
      },
      {
        type: 'events',
        title: 'Recent Configuration Changes',
        events: [
          { time: 'Yesterday', title: 'Fuel threshold changed', detail: 'Updated from 18% to 20%' },
          { time: 'Mar 07', title: 'New operator added', detail: 'user.ops02 permissions granted' },
        ],
      },
    ],
  },
  'Log out': {
    cards: [
      { title: 'Current User', icon: 'CU', value: 'Admin' },
      { title: 'Session Duration', icon: 'SD', value: '03h 42m' },
      { title: 'Last Login', icon: 'LL', value: 'Mar 10, 2026 06:12' },
      { title: 'Security Status', icon: 'SC', value: 'Verified' },
    ],
    upperPanels: [
      {
        title: 'Sign-out Actions',
        type: 'status-list',
        lines: [
          'End active dashboard session',
          'Revoke current authentication token',
          'Retain audit trail records',
          'Keep export jobs running in background',
        ],
      },
      {
        title: 'Session Safety Check',
        type: 'table',
        rows: [
          ['Unsaved settings', 'None'],
          ['Active alarm acknowledgements', 'Saved'],
          ['Pending maintenance tickets', '1 Open'],
          ['Background tasks', '2 Running'],
        ],
      },
    ],
    lowerPanels: [
      {
        type: 'logout',
        title: 'Confirm Logout',
        text: 'You are about to sign out of the monitoring system. Continue?',
        actions: ['Cancel', 'Switch User', 'Log out now'],
      },
      {
        type: 'events',
        title: 'Recent Account Activity',
        events: [
          { time: '10:16 am', title: 'Alarm acknowledged', detail: 'High Coolant Temperature' },
          { time: '09:20 am', title: 'Report exported', detail: 'Generator daily report PDF' },
          { time: '08:58 am', title: 'Settings viewed', detail: 'Notification channels panel' },
        ],
      },
    ],
  },
}

const dashboardStatusCards = [
  { title: 'Generator', state: 'Fault', tone: 'fault' },
  { title: 'ATS', state: 'Normal', tone: 'normal' },
  { title: 'UPS', state: 'Normal', tone: 'normal' },
  { title: 'MDP', state: 'Normal', tone: 'normal' },
  { title: 'SDP', state: 'Normal', tone: 'normal' },
]

const dashboardAlarms = [
  { source: 'UPS', message: 'Battery Low', time: '10:15 am' },
  { source: 'Generator', message: 'Fail to Start', time: '09:20 am' },
  { source: 'MDP', message: 'Phase Loss Warning', time: '08:50 am' },
]

function DashboardPage() {
  return (
    <>
      <section className="dashboard-top-cards" aria-label="System state cards">
        {dashboardStatusCards.map((item) => (
          <article key={item.title} className="dash-state-card">
            <h2>{item.title}</h2>
            <div className="dash-state-divider" />
            <p className={`dash-state-pill ${item.tone}`}>{item.state}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid" aria-label="Dashboard details">
        <article className="system-overview-card">
          <h3>System Overview</h3>
          <div className="system-overview-divider" />
          <div className="overview-flow">
            <div className="flow-row">
              <span className="flow-node red">CEB</span>
              <span className="flow-arrow">→</span>
              <span className="flow-node red">ATS</span>
            </div>
            <div className="flow-row">
              <span className="flow-node green">GENERATOR</span>
              <span className="flow-arrow">→</span>
              <span className="flow-node green">MDP</span>
            </div>
            <div className="flow-row">
              <span className="flow-node blue">MDP</span>
              <span className="flow-arrow">↓</span>
            </div>
            <div className="flow-row">
              <span className="flow-node blue">SDP</span>
              <span className="flow-arrow">↓</span>
            </div>
            <div className="flow-row">
              <span className="flow-node blue">SDP</span>
              <span className="flow-arrow">→</span>
              <span className="flow-node red">CRITICAL LOAD</span>
            </div>
          </div>
          <div className="overview-legend">
            <p><span className="legend-mark red-line" />Fault Path</p>
            <p><span className="legend-mark green-line" />Generator Backup</p>
            <p><span className="legend-mark green-line" />Power Distribution</p>
          </div>
        </article>

        <div className="dashboard-right-stack">
          <article className="dashboard-alarms-card">
            <h3>Active Alarms</h3>
            <div className="system-overview-divider" />
            <div className="dashboard-alarm-tabs">
              <button type="button" className="active">Active</button>
              <button type="button">Acknowledged</button>
              <button type="button">History</button>
            </div>
            <ul className="dashboard-alarm-list">
              {dashboardAlarms.map((item) => (
                <li key={item.source + item.time}>
                  <strong>{item.source}</strong>
                  <span>{item.message}</span>
                  <span>{item.time}</span>
                  <button type="button">Acknowledge</button>
                </li>
              ))}
            </ul>
            <div className="dashboard-alarm-actions">
              <button type="button">Export Report</button>
              <button type="button">Create Maintenance ticket</button>
            </div>
          </article>

          <div className="dashboard-bottom-panels">
            <article className="dashboard-mini-card">
              <h3>UPS Status</h3>
              <div className="system-overview-divider" />
              <ul>
                <li><span>Input Voltage</span><strong>230V</strong></li>
                <li><span>Output Load</span><strong>78%</strong></li>
                <li><span>Battery Level</span><strong>15%</strong></li>
              </ul>
              <div className="mini-chart" />
            </article>

            <article className="dashboard-mini-card">
              <h3>Fault Diagnosis</h3>
              <div className="system-overview-divider" />
              <p className="mini-alert">UPS Battery is low.</p>
              <div className="mini-block">
                <h4>Probable Causes:</h4>
                <ul>
                  <li>Battery near end-of life.</li>
                  <li>Input AC failure</li>
                  <li>UPS overload</li>
                </ul>
              </div>
              <div className="mini-block">
                <h4>Recommended Actions:</h4>
                <ul>
                  <li>Check input power</li>
                  <li>Inspect battery condition</li>
                  <li>Reduce UPS load</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}

function MetricCards({ cards }) {
  return (
    <section className="metrics-grid" aria-label="Top metrics">
      {cards.map((card) => (
        <article key={card.title} className="metric-card">
          <div className="metric-title-row">
            <span className="metric-icon" aria-hidden="true">
              {card.icon}
            </span>
            <h2>{card.title}</h2>
          </div>
          <div className="metric-divider" />
          {card.mode === 'badge' ? (
            <p className="status-badge">{card.value}</p>
          ) : (
            <p className="metric-value">{card.value}</p>
          )}
          {card.subValue ? <p className="metric-subvalue">{card.subValue}</p> : null}
        </article>
      ))}
    </section>
  )
}

function ChartPanel({ panel }) {
  return (
    <article className="panel" aria-label={panel.title}>
      <div className="panel-header">
        <h3>{panel.title}</h3>
        {panel.subtitle ? <p>{panel.subtitle}</p> : null}
      </div>
      <div className={`chart chart-${panel.variant ?? 'default'}`} role="img" aria-label={panel.title} />
      {panel.legend?.length ? (
        <div className="legend-row">
          {panel.legend.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function TablePanel({ panel }) {
  return (
    <article className="panel" aria-label={panel.title}>
      <div className="panel-header">
        <h3>{panel.title}</h3>
      </div>
      <ul className="info-list">
        {panel.rows.map(([label, value]) => (
          <li key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </li>
        ))}
      </ul>
    </article>
  )
}

function TextListPanel({ panel }) {
  return (
    <article className="panel" aria-label={panel.title}>
      <div className="panel-header">
        <h3>{panel.title}</h3>
      </div>
      <ul className="text-list">
        {(panel.lines ?? []).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  )
}

function AlarmsPanel({ panel }) {
  return (
    <article className="panel-dark" aria-label={panel.title}>
      <div className="panel-title-row">
        <h3>{panel.title}</h3>
      </div>

      <div className="tabs" role="tablist" aria-label={`${panel.title} tabs`}>
        {(panel.tabs ?? []).map((tab) => (
          <button key={tab} type="button" className={`tab${tab === panel.activeTab ? ' active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      <ul className="alarm-list">
        {(panel.alarms ?? []).map((alarm) => (
          <li key={`${alarm.message}-${alarm.meta}`} className="alarm-item">
            <span className={`alarm-dot ${alarm.severity}`} aria-hidden="true">
              !
            </span>
            <span className={`alarm-message ${alarm.severity}`}>{alarm.message}</span>
            <span className="alarm-time">{alarm.meta}</span>
            {alarm.action ? (
              <button type="button" className="ack-btn">
                {alarm.action}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {(panel.actions ?? []).length ? (
        <div className="alarm-actions">
          {panel.actions.map((action) => (
            <button key={action} type="button" className="outline-btn">
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function EventsPanel({ panel }) {
  return (
    <article className="panel-dark" aria-label={panel.title}>
      <div className="panel-title-row">
        <h3>{panel.title}</h3>
      </div>
      <ul className="event-list">
        {(panel.events ?? []).map((event) => (
          <li key={`${event.time}-${event.title}`}>
            <div>
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
            </div>
            <span>{event.time}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function StatusPanel({ panel }) {
  return (
    <article className="panel-dark" aria-label={panel.title}>
      <div className="panel-title-row">
        <h3>{panel.title}</h3>
      </div>
      <ul className="status-list">
        {(panel.checks ?? []).map(([label, value]) => (
          <li key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </li>
        ))}
      </ul>
    </article>
  )
}

function FaultPanel({ panel }) {
  return (
    <article className="panel-dark" aria-label={panel.title}>
      <div className="panel-title-row">
        <h3>{panel.title}</h3>
      </div>
      <p className="fault-alert">{panel.alert}</p>
      {(panel.sections ?? []).map((section) => (
        <div key={section.title} className="fault-block">
          <h4>{section.title}</h4>
          <ul>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </article>
  )
}

function DiagramPanel({ panel }) {
  return (
    <article className="panel" aria-label={panel.title}>
      <div className="panel-header">
        <h3>{panel.title}</h3>
      </div>
      <div className="diagram-box">
        {(panel.lines ?? []).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </article>
  )
}

function LogoutPanel({ panel }) {
  return (
    <article className="panel-dark" aria-label={panel.title}>
      <div className="panel-title-row">
        <h3>{panel.title}</h3>
      </div>
      <p className="logout-copy">{panel.text}</p>
      <div className="logout-actions">
        {(panel.actions ?? []).map((action, index) => (
          <button key={action} type="button" className={`logout-btn${index === panel.actions.length - 1 ? ' danger' : ''}`}>
            {action}
          </button>
        ))}
      </div>
    </article>
  )
}

function renderUpperPanel(panel) {
  if (panel.type === 'chart') return <ChartPanel panel={panel} />
  if (panel.type === 'table') return <TablePanel panel={panel} />
  if (panel.type === 'diagram') return <DiagramPanel panel={panel} />
  if (panel.type === 'status-list' || panel.type === 'settings-list') return <TextListPanel panel={panel} />
  return <TextListPanel panel={panel} />
}

function renderLowerPanel(panel) {
  if (panel.type === 'alarms') return <AlarmsPanel panel={panel} />
  if (panel.type === 'events') return <EventsPanel panel={panel} />
  if (panel.type === 'status') return <StatusPanel panel={panel} />
  if (panel.type === 'fault') return <FaultPanel panel={panel} />
  if (panel.type === 'logout') return <LogoutPanel panel={panel} />
  return <StatusPanel panel={panel} />
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const pageConfig = useMemo(() => pageConfigs[activePage], [activePage])

  return (
    <div className="dashboard-app">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="account-card">
          <div className="avatar" aria-hidden="true">
            AD
          </div>
          <div>
            <p className="account-name">Admin</p>
            <p className="account-email">admin@gmail.com</p>
          </div>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item${item.label === activePage ? ' active' : ''}`}
              onClick={() => setActivePage(item.label)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.short}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content-area">
        <header className="content-header">
          <h1>{activePage}</h1>
        </header>

        {activePage === 'Dashboard' ? (
          <DashboardPage />
        ) : (
          <>
            <MetricCards cards={pageConfig.cards} />

            <section className="chart-grid" aria-label="Primary widgets">
              {pageConfig.upperPanels.map((panel) => (
                <div key={panel.title}>{renderUpperPanel(panel)}</div>
              ))}
            </section>

            <section className="lower-grid" aria-label="Secondary widgets">
              {pageConfig.lowerPanels.map((panel) => (
                <div key={panel.title}>{renderLowerPanel(panel)}</div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
