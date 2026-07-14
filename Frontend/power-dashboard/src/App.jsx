import { createElement, useCallback, useEffect, useRef, useState } from 'react'
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
import { acknowledgeAlarm as acknowledgeAlarmRequest, getAlarms } from './api/alarmsApi'
import { getDashboardSummary } from './api/dashboardApi'
import { getEquipment, getEquipmentReadings, getEquipmentStatus } from './api/equipmentApi'
import './App.css'
import LiveGeneratorPage from './pages/GeneratorPage'
import LiveATSPage from './pages/ATSPage'
import LiveMDPPage from './pages/MDPPage'
import LiveSDPPage from './pages/SDPPage'

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

const dashboardAlarms = [
  {
    id: 'dash-ups-battery',
    source: 'UPS',
    subsystemType: 'UPS',
    subsystemId: 'UPS-01',
    alarmCode: 'UPS_BATTERY_LOW',
    alarmMessage: 'UPS battery charge has dropped below the warning threshold.',
    title: 'Battery Low',
    time: '10:15 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'ACTIVE',
    targetPage: '/ups',
  },
  {
    id: 'ups-recovered',
    area: 'UPS 02 - Server Room',
    subsystemType: 'UPS',
    subsystemId: 'UPS-02',
    alarmCode: 'UPS_BATTERY_LOW',
    alarmMessage: 'UPS 02 battery level returned to normal after charger recovery.',
    title: 'Battery Restored',
    time: '06:18 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'RESOLVED',
    triggeredAt: '05:55 am',
    resolvedAt: '06:18 am',
    targetPage: '/ups',
  },
  {
    id: 'dash-generator-start',
    source: 'Generator',
    subsystemType: 'GENERATOR',
    subsystemId: 'GENERATOR-01',
    alarmCode: 'GEN_FAULT',
    alarmMessage: 'Generator failed to start and is reporting a fault condition.',
    title: 'Fail to Start',
    time: '09:20 am',
    tone: 'danger',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    targetPage: '/generator',
  },
  {
    id: 'dash-mdp-phase',
    source: 'MDP',
    subsystemType: 'MDP',
    subsystemId: 'MDP-01',
    alarmCode: 'MDP_PHASE_IMBALANCE',
    alarmMessage: 'Phase difference across the main distribution panel is above the safe limit.',
    title: 'Phase Loss Warning',
    time: '08:50 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'ACTIVE',
    targetPage: '/mdp',
  },
]

const generatorAlarms = [
  {
    id: 'gen-coolant',
    subsystemType: 'GENERATOR',
    subsystemId: 'GENERATOR-01',
    alarmCode: 'GEN_HIGH_TEMP',
    alarmMessage: 'Radiator fan failed to start and generator temperature is above the limit.',
    title: 'High Coolant Temperature',
    detail: 'Radiator fan failed to start',
    time: '10:15 am',
    tone: 'danger',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    targetPage: '/generator',
  },
  {
    id: 'gen-fuel',
    subsystemType: 'GENERATOR',
    subsystemId: 'GENERATOR-01',
    alarmCode: 'GEN_LOW_FUEL',
    alarmMessage: 'Generator fuel level is below the warning threshold.',
    title: 'Low Fuel Warning',
    detail: 'Utility not available',
    time: '09:20 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'ACTIVE',
    targetPage: '/generator',
  },
  {
    id: 'gen-battery',
    subsystemType: 'GENERATOR',
    subsystemId: 'GENERATOR-01',
    alarmCode: 'GEN_INTRUDER',
    alarmMessage: 'Generator room battery support circuit is below the nominal range.',
    title: 'Battery Low Voltage',
    detail: 'Battery below normal charging range',
    time: '08:50 am',
    tone: 'danger',
    severity: 'WARNING',
    status: 'ACKNOWLEDGED',
    acknowledgedAt: '08:58 am',
    targetPage: '/generator',
  },
  {
    id: 'gen-recovery',
    subsystemType: 'GENERATOR',
    subsystemId: 'GENERATOR-01',
    alarmCode: 'GEN_HIGH_TEMP',
    alarmMessage: 'Generator temperature returned to normal after the cooling fan restarted.',
    title: 'Temperature Restored',
    detail: 'High coolant temperature alarm was created and later cleared.',
    time: '07:42 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'RESOLVED',
    triggeredAt: '07:15 am',
    resolvedAt: '07:42 am',
    targetPage: '/generator',
  },
]

const upsAlarms = [
  {
    id: 'ups-critical-low',
    area: 'UPS 01 - Server Room',
    subsystemType: 'UPS',
    subsystemId: 'UPS-01',
    alarmCode: 'UPS_BATTERY_CRITICAL',
    alarmMessage: 'UPS 01 battery charge is critically low and requires immediate action.',
    title: 'Battery Critically Low',
    time: '09:25 am',
    tone: 'danger',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    targetPage: '/ups',
  },
  {
    id: 'ups-output',
    area: 'UPS 01 - Server Room',
    subsystemType: 'UPS',
    subsystemId: 'UPS-01',
    alarmCode: 'UPS_FAULT',
    alarmMessage: 'UPS output circuit has failed and output power is not stable.',
    title: 'UPS Output Failure',
    time: '07:32 am',
    tone: 'danger',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    targetPage: '/ups',
  },
  {
    id: 'ups-low',
    area: 'UPS 02 - Server Room',
    subsystemType: 'UPS',
    subsystemId: 'UPS-02',
    alarmCode: 'UPS_BATTERY_LOW',
    alarmMessage: 'UPS 02 battery is below the warning threshold.',
    title: 'Battery Low',
    time: '08:45 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'ACTIVE',
    targetPage: '/ups',
  },
  {
    id: 'ups-internal',
    area: 'UPS 04 - Toll Plaza',
    subsystemType: 'UPS',
    subsystemId: 'UPS-04',
    alarmCode: 'UPS_FAULT',
    alarmMessage: 'UPS internal fault has been acknowledged by the operator.',
    title: 'UPS Internal Failure',
    time: '09:15 am',
    tone: 'danger',
    severity: 'CRITICAL',
    status: 'ACKNOWLEDGED',
    acknowledgedAt: '09:24 am',
    targetPage: '/ups',
  },
  {
    id: 'ups-overload',
    area: 'UPS 04 - Toll Plaza',
    subsystemType: 'UPS',
    subsystemId: 'UPS-04',
    alarmCode: 'UPS_HIGH_LOAD',
    alarmMessage: 'UPS load is above the safe operating limit.',
    title: 'Overload Warning',
    time: '08:21 am',
    tone: 'warning',
    severity: 'WARNING',
    status: 'ACTIVE',
    targetPage: '/ups',
  },
]

const _initialAlarmState = {
  dashboard: dashboardAlarms,
  generator: generatorAlarms,
  ats: generatorAlarms.slice(1).map((alarm) => ({ ...alarm, id: `ats-${alarm.id}` })),
  ups: upsAlarms,
  mdp: [
    {
      id: 'mdp-phase-r',
      subsystemType: 'MDP',
      subsystemId: 'MDP-01',
      alarmCode: 'MDP_PHASE_VOLTAGE',
      alarmMessage: 'Phase R breaker has automatically tripped due to an overload condition.',
      title: 'Phase R Tripped',
      detail: 'Phase R breaker has automatically tripped due to overload condition.',
      time: '10:15 am',
      tone: 'danger',
      severity: 'WARNING',
      status: 'ACTIVE',
      targetPage: '/mdp',
    },
    {
      id: 'mdp-imbalance',
      subsystemType: 'MDP',
      subsystemId: 'MDP-01',
      alarmCode: 'MDP_PHASE_IMBALANCE',
      alarmMessage: 'High and low voltage difference detected across the three phases.',
      title: 'Imbalanced Phase',
      detail: 'High/low voltage difference detected across three phases.',
      time: '08:50 am',
      tone: 'warning',
      severity: 'WARNING',
      status: 'ACKNOWLEDGED',
      acknowledgedAt: '09:05 am',
      targetPage: '/mdp',
    },
  ],
  sdp: [
    {
      id: 'sdp-lighting',
      subsystemType: 'SDP',
      subsystemId: 'SDP-01',
      alarmCode: 'SDP_PHASE_VOLTAGE',
      alarmMessage: 'Voltage on the downstream lighting section is outside the safe range.',
      title: 'Downstream Voltage Warning',
      detail: 'Voltage on downstream circuit is outside the safe range.',
      time: '10:05 am',
      tone: 'warning',
      severity: 'WARNING',
      status: 'ACTIVE',
      targetPage: '/sdp',
    },
    {
      id: 'sdp-intruder',
      subsystemType: 'SDP',
      subsystemId: 'SDP-02',
      alarmCode: 'SDP_INTRUDER',
      alarmMessage: 'Intruder alarm was detected in SDP-02 cabinet room.',
      title: 'Intruder Alarm',
      detail: 'Intruder alarm was detected in the cabinet room.',
      time: '09:35 am',
      tone: 'danger',
      severity: 'WARNING',
      status: 'ACKNOWLEDGED',
      acknowledgedAt: '09:42 am',
      targetPage: '/sdp',
    },
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

function Sidebar({ activePage, onNavigate, onLogout, dashboardSummary }) {
  const { user } = useAuth()
  const severityRank = { NORMAL: 0, OFFLINE: 1, WARNING: 2, CRITICAL: 3 }
  const statusByType = (dashboardSummary?.equipment ?? []).reduce((statuses, equipment) => {
    const type = String(equipment.equipmentType ?? '').toUpperCase()
    const nextStatus = String(equipment.overallStatus ?? 'OFFLINE').toUpperCase()
    const currentStatus = statuses[type]
    if (!currentStatus || (severityRank[nextStatus] ?? 1) > (severityRank[currentStatus] ?? 1)) {
      statuses[type] = nextStatus
    }
    return statuses
  }, {})
  const statusByNavItem = {
    Generator: statusByType.GENERATOR,
    'ATS Status': statusByType.ATS,
    'UPS Status': statusByType.UPS,
    'MDP Status': statusByType.MDP,
    'SDP Status': statusByType.SDP,
  }
  const statusColorMap = {
    NORMAL: 'bg-green-500',
    WARNING: 'bg-amber-500',
    CRITICAL: 'bg-red-500',
    OFFLINE: 'bg-slate-500',
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
            {statusByNavItem[item.label] ? (
              <span
                className={`w-2.5 h-2.5 rounded-full ${statusColorMap[statusByNavItem[item.label]] ?? 'bg-slate-500'} ml-auto mr-1`}
                title={`${item.label} status: ${statusByNavItem[item.label]}`}
              />
            ) : null}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function AppShell({ activePage, setActivePage, onLogout, alarms, dashboardSummary, dashboardSummaryAlarms, onAcknowledge, onAlarmNavigate, onAction, alarmFocus, children }) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} dashboardSummary={dashboardSummary} />
      <main className="workspace">
        <header className="page-header">
          <h1>{activePage}</h1>
        </header>
        {activePage === 'Dashboard' ? <DashboardPage alarms={dashboardSummaryAlarms} dashboardSummary={dashboardSummary} onAcknowledge={onAcknowledge} onNavigateAlarm={onAlarmNavigate} onAction={onAction} /> : null}
        {activePage === 'Generator' ? <LiveGeneratorPage /> : null}
        {activePage === 'ATS Status' ? <LiveATSPage /> : null}
        {activePage === 'UPS Status' ? <UpsPage alarms={alarms.ups} onAcknowledge={onAcknowledge} onAction={onAction} alarmFocus={alarmFocus} /> : null}
        {activePage === 'MDP Status' ? <LiveMDPPage /> : null}
        {activePage === 'SDP Status' ? <LiveSDPPage /> : null}
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
    const status = String(alarm.status ?? '').toUpperCase()
    const matchesTab =
      (tab === 'History' && status === 'RESOLVED') ||
      (tab === 'Active' && status === 'ACTIVE') ||
      (tab === 'Acknowledged' && status === 'ACKNOWLEDGED')
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Critical' && alarm.tone === 'danger') ||
      (filter === 'Warning' && alarm.tone === 'warning')

    return matchesTab && matchesFilter
  })
}

function getDashboardSummaryAlarms(alarmState) {
  return Object.entries(alarmState)
    .filter(([group]) => group !== 'dashboard')
    .flatMap(([, groupAlarms]) => groupAlarms)
}

function getAlarmStatusLabel(status) {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (!normalized) return 'Unknown'

  return normalized.charAt(0) + normalized.slice(1).toLowerCase()
}

function getAlarmStatusClass(status) {
  return String(status ?? '').trim().toLowerCase()
}

function getAlarmRoute(alarm) {
  return alarm.targetPage || ({
    GENERATOR: '/generator',
    ATS: '/ats',
    UPS: '/ups',
    MDP: '/mdp',
    SDP: '/sdp',
  }[alarm.subsystemType || alarm.source] ?? '/dashboard')
}

const emptyAlarmState = {
  generator: [],
  ats: [],
  ups: [],
  mdp: [],
  sdp: [],
}

function formatAlarmTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function toUiAlarm(alarm) {
  const equipmentType = String(alarm.equipmentType ?? alarm.subsystemType ?? '').toUpperCase()
  const equipmentCode = alarm.equipmentCode ?? alarm.subsystemId ?? equipmentType
  const severity = String(alarm.severity ?? 'WARNING').toUpperCase()

  return {
    ...alarm,
    subsystemType: equipmentType,
    subsystemId: equipmentCode,
    source: equipmentCode,
    title: alarm.alarmCode ?? 'Alarm',
    time: formatAlarmTime(alarm.triggeredAt),
    tone: severity === 'CRITICAL' ? 'danger' : 'warning',
    severity,
    targetPage: getAlarmRoute({ subsystemType: equipmentType }),
    triggeredAt: formatAlarmTime(alarm.triggeredAt),
    acknowledgedAt: formatAlarmTime(alarm.acknowledgedAt),
    resolvedAt: formatAlarmTime(alarm.resolvedAt),
  }
}

function groupAlarmsByEquipmentType(apiAlarms) {
  return apiAlarms.reduce((groups, alarm) => {
    const uiAlarm = toUiAlarm(alarm)
    const group = uiAlarm.subsystemType.toLowerCase()
    if (groups[group]) groups[group].push(uiAlarm)
    return groups
  }, { ...emptyAlarmState })
}

function getAlarmTab(status) {
  return ({ ACTIVE: 'Active', ACKNOWLEDGED: 'Acknowledged', RESOLVED: 'History' }[
    String(status ?? '').toUpperCase()
  ] ?? 'Active')
}

function formatReading(value, unit = '', fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  return `${value}${unit ? ` ${unit}` : ''}`
}

function getStatusTone(status) {
  return ({ NORMAL: 'ok', WARNING: 'warning', CRITICAL: 'danger', OFFLINE: 'warning' }[
    String(status ?? '').toUpperCase()
  ] ?? 'warning')
}

function toUpsUnit(equipment, status) {
  const reading = status.latestReading ?? {}
  const overallStatus = String(status.overallStatus ?? 'OFFLINE').toUpperCase()
  return {
    id: equipment.id,
    subsystemId: equipment.equipmentCode,
    equipmentCode: equipment.equipmentCode,
    displayName: equipment.displayName,
    site: equipment.location,
    mode: reading.operational_status ?? overallStatus,
    runtime: formatReading(reading.estimated_runtime_min, 'min'),
    load: formatReading(reading.load_pct, '%'),
    output: formatReading(reading.output_voltage_v, 'V'),
    input: formatReading(reading.input_voltage_v, 'V'),
    battery: formatReading(reading.battery_charge_pct, '%'),
    tone: getStatusTone(overallStatus),
    note: `${overallStatus.charAt(0) + overallStatus.slice(1).toLowerCase()} status recorded ${formatAlarmTime(status.recordedAt)}.`,
  }
}

function AlarmPanel({ title = 'Active Alarms', alarms, onAcknowledge, onNavigateAlarm, onAction, filters = false, compact = false, requestedTab }) {
  const [tab, setTab] = useState(() => requestedTab ?? 'Active')
  const [filter, setFilter] = useState('All')
  const visibleAlarms = getVisibleAlarms(alarms, tab, filter)

  async function handleAcknowledge(alarmId) {
    try {
      await onAcknowledge?.(alarmId)
      setTab('Acknowledged')
    } catch {
      // The shared acknowledgement handler presents the request error.
    }
  }

  return (
    <SectionCard title={title} icon={Bell}>
      <Tabs
        filters={filters}
        tab={tab}
        onTabChange={setTab}
        filter={filter}
        onFilterChange={setFilter}
      />
      <div className={`alarm-list-shell ${compact ? 'scrollable' : ''}`}>
        <AlarmTable alarms={visibleAlarms} compact={compact} onAcknowledge={handleAcknowledge} onNavigateAlarm={onNavigateAlarm} />
      </div>
      {!compact ? <Actions onAction={onAction} /> : null}
    </SectionCard>
  )
}

function AlarmTable({ alarms = [], compact = false, onAcknowledge, onNavigateAlarm }) {
  if (!alarms.length) {
    return <p className="empty-state">No alarms in this view.</p>
  }

  return (
    <div className="alarm-table">
      {alarms.map((alarm) => {
        const alarmStatus = String(alarm.status ?? '').toUpperCase()
        const alarmStatusLabel = getAlarmStatusLabel(alarm.status)
        const isAcknowledged = alarmStatus === 'ACKNOWLEDGED'

        return (
          <article
            className={`alarm-row ${compact ? 'compact' : 'full'} ${isAcknowledged ? 'acknowledged' : ''}`}
            key={alarm.id ?? `${alarm.title}-${alarm.time}`}
            role={compact ? 'button' : undefined}
            tabIndex={compact ? 0 : undefined}
            onClick={compact ? () => onNavigateAlarm?.(alarm, getAlarmRoute(alarm)) : undefined}
            onKeyDown={compact ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onNavigateAlarm?.(alarm, getAlarmRoute(alarm))
              }
            } : undefined}
          >
            <span className={`severity ${alarm.tone}`}>
              <AlertTriangle size={compact ? 15 : 18} />
            </span>
            <div className="alarm-main">
              <strong>{alarm.source ?? alarm.area ?? alarm.subsystemId ?? alarm.title}</strong>
              <span>
                {compact ? (
                  alarm.alarmMessage ?? alarm.detail ?? alarm.title
                ) : (
                  <>
                    <b>{alarm.alarmCode ?? alarm.title}</b>
                    <small>{alarm.alarmMessage ?? alarm.detail ?? alarm.title}</small>
                    {alarm.subsystemId ? <small>Subsystem: {alarm.subsystemId}</small> : null}
                    {isAcknowledged ? <small>Acknowledged by Admin at {alarm.acknowledgedAt}</small> : null}
                    {alarmStatus === 'RESOLVED' ? (
                      <>
                        <small>Created at {alarm.triggeredAt ?? alarm.time}</small>
                        <small>Closed at {alarm.resolvedAt ?? alarm.time}</small>
                      </>
                    ) : null}
                  </>
                )}
              </span>
            </div>
            <div className="alarm-meta">
              <time>{alarm.time}</time>
              {alarm.severity ? <p className={`alarm-severity ${alarm.severity.toLowerCase()}`}>{alarm.severity}</p> : null}
              <p className={`alarm-status ${getAlarmStatusClass(alarm.status)}`}>{alarmStatusLabel}</p>
            </div>
            {compact ? null : (
              <button
                type="button"
                disabled={isAcknowledged || alarmStatus === 'RESOLVED'}
                onClick={(event) => {
                  event.stopPropagation()
                  onAcknowledge?.(alarm.id)
                }}
              >
                {isAcknowledged ? `Acknowledged ${alarm.acknowledgedAt ?? ''}` : 'Acknowledge'}
              </button>
            )}
          </article>
        )
      })}
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

function DashboardPage({ alarms, dashboardSummary, onAcknowledge, onNavigateAlarm, onAction }) {
  const [showAllAlarms, setShowAllAlarms] = useState(false)
  const equipmentStatuses = dashboardSummary?.equipment ?? []

  return (
    <div className="dashboard-layout">
      <section className="status-strip" aria-label="Equipment status">
        {equipmentStatuses.length ? equipmentStatuses.map((equipment) => (
          <article className="status-card" key={equipment.equipmentId}>
            <h2>{equipment.displayName ?? equipment.equipmentCode}</h2>
            <div className="divider" />
            <p className={`status-pill ${getStatusTone(equipment.overallStatus)}`}>{equipment.overallStatus}</p>
          </article>
        )) : <p className="empty-state">Loading equipment status…</p>}
      </section>

      <div className="dashboard-grid">
        <SystemOverview />
        <div className="dashboard-stack">
          <AlarmPanel title="Alarm Summary" alarms={alarms} compact={!showAllAlarms} filters={showAllAlarms} onAcknowledge={onAcknowledge} onNavigateAlarm={onNavigateAlarm} onAction={onAction} />
          <div className="actions">
            <button type="button" onClick={() => setShowAllAlarms((current) => !current)}>
              {showAllAlarms ? 'Show summary' : 'View all alarms'}
            </button>
          </div>
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

function GeneratorPage({ alarms, onAcknowledge, onAction, alarmFocus }) {
  return (
    <>
      <MetricStrip page="Generator" />
      <div className="content-grid two-even">
        <ChartPanel title="Power & Voltage" variant="power" legend={['Power', 'Voltage']} />
        <ChartPanel title="Engine Parameters" variant="engine" legend={['Coolant Temp', 'Oil Pressure']} />
      </div>
      <div className="content-grid main-side">
        <AlarmPanel alarms={alarms} onAcknowledge={onAcknowledge} onAction={onAction} focusedAlarmId={alarmFocus?.id} requestedTab={alarmFocus?.tab} />
        <FaultDiagnosis title="High Coolant temperature" />
      </div>
      <SectionCard title="Generator Maintenance Snapshot" icon={ClipboardList}>
        <div className="snapshot-grid">
          <article><span>Last Service</span><strong>12 Feb 2026</strong></article>
          <article><span>Runtime Hours</span><strong>1,284 h</strong></article>
          <article><span>Next Test</span><strong>Weekly run</strong></article>
          <article><span>Assigned Team</span><strong>Electrical Ops</strong></article>
        </div>
      </SectionCard>
    </>
  )
}

function AtsPage({ alarms, onAcknowledge, onAction, alarmFocus }) {
  return (
    <>
      <MetricStrip page="ATS Status" />
      <div className="content-grid two-even">
        <SectionCard title="Utility Source">
          <div className="ats-flow">
            <svg className="ats-wires" viewBox="0 0 620 260" aria-hidden="true">
              <path className="wire utility" d="M115 82 H278" />
              <path className="wire generator" d="M122 190 V148 H278" />
              <path className="wire load" d="M340 116 H505" />
              <circle className="junction" cx="306" cy="116" r="8" />
            </svg>
            <div className="source green utility-node">UTILITY<span>415 V<br />50 Hz</span></div>
            <div className="source teal ats-node">ATS</div>
            <div className="source blue load-node">LOAD<span>100 Hz</span></div>
            <div className="source green generator-node">GENERATOR<span>400 V<br />50 Hz</span></div>
          </div>
        </SectionCard>
        <SectionCard title="Electrical Parameters" icon={Zap}>
          <dl className="parameter-list">
            <div><dt>Utility Voltage</dt><dd>415 V</dd></div>
            <div><dt>Generator Voltage L - L</dt><dd>400 V</dd></div>
            <div><dt>Frequency</dt><dd>50 Hz</dd></div>
            <div><dt>Phases</dt><dd><span className="phase r">R</span><span className="phase y">Y</span><span className="phase b">B</span></dd></div>
          </dl>
        </SectionCard>
      </div>
      <div className="content-grid main-side">
        <AlarmPanel alarms={alarms} onAcknowledge={onAcknowledge} onAction={onAction} focusedAlarmId={alarmFocus?.id} requestedTab={alarmFocus?.tab} />
        <SectionCard title="Transfer Events" icon={PlugZap}>
          <ul className="event-list">
            <li><strong>Transfer Failure</strong><span>10:12 am</span><p>Unable to connect to utility.</p></li>
            <li><strong>Load transferred to Generator</strong><span>10:12 am</span><p>Utility not available.</p></li>
            <li><strong>Load transferred to Utility</strong><span>09:15 am</span><p>Utility restored.</p></li>
          </ul>
          <Actions secondary="Initiate Test Transfer" onAction={onAction} />
        </SectionCard>
      </div>
    </>
  )
}

function UpsPage({ alarms, onAcknowledge, onAction, alarmFocus }) {
  const [units, setUnits] = useState([])
  const [loadingUnits, setLoadingUnits] = useState(true)
  const [unitsError, setUnitsError] = useState('')
  const [selectedUpsId, setSelectedUpsId] = useState(() => alarms.find((alarm) => String(alarm.id) === String(alarmFocus?.id))?.equipmentId ?? null)
  const [tab, setTab] = useState(() => alarmFocus?.tab ?? 'Active')
  const [filter, setFilter] = useState('All')
  const selectedUnit = units.find((unit) => String(unit.id) === String(selectedUpsId)) ?? units[0]
  const selectedUnitAlarms = alarms.filter((alarm) => String(alarm.equipmentId) === String(selectedUnit?.id))
  const visibleAlarms = getVisibleAlarms(selectedUnitAlarms, tab, filter)

  const refreshUps = useCallback(async () => {
    const equipment = await getEquipment({ type: 'UPS', enabled: true })
    const equipmentData = await Promise.all(equipment.map(async (item) => {
      const [status, readings] = await Promise.all([getEquipmentStatus(item.id), getEquipmentReadings(item.id, 1)])
      return { item, status, readings }
    }))
    const nextUnits = equipmentData.map(({ item, status, readings }) => toUpsUnit(item, {
      ...status,
      latestReading: status.latestReading ?? readings[0]?.data ?? {},
    }))
    setUnits(nextUnits)
    setSelectedUpsId((current) => {
      const focusedEquipmentId = alarms.find((alarm) => String(alarm.id) === String(alarmFocus?.id))?.equipmentId
      if (focusedEquipmentId && nextUnits.some((unit) => String(unit.id) === String(focusedEquipmentId))) return focusedEquipmentId
      return nextUnits.some((unit) => String(unit.id) === String(current)) ? current : (nextUnits[0]?.id ?? null)
    })
  }, [alarms, alarmFocus])

  useEffect(() => {
    let disposed = false
    const initialLoadId = window.setTimeout(() => {
      refreshUps()
        .catch((error) => { if (!disposed) setUnitsError(error.message || 'Unable to load UPS status.') })
        .finally(() => { if (!disposed) setLoadingUnits(false) })
    }, 0)
    const intervalId = window.setInterval(() => {
      refreshUps().catch(() => {})
    }, 5000)
    return () => {
      disposed = true
      window.clearTimeout(initialLoadId)
      window.clearInterval(intervalId)
    }
  }, [refreshUps])

  async function handleAcknowledge(alarmId) {
    try {
      await onAcknowledge(alarmId)
      setTab('Acknowledged')
    } catch {
      // The shared acknowledgement handler presents the request error.
    }
  }

  return (
    <div className="ups-layout">
      {loadingUnits ? <p className="empty-state">Loading UPS equipment…</p> : null}
      {unitsError ? <p className="empty-state">{unitsError}</p> : null}
      {selectedUnit ? <>
        <UpsFleetSummary
          units={units}
          selectedUpsId={selectedUpsId}
          selectedUnitAlarmCount={selectedUnitAlarms.length}
          onSelectUnit={setSelectedUpsId}
        />
        <SectionCard title={`Alarms - ${selectedUnit.displayName}`} icon={Bell}>
        <Tabs filters tab={tab} onTabChange={setTab} filter={filter} onFilterChange={setFilter} />
        <div className="grouped-alarms">
          {visibleAlarms.length ? visibleAlarms.map((alarm) => (
            <article key={`${alarm.area}-${alarm.title}`} className="grouped-alarm">
              <p>{alarm.area}</p>
              <AlarmTable alarms={[alarm]} onAcknowledge={handleAcknowledge} />
            </article>
          )) : <p className="empty-state">No UPS alarms in this view.</p>}
        </div>
        <Actions onAction={onAction} />
        </SectionCard>
      </> : null}
    </div>
  )
}

function UpsFleetSummary({ units, selectedUpsId, selectedUnitAlarmCount, onSelectUnit }) {
  const selectedUnit = units.find((unit) => unit.subsystemId === selectedUpsId) ?? units[0]

  return (
    <SectionCard title="UPS Fleet Overview" icon={Power}>
      <div className="ups-selected-summary">
        <div>
          <p className="ups-selected-label">Selected equipment</p>
          <strong>{selectedUnit.displayName}</strong>
          <span>{selectedUnit.site}</span>
        </div>
        <div className={`mode-chip ${selectedUnit.tone}`}>{selectedUnit.mode}</div>
      </div>
      <dl className="ups-selected-metrics">
        <div><dt>Runtime</dt><dd>{selectedUnit.runtime}</dd></div>
        <div><dt>Load</dt><dd>{selectedUnit.load}</dd></div>
        <div><dt>Battery</dt><dd>{selectedUnit.battery}</dd></div>
        <div><dt>Output</dt><dd>{selectedUnit.output}</dd></div>
        <div><dt>Input</dt><dd>{selectedUnit.input}</dd></div>
        <div><dt>Contextual alarms</dt><dd>{selectedUnitAlarmCount}</dd></div>
      </dl>
      <p className="ups-selected-note">{selectedUnit.note}</p>
      <section className="ups-fleet" aria-label="UPS fleet status">
        {units.map((unit) => (
          <article
            className={`ups-unit ${String(selectedUpsId) === String(unit.id) ? 'selected' : ''}`}
            key={unit.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectUnit(unit.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectUnit(unit.id)
              }
            }}
          >
            <div className="ups-unit-head">
              <div>
                <strong>{unit.displayName}</strong>
                <span>{unit.site}</span>
              </div>
              <p className={`mode-chip ${unit.tone}`}>{unit.mode}</p>
            </div>
            <dl>
              <div><dt>Runtime</dt><dd>{unit.runtime}</dd></div>
              <div><dt>Load</dt><dd>{unit.load}</dd></div>
              <div><dt>Output</dt><dd>{unit.output}</dd></div>
            </dl>
            <p className={`unit-alert ${unit.tone}`}>{unit.note}</p>
          </article>
        ))}
        <button type="button" className="ups-add-card" aria-label="Add UPS unit">
          <Plus size={42} />
        </button>
      </section>
    </SectionCard>
  )
}

function MdpPage({ alarms, onAcknowledge, onAction, alarmFocus }) {
  return (
    <div className="mdp-layout">
      <div className="state-bar">
        <span>Current Status</span>
        <strong>Normal</strong>
      </div>
      <SectionCard title="Phase Status" icon={Gauge}>
        <div className="phase-grid">
          {['Phase R', 'Phase Y', 'Phase B'].map((phase, index) => (
            <article className="phase-card" key={phase}>
              <h3>{phase}</h3>
              <dl>
                <div><dt>Voltage</dt><dd>{index === 1 ? '228 V' : index === 2 ? '0 V' : '230 V'}</dd></div>
                <div><dt>Current</dt><dd>{index === 2 ? '0 A' : `${index === 1 ? '41' : '42'} A`}</dd></div>
                <div><dt>Status</dt><dd className={index === 2 ? 'bad' : 'good'}>{index === 2 ? 'Tripped' : 'Okay'}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Panel Protection Summary" icon={ShieldCheck}>
        <div className="snapshot-grid">
          <article><span>Earth Fault Relay</span><strong>Healthy</strong></article>
          <article><span>Overcurrent Relay</span><strong>Healthy</strong></article>
          <article><span>Surge Protection</span><strong>Online</strong></article>
          <article><span>Thermal Margin</span><strong>12%</strong></article>
        </div>
      </SectionCard>
      <AlarmPanel alarms={alarms} onAcknowledge={onAcknowledge} onAction={onAction} focusedAlarmId={alarmFocus?.id} requestedTab={alarmFocus?.tab} />
    </div>
  )
}

function SdpPage({ alarms, onAcknowledge, onAction, alarmFocus }) {
  const loads = [
    { name: 'Highway Lighting Section A', status: 'ON', active: '48/50', power: '1.2kW', voltage: '228 V', tone: 'ok' },
    { name: 'CCTV Cluster Section A', status: 'ON', active: '12/12', power: '0.8kW', voltage: '230 V', tone: 'ok' },
    { name: 'Emergency Call Boxes', status: 'Standby', active: '48/50', power: '1.2kW', voltage: '228 V', tone: 'warning' },
    { name: 'Highway Lighting Section B', status: 'ON', active: '2/2', power: '0.4kW', voltage: '229 V', tone: 'ok' },
  ]

  return (
    <>
      <SectionCard title="Load Distribution" icon={ServerCog}>
        <div className="load-grid">
          {loads.map((load) => (
            <article className="load-card" key={load.name}>
              <h3>{load.name}</h3>
              <p className={`status-chip ${load.tone === 'warning' ? 'warning' : ''}`}>{load.status}</p>
              <dl>
                <div><dt>Active Poles</dt><dd>{load.active}</dd></div>
                <div><dt>Power Draw</dt><dd>{load.power}</dd></div>
                <div><dt>Voltage</dt><dd>{load.voltage}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </SectionCard>
      <div className="content-grid main-side">
        <SectionCard title="Maintenance Schedule" icon={ClipboardList}>
          <div className="schedule-table">
            <div><strong>Service Item</strong><strong>Due Date</strong><strong>Status</strong><strong>Action</strong></div>
            <div><span>SPD Replacement</span><span>15 Nov 2026</span><em>Pending</em><button type="button" onClick={() => onAction?.('SPD task opened')}>View Task</button></div>
            <div><span>Lighting Section A</span><span>15 Nov 2026</span><em>Scheduled</em><button type="button" onClick={() => onAction?.('Lighting task opened')}>View Task</button></div>
            <div><span>CCTV Power Supply Audit</span><span>15 Nov 2026</span><em>Upcoming</em><button type="button" onClick={() => onAction?.('CCTV task opened')}>View Task</button></div>
          </div>
        </SectionCard>
        <AlarmPanel title="Active Alarms" alarms={alarms} onAcknowledge={onAcknowledge} onAction={onAction} focusedAlarmId={alarmFocus?.id} requestedTab={alarmFocus?.tab} />
        <SectionCard title="Environmental Monitoring">
          <p className="large-status">Cabinet Temp <strong>20C</strong></p>
          <p className="large-status">Cabinet Door <strong>Closed</strong></p>
        </SectionCard>
      </div>
    </>
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
  const [alarms, setAlarms] = useState(emptyAlarmState)
  const [dashboardSummary, setDashboardSummary] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef()

  const activePage = pathToPage[location.pathname] || 'Dashboard'

  const showToast = useCallback((message) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }, [])

  const refreshMonitoring = useCallback(async () => {
    const [records, summary] = await Promise.all([getAlarms(), getDashboardSummary()])
    setAlarms(groupAlarmsByEquipmentType(records))
    setDashboardSummary(summary)
  }, [])

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      refreshMonitoring().catch((error) => showToast(`Unable to load monitoring data: ${error.message}`))
    }, 0)
    const intervalId = window.setInterval(() => {
      refreshMonitoring().catch(() => {})
    }, 10000)
    return () => {
      window.clearTimeout(initialLoadId)
      window.clearInterval(intervalId)
    }
  }, [refreshMonitoring, showToast])

  async function acknowledgeAlarm(alarmId) {
    try {
      await acknowledgeAlarmRequest(alarmId)
      await refreshMonitoring()
      showToast('Alarm acknowledged')
    } catch (error) {
      showToast(`Unable to acknowledge alarm: ${error.message}`)
      throw error
    }
  }

  function openAlarm(alarm, path) {
    if (path) {
      navigate(path, { state: { alarmId: alarm.id, tab: getAlarmTab(alarm.status) } })
      showToast(`${alarm.source ?? alarm.title} alarm opened`)
    }
  }

  const dashboardSummaryAlarms = getDashboardSummaryAlarms(alarms)

  return (
    <AppShell
      activePage={activePage}
      setActivePage={(item) => {
        navigate(item.path)
      }}
      alarms={alarms}
      dashboardSummary={dashboardSummary}
      dashboardSummaryAlarms={dashboardSummaryAlarms}
      onAcknowledge={acknowledgeAlarm}
      onAlarmNavigate={openAlarm}
      alarmFocus={location.state?.alarmId ? { id: location.state.alarmId, tab: location.state.tab } : null}
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
