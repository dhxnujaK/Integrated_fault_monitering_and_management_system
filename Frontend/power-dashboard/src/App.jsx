import { createElement, useRef, useState, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  PanelTop,
  PlugZap,
  Power,
  ServerCog,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
  Plus,
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import './App.css'
import api from './api/axios'
import GeneratorPage from './pages/GeneratorPage'
import ATSPage from './pages/ATSPage'
import MDPPage from './pages/MDPPage'
import SDPPage from './pages/SDPPage'

const chartSeries = {
  power: {
    a: [46, 42, 51, 47, 58, 54, 61, 57, 66, 62, 70, 68],
    b: [32, 34, 37, 36, 42, 40, 45, 44, 49, 47, 52, 50],
  },
  engine: {
    a: [64, 61, 69, 66, 75, 70, 78, 73, 81, 76, 84, 79],
    b: [42, 48, 45, 55, 50, 59, 53, 62, 58, 64, 60, 66],
  },
}

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Generator', path: '/generator', icon: Gauge },
  { label: 'ATS Status', path: '/ats', icon: PlugZap },
  { label: 'UPS Status', path: '/ups', icon: Power },
  { label: 'MDP Status', path: '/mdp', icon: PanelTop },
  { label: 'SDP Status', path: '/sdp', icon: ServerCog },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Log out', icon: LogOut },
]

const pathToPage = {
  '/dashboard': 'Dashboard',
  '/generator': 'Generator',
  '/ats': 'ATS Status',
  '/ups': 'UPS Status',
  '/mdp': 'MDP Status',
  '/sdp': 'SDP Status',
  '/settings': 'Settings',
}

const statusCards = [
  { title: 'Generator', value: 'Fault', tone: 'danger' },
  { title: 'ATS', value: 'Normal', tone: 'ok' },
  { title: 'UPS', value: 'Normal', tone: 'ok' },
  { title: 'MDP', value: 'Normal', tone: 'ok' },
  { title: 'SDP', value: 'Normal', tone: 'ok' },
]

const dashboardAlarms = [
  { id: 'dash-ups-battery', source: 'UPS', title: 'Battery Low', time: '10:15 am', tone: 'warning', status: 'active' },
  { id: 'dash-generator-start', source: 'Generator', title: 'Fail to Start', time: '09:20 am', tone: 'danger', status: 'active' },
  { id: 'dash-mdp-phase', source: 'MDP', title: 'Phase Loss Warning', time: '08:50 am', tone: 'warning', status: 'active' },
]

const generatorAlarms = [
  { id: 'gen-coolant', title: 'High Coolant Temperature', detail: 'Radiator fan failed to start', time: '10:15 am', tone: 'danger', status: 'active' },
  { id: 'gen-fuel', title: 'Low Fuel Warning', detail: 'Utility not available', time: '09:20 am', tone: 'warning', status: 'active' },
  { id: 'gen-battery', title: 'Battery Low Voltage', detail: 'Battery below normal charging range', time: '08:50 am', tone: 'danger', status: 'acknowledged', acknowledgedAt: '08:58 am' },
]

const upsAlarms = [
  { id: 'ups-critical-low', area: 'UPS 01 - Server Room', title: 'Battery Critically Low', time: '09:25 am', tone: 'danger', status: 'active' },
  { id: 'ups-output', area: 'UPS 01 - Server Room', title: 'UPS Output Failure', time: '07:32 am', tone: 'danger', status: 'active' },
  { id: 'ups-low', area: 'UPS 02 - Server Room', title: 'Battery Low', time: '08:45 am', tone: 'warning', status: 'active' },
  { id: 'ups-internal', area: 'UPS 04 - Toll Plaza', title: 'UPS Internal Failure', time: '09:15 am', tone: 'danger', status: 'acknowledged', acknowledgedAt: '09:24 am' },
  { id: 'ups-overload', area: 'UPS 04 - Toll Plaza', title: 'Overload Warning', time: '08:21 am', tone: 'warning', status: 'active' },
]

const initialAlarmState = {
  dashboard: dashboardAlarms,
  generator: generatorAlarms,
  ats: generatorAlarms.slice(1).map((alarm) => ({ ...alarm, id: `ats-${alarm.id}` })),
  ups: upsAlarms,
  mdp: [
    { id: 'mdp-phase-r', title: 'Phase R Tripped', detail: 'Phase R breaker has automatically tripped due to overload condition.', time: '10:15 am', tone: 'danger', status: 'active' },
    { id: 'mdp-imbalance', title: 'Imbalanced Phase', detail: 'High/low voltage difference detected across three phases.', time: '08:50 am', tone: 'warning', status: 'acknowledged', acknowledgedAt: '09:05 am' },
  ],
}

const metricPages = {
  Generator: {
    cards: [
      { label: 'Generator Running', value: 'Auto Mode', icon: ShieldCheck, badge: true },
      { label: 'Output Power', value: '250 kW / 312 kVA', icon: Gauge },
      { label: 'Fuel Level', value: '65% - 8 Hours', icon: SlidersHorizontal },
      { label: 'Battery Voltage', value: '11.1v charging', icon: Zap },
    ],
  },
  'ATS Status': {
    cards: [
      { label: 'Utility Supply', value: '250 v / 31 hz', icon: PlugZap },
      { label: 'Generator', value: 'AVAILABLE', note: 'Ready for Transfer', icon: Gauge },
      { label: 'ATS Position', value: 'Load on GENERATOR', icon: ClipboardList },
      { label: 'ATS Mode', value: 'Auto Mode', icon: ShieldCheck, badge: true },
    ],
  },
}

function SignIn() {
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signin-page">
      <section className="signin-brand" aria-label="Expressway operation maintenance and management division">
        <p className="logo-mark">LOGO</p>
        <h1>
          EXPRESSWAY
          <span>OPERATION</span>
          <span>MAINTENANCE &</span>
          <span>MANAGEMENT</span>
          <span>DIVISION</span>
        </h1>
      </section>

      <form className="signin-card" onSubmit={handleSubmit}>
        <h2>Sign in</h2>
        <p>Enter your credentials to continue.</p>
        <label>
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        {error ? <p className="signin-error">{error}</p> : null}
        <div className="signin-links">
          <label className="remember">
            <input type="checkbox" defaultChecked />
            Remember me
          </label>
          <a href="#forgot">Forgot Password?</a>
        </div>
      </form>
    </main>
  )
}

function Sidebar({ activePage, onNavigate, onLogout }) {
  const { user } = useAuth()
  const [statuses, setStatuses] = useState({
    Generator: 'NORMAL',
    'ATS Status': 'NORMAL',
    'MDP Status': 'NORMAL',
    'SDP Status': 'NORMAL',
    'UPS Status': 'NORMAL'
  })

  useEffect(() => {
    let active = true

    async function fetchAllStatuses() {
      try {
        // 1. Generator Status
        const genRes = await api.get('/api/generator/status').catch(() => null)
        const genStatus = genRes?.data?.overallStatus || 'NORMAL'

        // 2. ATS Status
        const atsRes = await api.get('/api/ats/status').catch(() => null)
        const atsStatus = atsRes?.data?.overallStatus || 'NORMAL'

        // 3. MDP Status
        const mdpRes = await api.get('/api/mdp/status').catch(() => null)
        const mdpStatus = mdpRes?.data?.overallStatus || 'NORMAL'

        // 4. SDP Status (we check both SDP-01 and SDP-02)
        let sdpStatus = 'NORMAL'
        try {
          const sdpList = ['SDP-01', 'SDP-02']
          const sdpStatuses = await Promise.all(
            sdpList.map(id => api.get(`/api/sdp/${id}/status`).then(r => r.data.overallStatus).catch(() => 'NORMAL'))
          )
          if (sdpStatuses.includes('CRITICAL')) sdpStatus = 'CRITICAL'
          else if (sdpStatuses.includes('WARNING')) sdpStatus = 'WARNING'
        } catch {}

        // 5. UPS Status (we check both UPS-01 and UPS-02)
        let upsStatus = 'NORMAL'
        try {
          const upsList = ['UPS-01', 'UPS-02']
          const upsStatuses = await Promise.all(
            upsList.map(id => api.get(`/api/ups/${id}/status`).then(r => r.data.overallStatus).catch(() => 'NORMAL'))
          )
          if (upsStatuses.includes('CRITICAL')) upsStatus = 'CRITICAL'
          else if (upsStatuses.includes('WARNING')) upsStatus = 'WARNING'
        } catch {}

        if (active) {
          setStatuses({
            Generator: genStatus,
            'ATS Status': atsStatus,
            'MDP Status': mdpStatus,
            'SDP Status': sdpStatus,
            'UPS Status': upsStatus
          })
        }
      } catch (err) {
        console.error('Error fetching overall statuses for sidebar', err)
      }
    }

    fetchAllStatuses()
    const interval = setInterval(fetchAllStatuses, 10000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const statusColorMap = {
    NORMAL: 'bg-green-500',
    WARNING: 'bg-amber-500',
    CRITICAL: 'bg-red-500'
  }

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="account-card">
        <CircleUserRound size={42} strokeWidth={2.6} />
        <div>
          <p>{user?.username || 'Admin'}</p>
          <span>{user?.role || 'Authenticated'}</span>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`w-full flex items-center ${activePage === item.label ? 'active' : ''}`}
            onClick={() => (item.label === 'Log out' ? onLogout() : onNavigate(item))}
          >
            {createElement(item.icon, { size: 22 })}
            <span className="flex-grow text-left">{item.label}</span>
            {statuses[item.label] && (
              <span
                className={`w-2.5 h-2.5 rounded-full ${statusColorMap[statuses[item.label]] || 'bg-green-500'} ml-auto mr-1`}
                title={`${item.label} status: ${statuses[item.label]}`}
              />
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function AppShell({ activePage, setActivePage, onLogout, alarms, onAcknowledge, onAction, children }) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} />
      <main className="workspace">
        <header className="page-header">
          <h1>{activePage}</h1>
        </header>
        {activePage === 'Dashboard' ? <DashboardPage alarms={alarms.dashboard} onAcknowledge={(id) => onAcknowledge('dashboard', id)} onAction={onAction} /> : null}
        {activePage === 'Generator' ? <GeneratorPage /> : null}
        {activePage === 'ATS Status' ? <ATSPage /> : null}
        {activePage === 'UPS Status' ? <UpsPage alarms={alarms.ups} onAcknowledge={(id) => onAcknowledge('ups', id)} onAction={onAction} /> : null}
        {activePage === 'MDP Status' ? <MDPPage /> : null}
        {activePage === 'SDP Status' ? <SDPPage /> : null}
        {activePage === 'Settings' ? <SettingsPage onAction={onAction} /> : null}
        {children}
      </main>
    </div>
  )
}

function MetricStrip({ page }) {
  return (
    <section className="metric-strip" aria-label={`${page} metrics`}>
      {metricPages[page].cards.map((card) => (
        <article className="metric-panel" key={card.label}>
          <div className="panel-heading">
            {createElement(card.icon, { size: 18 })}
            <h2>{card.label}</h2>
          </div>
          <div className="divider" />
          <p className={card.badge ? 'white-pill' : 'metric-value'}>{card.value}</p>
          {card.note ? <span className="metric-note">{card.note}</span> : null}
        </article>
      ))}
    </section>
  )
}

function Tabs({ filters = false, tab, onTabChange, filter, onFilterChange }) {
  return (
    <div className="tabs">
      {['Active', 'Acknowledged', 'History'].map((item) => (
        <button
          key={item}
          type="button"
          className={tab === item ? 'selected' : ''}
          onClick={() => onTabChange(item)}
        >
          {item}
        </button>
      ))}
      {filters ? (
        <>
          {['All', 'Critical', 'Warning'].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`${index === 0 ? 'right-tab ' : ''}${filter === item ? 'selected' : ''}`}
              onClick={() => onFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </>
      ) : null}
    </div>
  )
}

function getVisibleAlarms(alarms, tab, filter) {
  return alarms.filter((alarm) => {
    const matchesTab =
      tab === 'History' ||
      (tab === 'Active' && alarm.status === 'active') ||
      (tab === 'Acknowledged' && alarm.status === 'acknowledged')
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Critical' && alarm.tone === 'danger') ||
      (filter === 'Warning' && alarm.tone === 'warning')

    return matchesTab && matchesFilter
  })
}

function AlarmPanel({ title = 'Active Alarms', alarms, onAcknowledge, onAction, filters = false }) {
  const [tab, setTab] = useState('Active')
  const [filter, setFilter] = useState('All')
  const visibleAlarms = getVisibleAlarms(alarms, tab, filter)

  return (
    <SectionCard title={title} icon={Bell}>
      <Tabs
        filters={filters}
        tab={tab}
        onTabChange={setTab}
        filter={filter}
        onFilterChange={setFilter}
      />
      <AlarmTable alarms={visibleAlarms} onAcknowledge={onAcknowledge} />
      <Actions onAction={onAction} />
    </SectionCard>
  )
}

function AlarmTable({ alarms = dashboardAlarms, compact = false, onAcknowledge }) {
  if (!alarms.length) {
    return <p className="empty-state">No alarms in this view.</p>
  }

  return (
    <div className="alarm-table">
      {alarms.map((alarm) => (
        <div className={`alarm-row ${alarm.status === 'acknowledged' ? 'acknowledged' : ''}`} key={alarm.id ?? `${alarm.title}-${alarm.time}`}>
          <span className={`severity ${alarm.tone}`}>
            <AlertTriangle size={compact ? 15 : 18} />
          </span>
          <strong>{alarm.source ?? alarm.title}</strong>
          <span>
            {alarm.source ? alarm.title : alarm.detail ?? alarm.area}
            {alarm.status === 'acknowledged' ? <small>Acknowledged by Admin at {alarm.acknowledgedAt}</small> : null}
          </span>
          <time>{alarm.time}</time>
          <button
            type="button"
            disabled={alarm.status === 'acknowledged'}
            onClick={() => onAcknowledge?.(alarm.id)}
          >
            {alarm.status === 'acknowledged' ? `Ack ${alarm.acknowledgedAt ?? ''}` : 'Acknowledge'}
          </button>
        </div>
      ))}
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`section-card ${className}`}>
      <div className="section-title">
        {Icon ? <Icon size={19} /> : null}
        <h2>{title}</h2>
      </div>
      <div className="divider" />
      {children}
    </section>
  )
}

function DashboardPage({ alarms, onAcknowledge, onAction }) {
  return (
    <div className="dashboard-layout">
      <section className="status-strip" aria-label="Equipment status">
        {statusCards.map((card) => (
          <article className="status-card" key={card.title}>
            <h2>{card.title}</h2>
            <div className="divider" />
            <p className={`status-pill ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <SystemOverview />
        <div className="dashboard-stack">
          <AlarmPanel alarms={alarms} onAcknowledge={onAcknowledge} onAction={onAction} />
          <div className="two-column">
            <UpsSummary />
            <FaultDiagnosis title="UPS Battery is low." />
          </div>
          <DashboardActionQueue />
        </div>
      </div>
    </div>
  )
}

function DashboardActionQueue() {
  return (
    <SectionCard title="Maintenance & Action Queue" icon={ClipboardList}>
      <div className="action-queue">
        <article>
          <strong>Generator cooling inspection</strong>
          <span>Critical</span>
          <p>Technician dispatch required after repeated coolant temperature alarms.</p>
        </article>
        <article>
          <strong>UPS battery replacement</strong>
          <span>Pending</span>
          <p>UPS 01 runtime below safe threshold for server-room load.</p>
        </article>
        <article>
          <strong>MDP phase check</strong>
          <span>Scheduled</span>
          <p>Verify phase imbalance and breaker trip behavior during next window.</p>
        </article>
      </div>
    </SectionCard>
  )
}

function SystemOverview() {
  const nodes = [
    ['CEB', 'ATS', 'danger'],
    ['GENERATOR', 'MDP', 'green'],
    ['MDP', 'SDP', 'blue'],
    ['SDP', 'CRITICAL LOAD', 'danger'],
  ]

  return (
    <section className="system-overview">
      <h2>System Overview</h2>
      <div className="divider" />
      <div className="flow-map">
        {nodes.map(([from, to, tone]) => (
          <div className="flow-row" key={`${from}-${to}`}>
            <span className={`flow-node ${tone}`}>{from}</span>
            <ChevronRight size={22} />
            <span className={`flow-node ${tone}`}>{to}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <span><i className="danger-line" />Fault Path</span>
        <span><i className="green-line" />Generator Backup</span>
        <span><i className="blue-line" />Power Distribution</span>
      </div>
    </section>
  )
}

function UpsSummary() {
  return (
    <SectionCard title="UPS Status">
      <dl className="kv-list">
        <div><dt>Input Voltage</dt><dd>230V</dd></div>
        <div><dt>Output Load</dt><dd>78%</dd></div>
        <div><dt>Battery Level</dt><dd>15%</dd></div>
      </dl>
      <ChartPlaceholder variant="warm" />
    </SectionCard>
  )
}

function FaultDiagnosis({ title = 'High Coolant temperature' }) {
  return (
    <SectionCard title="Fault Diagnosis" icon={AlertTriangle}>
      <p className="diagnosis-banner">{title}</p>
      <div className="fault-timeline">
        <span>Raised: 10:12 am</span>
        <span>Ack: 10:13 am</span>
        <span>Cleared: 10:14 am</span>
      </div>
      <h3>Probable Causes:</h3>
      <ul className="compact-list">
        <li>Battery near end-of-life.</li>
        <li>Input AC failure.</li>
        <li>UPS overload.</li>
      </ul>
      <h3>Recommended Actions:</h3>
      <ul className="compact-list">
        <li>Check input power.</li>
        <li>Inspect battery condition.</li>
        <li>Reduce UPS load.</li>
      </ul>
    </SectionCard>
  )
}



function UpsPage({ alarms, onAcknowledge, onAction }) {
  const [tab, setTab] = useState('Active')
  const [filter, setFilter] = useState('All')
  const visibleAlarms = getVisibleAlarms(alarms, tab, filter)

  return (
    <div className="ups-layout">
      <UpsFleetSummary />
      <SectionCard title="Active Alarms" icon={Bell}>
        <Tabs filters tab={tab} onTabChange={setTab} filter={filter} onFilterChange={setFilter} />
        <div className="grouped-alarms">
          {visibleAlarms.length ? visibleAlarms.map((alarm) => (
            <article key={`${alarm.area}-${alarm.title}`} className="grouped-alarm">
              <p>{alarm.area}</p>
              <AlarmTable alarms={[alarm]} compact onAcknowledge={onAcknowledge} />
            </article>
          )) : <p className="empty-state">No UPS alarms in this view.</p>}
        </div>
        <Actions onAction={onAction} />
      </SectionCard>
    </div>
  )
}

function UpsFleetSummary() {
  const units = [
    { name: 'UPS 01', site: 'Server Room', mode: 'ON BATTERY', runtime: '1h 21min', load: '80%', output: '230V / 50Hz', alert: 'Critical Alarms', tone: 'danger' },
    { name: 'UPS 02', site: 'Server Room', mode: 'ON AC', runtime: '1h 42min', load: '87%', output: '230V / 50Hz', alert: 'No Critical Alarms', tone: 'ok' },
    { name: 'UPS 04', site: 'Toll Plaza', mode: 'BYPASS', runtime: '0h 20min', load: '80%', output: '230V / 50Hz', alert: 'Warnings', tone: 'warning' },
  ]

  return (
    <section className="ups-fleet" aria-label="UPS fleet status">
      {units.map((unit) => (
        <article className="ups-unit" key={unit.name}>
          <div className="ups-unit-head">
            <div>
              <strong>{unit.name}</strong>
              <span>{unit.site}</span>
            </div>
            <p className={`mode-chip ${unit.tone}`}>{unit.mode}</p>
          </div>
          <dl>
            <div><dt>Runtime</dt><dd>{unit.runtime}</dd></div>
            <div><dt>Load</dt><dd>{unit.load}</dd></div>
            <div><dt>Output</dt><dd>{unit.output}</dd></div>
          </dl>
          <p className={`unit-alert ${unit.tone}`}>{unit.alert}</p>
        </article>
      ))}
      <button type="button" className="ups-add-card" aria-label="Add UPS unit">
        <Plus size={42} />
      </button>
    </section>
  )
}



function SettingsPage({ onAction }) {
  return (
    <div className="settings-grid">
      <SettingsPanel title="System Parameters & Thresholds">
        <SliderRow label="Phase Voltage Tolerance" value="15 V" />
        <label className="setting-line"><span>Overload Trip Delay</span><input defaultValue="5 sec" /></label>
        <label className="setting-line"><span>Maintenance Alert Interval</span><input defaultValue="90 Days" /></label>
        <label className="setting-line"><span>Report Generation Frequency</span><select defaultValue="monthly"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label>
      </SettingsPanel>
      <SettingsPanel title="Notification & Alert Settings">
        <div className="check-row"><label><input type="checkbox" defaultChecked /> Email Alerts</label><label><input type="checkbox" defaultChecked /> SMS Alerts</label><label><input type="checkbox" /> Push Notifications</label></div>
        <label className="setting-line"><span>Critical Alarm Contact List</span><input defaultValue="Dispatch A, On-call Tech" /></label>
        <label className="setting-line"><span>Status Report Subscription</span><select defaultValue="summary"><option value="summary">Daily Summary</option><option value="incident">Incident Only</option></select></label>
        <label className="setting-line check"><span>Quiet Hours</span><input type="checkbox" defaultChecked /></label>
      </SettingsPanel>
      <SettingsPanel title="Advanced Options & User Permissions">
        <label className="setting-line"><span>User Role & Permissions</span><select defaultValue="tech"><option value="tech">Edit Permission</option><option value="view">View Only</option></select></label>
        <label className="setting-line"><span>Alarm Override Access</span><select defaultValue="allowed"><option value="allowed">Allowed</option><option value="blocked">Blocked</option></select></label>
        <label className="setting-line check"><span>Active Directory Sync</span><input type="checkbox" defaultChecked /></label>
        <label className="setting-line check"><span>Enable Two-Factor Authentication</span><input type="checkbox" defaultChecked /></label>
      </SettingsPanel>
      <SettingsPanel title="Network & Backup Configuration">
        <label className="setting-line"><span>Network Connectivity</span><select defaultValue="primary"><option value="primary">Primary</option><option value="backup">Backup SIM</option></select></label>
        <label className="setting-line"><span>Backup & Restore</span><input defaultValue="Drive K / Auto Sync" /></label>
        <label className="setting-line"><span>Assigned Backup</span><input defaultValue="Local Server" /></label>
        <label className="setting-line check"><span>Auto Backup Enabled</span><input type="checkbox" defaultChecked /></label>
      </SettingsPanel>
      <div className="settings-actions">
        <button type="button" onClick={() => onAction?.('Settings saved')}>Save Changes</button>
        <button type="button" className="ghost">Cancel</button>
      </div>
    </div>
  )
}

function SettingsPanel({ title, children }) {
  return (
    <SectionCard title={title} icon={SlidersHorizontal}>
      {children}
    </SectionCard>
  )
}

function SliderRow({ label, value }) {
  return (
    <label className="setting-line slider-line">
      <span>{label}</span>
      <span className="slider-control"><input type="range" defaultValue="68" /><strong>{value}</strong></span>
    </label>
  )
}

function ChartPanel({ title, variant, legend }) {
  const series = chartSeries[variant] ?? chartSeries.power

  return (
    <SectionCard title={title}>
      <div className={`chart-placeholder ${variant}`}>
        <svg viewBox="0 0 520 150" role="img" aria-label={`${title} chart placeholder`}>
          <g className="chart-grid-lines">
            <path d="M0 30 H520" />
            <path d="M0 75 H520" />
            <path d="M0 120 H520" />
          </g>
          <path className="line-a" d={buildLinePath(series.a)} />
          <path className="line-b" d={buildLinePath(series.b)} />
        </svg>
      </div>
      <div className="axis-labels"><span>9:00</span><span>10:00</span><span>11:00</span><span>12:00</span></div>
      <div className="chart-legend">
        {legend.map((item) => <span key={item}>{item}</span>)}
      </div>
    </SectionCard>
  )
}

function buildLinePath(values) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const width = 520
  const height = 118
  const top = 16
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = top + height - ((value - min) / range) * height
    return [x, y]
  })

  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

function ChartPlaceholder({ variant = 'cool' }) {
  return <div className={`mini-chart ${variant}`} aria-label="Chart placeholder" />
}

function Actions({ secondary = 'Create Maintenance ticket', onAction }) {
  return (
    <div className="actions">
      <button type="button" onClick={() => onAction?.('Report export queued')}><ClipboardList size={15} />Export Report</button>
      {secondary ? <button type="button" onClick={() => onAction?.(`${secondary} queued`)}><CheckCircle2 size={15} />{secondary}</button> : null}
    </div>
  )
}

function DashboardWorkspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [alarms, setAlarms] = useState(initialAlarmState)
  const [toast, setToast] = useState('')
  const toastTimer = useRef()

  const activePage = pathToPage[location.pathname] || 'Dashboard'

  function showToast(message) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  function acknowledgeAlarm(group, alarmId) {
    const acknowledgedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()

    setAlarms((current) => ({
      ...current,
      [group]: current[group].map((alarm) => (
        alarm.id === alarmId ? { ...alarm, status: 'acknowledged', acknowledgedAt } : alarm
      )),
    }))
    showToast('Alarm acknowledged')
  }

  return (
    <AppShell
      activePage={activePage}
      setActivePage={(item) => {
        navigate(item.path)
      }}
      alarms={alarms}
      onAcknowledge={acknowledgeAlarm}
      onAction={showToast}
      onLogout={() => {
        logout()
      }}
    >
      {toast ? <div className="toast">{toast}</div> : null}
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardWorkspace />} />
              <Route path="/generator" element={<DashboardWorkspace />} />
              <Route path="/ats" element={<DashboardWorkspace />} />
              <Route path="/ups" element={<DashboardWorkspace />} />
              <Route path="/mdp" element={<DashboardWorkspace />} />
              <Route path="/sdp" element={<DashboardWorkspace />} />
              <Route path="/settings" element={<DashboardWorkspace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
