import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  PanelTop,
  PlugZap,
  Power,
  ServerCog,
  Settings,
  UserRound,
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
import PredictionsPage from './pages/PredictionsPage'
import OperationsPage from './pages/OperationsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import DiagnosisPanel from './components/DiagnosisPanel'
import PredictionPanel from './components/PredictionPanel'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Generator', path: '/generator', icon: Gauge },
  { label: 'ATS Status', path: '/ats', icon: PlugZap },
  { label: 'UPS Status', path: '/ups', icon: Power },
  { label: 'MDP Status', path: '/mdp', icon: PanelTop },
  { label: 'SDP Status', path: '/sdp', icon: ServerCog },
  { label: 'Predictions', path: '/predictions', icon: BrainCircuit },
  { label: 'Operations', path: '/operations', icon: ClipboardList },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Profile', path: '/profile', icon: UserRound },
  { label: 'Log out', icon: LogOut },
]

const pathToPage = {
  '/dashboard': 'Dashboard',
  '/generator': 'Generator',
  '/ats': 'ATS Status',
  '/ups': 'UPS Status',
  '/mdp': 'MDP Status',
  '/sdp': 'SDP Status',
  '/predictions': 'Predictions',
  '/operations': 'Operations',
  '/settings': 'Settings',
  '/profile': 'Profile',
}

const pageHeaderCopy = {
  Dashboard: { eyebrow: 'POWER OPERATIONS', title: 'Dashboard', subtitle: 'Live overview of your monitored power network' },
  Generator: { eyebrow: 'EQUIPMENT MONITORING', title: 'Generator Operations', subtitle: 'Fuel, load, and alternator health' },
  'ATS Status': { eyebrow: 'EQUIPMENT MONITORING', title: 'Automatic Transfer Switch', subtitle: 'Mains, generator, and transfer readiness' },
  'UPS Status': { eyebrow: 'EQUIPMENT MONITORING', title: 'Uninterruptible Power', subtitle: 'Fleet health, battery resilience, and runtime' },
  'MDP Status': { eyebrow: 'EQUIPMENT MONITORING', title: 'Main Distribution Panel', subtitle: 'Phase balance, load, and protection status' },
  'SDP Status': { eyebrow: 'EQUIPMENT MONITORING', title: 'Sub Distribution Panels', subtitle: 'Branch power health and local conditions' },
  Predictions: { eyebrow: 'FAILURE INTELLIGENCE', title: 'Prediction Center', subtitle: 'Risk signals and six-hour failure forecasts' },
  Operations: { eyebrow: 'MAINTENANCE CONTROL', title: 'Operations Workspace', subtitle: 'Maintenance tickets and reports' },
  Settings: { eyebrow: 'SYSTEM CONFIGURATION', title: 'Settings', subtitle: 'Users, equipment, alarm thresholds and system status' },
  Profile: { eyebrow: 'ACCOUNT', title: 'My Profile', subtitle: 'Your account details and password' },
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
        <img className="signin-logo" src="/expressway-logo.jpg" alt="Expressway logo" />
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
        </div>
      </form>
    </main>
  )
}

function Sidebar({ activePage, onNavigate, onLogout, dashboardSummary }) {
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
      <div className="sidebar-brand">
        <img src="/expressway-logo.jpg" alt="Expressway logo" />
        <div>
          <strong>EXPRESSWAY</strong>
          <span>Power Monitoring</span>
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

function AppShell({ activePage, setActivePage, onLogout, alarms, dashboardSummary, dashboardSummaryAlarms, onAcknowledge, onAlarmNavigate, onCreateTicketFromAlarm, onAction, alarmFocus, children }) {
  const headerCopy = pageHeaderCopy[activePage] ?? { eyebrow: 'POWER OPERATIONS', title: activePage, subtitle: '' }
  const headerIcon = navItems.find((item) => item.label === activePage)?.icon ?? Gauge

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} dashboardSummary={dashboardSummary} />
      <main className="workspace">
        <header className="page-header">
          <div className="page-header-icon"><HeaderIcon icon={headerIcon} /></div>
          <div className="page-header-copy">
            <h1>{headerCopy.title}</h1>
          </div>
        </header>
        {activePage === 'Dashboard' ? <DashboardPage alarms={dashboardSummaryAlarms} dashboardSummary={dashboardSummary} onAcknowledge={onAcknowledge} onNavigateAlarm={onAlarmNavigate} onCreateTicketFromAlarm={onCreateTicketFromAlarm} onAction={onAction} /> : null}
        {activePage === 'Generator' ? <LiveGeneratorPage onAcknowledge={onAcknowledge} onCreateTicketFromAlarm={onCreateTicketFromAlarm} /> : null}
        {activePage === 'ATS Status' ? <LiveATSPage onAcknowledge={onAcknowledge} onCreateTicketFromAlarm={onCreateTicketFromAlarm} /> : null}
        {activePage === 'UPS Status' ? <UpsPage alarms={alarms.ups} onAcknowledge={onAcknowledge} onCreateTicketFromAlarm={onCreateTicketFromAlarm} onAction={onAction} alarmFocus={alarmFocus} /> : null}
        {activePage === 'MDP Status' ? <LiveMDPPage onAcknowledge={onAcknowledge} onCreateTicketFromAlarm={onCreateTicketFromAlarm} /> : null}
        {activePage === 'SDP Status' ? <LiveSDPPage onAcknowledge={onAcknowledge} onCreateTicketFromAlarm={onCreateTicketFromAlarm} /> : null}
        {activePage === 'Predictions' ? <PredictionsPage /> : null}
        {activePage === 'Operations' ? <OperationsPage /> : null}
        {activePage === 'Settings' ? <SettingsPage /> : null}
        {activePage === 'Profile' ? <ProfilePage /> : null}
        {children}
      </main>
    </div>
  )
}

function HeaderIcon({ icon: Icon }) {
  return <Icon size={25} strokeWidth={2.3} />
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
      (tab === 'History' && ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)) ||
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

function getTicketPriorityFromAlarm(alarm) {
  return String(alarm?.severity ?? '').toUpperCase() === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
}

function getAssignedGroupFromEquipmentType(equipmentType) {
  return ({
    GENERATOR: 'Mechanical Team',
    ATS: 'Electrical Team',
    UPS: 'Electrical Team',
    MDP: 'Electrical Team',
    SDP: 'Electrical Team',
  }[String(equipmentType ?? '').toUpperCase()] ?? 'Operations Team')
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
  const number = Number(value)
  const text = Number.isFinite(number) ? number.toFixed(1) : value
  return `${text}${unit ? ` ${unit}` : ''}`
}

function toTitleCase(value) {
  const text = String(value ?? '').replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
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
    status: overallStatus,
    mode: reading.operational_status ? toTitleCase(reading.operational_status) : '—',
    runtime: formatReading(reading.estimated_runtime_min, 'min'),
    load: formatReading(reading.load_pct, '%'),
    output: formatReading(reading.output_voltage_v, 'V'),
    input: formatReading(reading.input_voltage_v, 'V'),
    battery: formatReading(reading.battery_charge_pct, '%'),
    tone: getStatusTone(overallStatus),
    note: `${toTitleCase(overallStatus)} status recorded ${formatAlarmTime(status.recordedAt)}.`,
  }
}

function AlarmPanel({ title = 'Active Alarms', alarms, onAcknowledge, onNavigateAlarm, onCreateTicketFromAlarm, onAction, filters = false, compact = false, requestedTab }) {
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
        <AlarmTable alarms={visibleAlarms} compact={compact} onAcknowledge={handleAcknowledge} onNavigateAlarm={onNavigateAlarm} onCreateTicketFromAlarm={onCreateTicketFromAlarm} showActions={tab !== 'History'} />
      </div>
      {!compact ? <Actions onAction={onAction} /> : null}
    </SectionCard>
  )
}

function AlarmTable({ alarms = [], compact = false, onAcknowledge, onNavigateAlarm, onCreateTicketFromAlarm, showActions = true }) {
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
            key={`${alarm.id ?? `${alarm.title}-${alarm.time}`}-${alarm.status}`}
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
            {compact || !showActions ? null : (
              <div className="alarm-row-actions">
                <button
                  type="button"
                  className="alarm-action"
                  disabled={alarmStatus !== 'ACTIVE'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onAcknowledge?.(alarm.id)
                  }}
                >
                  {isAcknowledged ? `Acknowledged ${alarm.acknowledgedAt ?? ''}` : 'Acknowledge'}
                </button>
                {onCreateTicketFromAlarm ? (
                  <button
                    type="button"
                    className="alarm-action secondary"
                    onClick={(event) => {
                      event.stopPropagation()
                      onCreateTicketFromAlarm(alarm)
                    }}
                  >
                    Create ticket
                  </button>
                ) : null}
              </div>
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

function DashboardPage({ alarms, dashboardSummary, onAcknowledge, onNavigateAlarm, onCreateTicketFromAlarm, onAction }) {
  const navigate = useNavigate()
  const [showAllAlarms, setShowAllAlarms] = useState(false)
  const equipmentStatuses = dashboardSummary?.equipment ?? []
  const activeAlarms = alarms.filter((alarm) => String(alarm.status ?? '').toUpperCase() === 'ACTIVE').length
  const criticalAlarms = alarms.filter((alarm) => String(alarm.severity ?? '').toUpperCase() === 'CRITICAL' && String(alarm.status ?? '').toUpperCase() !== 'RESOLVED').length
  const onlineEquipment = equipmentStatuses.filter((equipment) => String(equipment.overallStatus ?? '').toUpperCase() !== 'OFFLINE').length

  return (
    <div className="dashboard-layout">
      <section className="dashboard-kpi-strip" aria-label="System summary">
        <article>
          <span>System state</span>
          <strong className={criticalAlarms ? 'critical' : activeAlarms ? 'warning' : 'normal'}>
            {criticalAlarms ? 'Critical attention' : activeAlarms ? 'Monitoring alerts' : 'All clear'}
          </strong>
        </article>
        <article>
          <span>Active alarms</span>
          <strong>{activeAlarms}</strong>
        </article>
        <article>
          <span>Critical alarms</span>
          <strong className={criticalAlarms ? 'critical' : ''}>{criticalAlarms}</strong>
        </article>
        <article>
          <span>Equipment online</span>
          <strong>{onlineEquipment}/{equipmentStatuses.length || '—'}</strong>
        </article>
      </section>
      <section className="status-strip" aria-label="Equipment status">
        {equipmentStatuses.length ? equipmentStatuses.map((equipment) => (
          <article
            className="status-card"
            key={equipment.equipmentId}
            role="link"
            tabIndex={0}
            onClick={() => navigate(getAlarmRoute({ subsystemType: equipment.equipmentType }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(getAlarmRoute({ subsystemType: equipment.equipmentType }))
              }
            }}
          >
            <h2>{equipment.displayName ?? equipment.equipmentCode}</h2>
            <div className="divider" />
            <p className={`status-pill ${statusClass(equipment.overallStatus)}`}>{equipment.overallStatus}</p>
          </article>
        )) : <p className="empty-state">Loading equipment status…</p>}
      </section>

      <div className="dashboard-grid">
        <SystemOverview equipment={equipmentStatuses} />
        <div className="dashboard-stack">
          <AlarmPanel title="Alarm Summary" alarms={alarms} compact={!showAllAlarms} filters={showAllAlarms} onAcknowledge={onAcknowledge} onNavigateAlarm={onNavigateAlarm} onCreateTicketFromAlarm={onCreateTicketFromAlarm} onAction={onAction} />
          <div className="actions">
            <button type="button" onClick={() => setShowAllAlarms((current) => !current)}>
              {showAllAlarms ? 'Show summary' : 'View all alarms'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemOverview({ equipment }) {
  const severityRank = { NORMAL: 0, OFFLINE: 1, WARNING: 2, CRITICAL: 3 }
  const nodeForType = (type, fallbackLabel) => {
    const matchingEquipment = equipment.filter((item) => item.equipmentType === type)
    const worst = matchingEquipment.reduce((current, item) => {
      const status = String(item.overallStatus ?? 'OFFLINE').toUpperCase()
      return !current || severityRank[status] > severityRank[current.status]
        ? { status, equipmentCode: item.equipmentCode }
        : current
    }, null)
    return {
      label: matchingEquipment.length > 1 ? `${type} FLEET` : worst?.equipmentCode ?? fallbackLabel,
      status: worst?.status ?? 'OFFLINE',
      alarmCount: matchingEquipment.reduce((total, item) => total + (item.unresolvedAlarmCount ?? 0), 0),
    }
  }
  const groups = [
    { label: 'Generation & Transfer', nodes: [nodeForType('GENERATOR', 'GENERATOR'), nodeForType('ATS', 'ATS')] },
    { label: 'Distribution', nodes: [nodeForType('MDP', 'MDP'), nodeForType('SDP', 'SDP')] },
    { label: 'Critical Power', nodes: [nodeForType('UPS', 'UPS')] },
  ]

  return (
    <section className="system-overview" aria-label="Live system overview">
      <h2>Live System Overview</h2>
      <p className="system-overview-note">Live equipment health and unresolved alarms.</p>
      <div className="divider" />
      <div className="topology-groups">
        {groups.map((group) => (
          <section className="topology-group" key={group.label}>
            <h3>{group.label}</h3>
            <div className="topology-nodes">
              {group.nodes.map((node) => <TopologyNode key={node.label} {...node} />)}
            </div>
          </section>
        ))}
      </div>
      <div className="legend" aria-label="Status legend">
        <span className="normal"><i />Normal</span>
        <span className="warning"><i />Warning</span>
        <span className="critical"><i />Critical</span>
        <span className="offline"><i />Offline</span>
      </div>
    </section>
  )
}

function TopologyNode({ label, status, alarmCount }) {
  return (
    <div className={`topology-node ${statusClass(status)}`} title={`${label}: ${status}`}>
      <strong>{label}</strong>
      <small>{status} · {alarmCount} unresolved</small>
    </div>
  )
}

function statusClass(status) {
  return String(status ?? 'OFFLINE').toLowerCase()
}

function UpsPage({ alarms, onAcknowledge, onCreateTicketFromAlarm, onAction, alarmFocus }) {
  const [units, setUnits] = useState([])
  const [loadingUnits, setLoadingUnits] = useState(true)
  const [unitsError, setUnitsError] = useState('')
  const [selectedUpsId, setSelectedUpsId] = useState(() => alarms.find((alarm) => String(alarm.id) === String(alarmFocus?.id))?.equipmentId ?? null)
  const [activeUpsTab, setActiveUpsTab] = useState('Overview')
  const [readingsByUnit, setReadingsByUnit] = useState({})
  const [tab, setTab] = useState(() => alarmFocus?.tab ?? 'Active')
  const [filter, setFilter] = useState('All')
  const selectedUnit = units.find((unit) => String(unit.id) === String(selectedUpsId)) ?? units[0]
  const selectedUnitAlarms = alarms.filter((alarm) => String(alarm.equipmentId) === String(selectedUnit?.id))
  const selectedUnitAlarmCount = selectedUnitAlarms.filter((alarm) => ['ACTIVE', 'ACKNOWLEDGED'].includes(String(alarm.status ?? '').toUpperCase())).length
  const selectedReadings = readingsByUnit[String(selectedUnit?.id)] ?? []
  const visibleAlarms = getVisibleAlarms(selectedUnitAlarms, tab, filter)

  const refreshUps = useCallback(async () => {
    const equipment = await getEquipment({ type: 'UPS', enabled: true })
    const equipmentData = await Promise.all(equipment.map(async (item) => {
      const [status, readings] = await Promise.all([getEquipmentStatus(item.id), getEquipmentReadings(item.id, 12)])
      return { item, status, readings }
    }))
    setReadingsByUnit((current) => Object.fromEntries(equipmentData.map(({ item, readings }) => [String(item.id), readings ?? current[String(item.id)] ?? []])))
    const nextUnits = equipmentData.map(({ item, status, readings }) => toUpsUnit(item, {
      ...status,
      latestReading: status.latestReading ?? readings[0]?.data ?? {},
    }))
    setUnits(nextUnits)
    setUnitsError('')
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
          selectedUnitAlarmCount={selectedUnitAlarmCount}
          onSelectUnit={setSelectedUpsId}
        />
        <div className="ups-workspace-tabs" role="tablist" aria-label="UPS details">
          {['Overview', 'Alarms', 'Diagnosis', 'Prediction'].map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={activeUpsTab === item}
              className={activeUpsTab === item ? 'active' : ''}
              onClick={() => setActiveUpsTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {activeUpsTab === 'Overview' ? (
          <SectionCard title="UPS Overview" icon={Power}>
            <UpsMiniTrends readings={selectedReadings} />
          </SectionCard>
        ) : null}
        {activeUpsTab === 'Alarms' ? (
          <SectionCard title={`Alarms - ${selectedUnit.displayName}`} icon={Bell}>
            <Tabs filters tab={tab} onTabChange={setTab} filter={filter} onFilterChange={setFilter} />
            <div className="grouped-alarms">
              {visibleAlarms.length ? visibleAlarms.map((alarm) => (
                <article key={`${alarm.area}-${alarm.title}`} className="grouped-alarm">
                  <p>{alarm.area}</p>
                  <AlarmTable alarms={[alarm]} onAcknowledge={handleAcknowledge} onCreateTicketFromAlarm={onCreateTicketFromAlarm} />
                </article>
              )) : <p className="empty-state">No UPS alarms in this view.</p>}
            </div>
            <Actions onAction={onAction} />
          </SectionCard>
        ) : null}
        {activeUpsTab === 'Diagnosis' ? <DiagnosisPanel alarms={selectedUnitAlarms} title="UPS Fault Diagnosis" /> : null}
        {activeUpsTab === 'Prediction' ? <PredictionPanel equipmentId={selectedUnit.id} alarms={selectedUnitAlarms} title="UPS Prediction" /> : null}
      </> : null}
    </div>
  )
}

function UpsFleetSummary({ units, selectedUpsId, selectedUnitAlarmCount, onSelectUnit }) {
  const selectedUnit = units.find((unit) => String(unit.id) === String(selectedUpsId)) ?? units[0]

  return (
    <SectionCard title="UPS Fleet Overview" icon={Power}>
      <div className="ups-selected-summary">
        <div>
          <p className="ups-selected-label">Selected equipment</p>
          <strong>{selectedUnit.displayName}</strong>
          <span>{selectedUnit.site}</span>
        </div>
        <div className={`mode-chip ${selectedUnit.tone}`}>{selectedUnit.status}</div>
      </div>
      <dl className="ups-selected-metrics">
        <div><dt>Mode</dt><dd>{selectedUnit.mode}</dd></div>
        <div><dt>Contextual alarms</dt><dd>{selectedUnitAlarmCount}</dd></div>
        <div><dt>Runtime</dt><dd>{selectedUnit.runtime}</dd></div>
        <div><dt>Load</dt><dd>{selectedUnit.load}</dd></div>
        <div><dt>Battery</dt><dd>{selectedUnit.battery}</dd></div>
        <div><dt>Output</dt><dd>{selectedUnit.output}</dd></div>
        <div><dt>Input</dt><dd>{selectedUnit.input}</dd></div>
      </dl>
      <p className="ups-selected-note">{selectedUnit.note}</p>
      <section className="ups-fleet ups-fleet-compact" aria-label="UPS fleet status">
        {units.map((unit) => (
          <article
            className={`ups-unit ${String(selectedUpsId) === String(unit.id) ? 'selected' : ''}`}
            key={`ups-unit-${unit.id}`}
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
              <p className={`mode-chip ${unit.tone}`}>{unit.status}</p>
            </div>
            <dl>
              <div><dt>Mode</dt><dd>{unit.mode}</dd></div>
              <div><dt>Runtime</dt><dd>{unit.runtime}</dd></div>
              <div><dt>Load</dt><dd>{unit.load}</dd></div>
              <div><dt>Output</dt><dd>{unit.output}</dd></div>
            </dl>
            <p className={`unit-alert ${unit.tone}`}>{unit.note}</p>
          </article>
        ))}
      </section>
    </SectionCard>
  )
}

function UpsMiniTrends({ readings }) {
  // Fixed scales per metric, so steady values look steady and real changes are visible.
  const metrics = [
    { key: 'battery_charge_pct', label: 'Battery', unit: '%', color: 'var(--green)', min: 0, max: 100 },
    { key: 'load_pct', label: 'Load', unit: '%', color: 'var(--cyan)', min: 0, max: 100 },
    { key: 'output_voltage_v', label: 'Output', unit: 'V', color: 'var(--amber)', min: 200, max: 250 },
  ]
  // The API returns readings newest first; trends read left (oldest) to right (latest).
  const chronological = [...readings].reverse()

  return (
    <div className="ups-mini-trends">
      {metrics.map((metric) => {
        const values = chronological.map((reading) => Number(reading.data?.[metric.key])).filter(Number.isFinite).slice(-12)
        const latest = values.at(-1)
        const scaled = (value) => Math.min(100, Math.max(8, ((value - metric.min) / (metric.max - metric.min)) * 100))
        return (
          <article className="ups-mini-trend" key={metric.key}>
            <div className="ups-mini-trend-heading">
              <span>{metric.label}</span>
              <strong>{latest === undefined ? '--' : `${latest.toFixed(1)} ${metric.unit}`}</strong>
            </div>
            <div className="ups-mini-bars" aria-label={`${metric.label} recent trend`}>
              {values.length ? values.map((value, index) => (
                <i key={`${metric.key}-${index}`} title={`${value.toFixed(1)} ${metric.unit}`} style={{ height: `${scaled(value)}%`, background: metric.color }} />
              )) : <span className="ups-mini-empty">Waiting for readings</span>}
            </div>
          </article>
        )
      })}
    </div>
  )
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
    return records
  }, [])

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      refreshMonitoring().catch((error) => showToast(`Unable to load monitoring data: ${error.message}`))
    }, 0)
    const intervalId = window.setInterval(() => {
      refreshMonitoring().catch(() => {})
    }, 5000)
    return () => {
      window.clearTimeout(initialLoadId)
      window.clearInterval(intervalId)
    }
  }, [refreshMonitoring, showToast])

  async function acknowledgeAlarm(alarmId) {
    try {
      const latestAlarms = await refreshMonitoring()
      const currentAlarm = latestAlarms.find((item) => String(item.id) === String(alarmId))
      if (!currentAlarm || String(currentAlarm.status).toUpperCase() !== 'ACTIVE') {
        showToast('Alarm state already updated.')
        return
      }
      await acknowledgeAlarmRequest(alarmId)
      await refreshMonitoring()
      showToast('Alarm acknowledged')
    } catch (error) {
      if (String(error.message ?? '').includes('Only an active alarm can be acknowledged')) {
        await refreshMonitoring().catch(() => {})
        showToast('Alarm state already updated.')
        return
      }
      showToast(`Unable to acknowledge alarm: ${error.message}`)
      throw error
    }
  }

  async function openAlarm(alarm, path) {
    if (!path) return

    try {
      const allAlarms = await refreshMonitoring()
      const currentAlarm = allAlarms.find((item) => String(item.id) === String(alarm.id))
      if (!currentAlarm || String(currentAlarm.status).toUpperCase() === 'RESOLVED') {
        showToast('This alarm has already resolved.')
        return
      }
      navigate(path, { state: { alarmId: currentAlarm.id, tab: getAlarmTab(currentAlarm.status) } })
      showToast(`${currentAlarm.equipmentCode ?? currentAlarm.alarmCode} alarm opened`)
    } catch (error) {
      showToast(`Unable to refresh alarm status: ${error.message}`)
    }
  }

  function createTicketFromAlarm(alarm) {
    if (!alarm?.equipmentId) {
      showToast('Unable to create a ticket because the alarm has no equipment link.')
      return
    }
    navigate('/operations', {
      state: {
        tab: 'tickets',
        createModal: true,
        equipmentId: alarm.equipmentId,
        alarmId: alarm.id,
        title: `${alarm.alarmCode ?? 'Alarm'} - ${alarm.equipmentCode ?? alarm.subsystemId ?? 'Equipment'}`,
        description: alarm.alarmMessage ?? alarm.detail ?? 'Investigate the selected alarm.',
        priority: getTicketPriorityFromAlarm(alarm),
        assignedGroup: getAssignedGroupFromEquipmentType(alarm.equipmentType ?? alarm.subsystemType),
      },
    })
    showToast('Ticket form opened with the alarm relationship pre-filled')
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
      onCreateTicketFromAlarm={createTicketFromAlarm}
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
              <Route path="/predictions" element={<DashboardWorkspace />} />
              <Route path="/operations" element={<DashboardWorkspace />} />
              <Route path="/settings" element={<DashboardWorkspace />} />
              <Route path="/profile" element={<DashboardWorkspace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
