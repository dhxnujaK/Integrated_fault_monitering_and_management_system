import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
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
  SlidersHorizontal,
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
            <p className={`status-pill ${statusClass(equipment.overallStatus)}`}>{equipment.overallStatus}</p>
          </article>
        )) : <p className="empty-state">Loading equipment status…</p>}
      </section>

      <div className="dashboard-grid">
        <SystemOverview equipment={equipmentStatuses} />
        <div className="dashboard-stack">
          <AlarmPanel title="Alarm Summary" alarms={alarms} compact={!showAllAlarms} filters={showAllAlarms} onAcknowledge={onAcknowledge} onNavigateAlarm={onNavigateAlarm} onAction={onAction} />
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
  const selectedUnit = units.find((unit) => String(unit.id) === String(selectedUpsId)) ?? units[0]

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
      </section>
    </SectionCard>
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
    const [records, summary] = await Promise.all([getAlarms({ unresolved: true }), getDashboardSummary()])
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
      await acknowledgeAlarmRequest(alarmId)
      await refreshMonitoring()
      showToast('Alarm acknowledged')
    } catch (error) {
      showToast(`Unable to acknowledge alarm: ${error.message}`)
      throw error
    }
  }

  async function openAlarm(alarm, path) {
    if (!path) return

    try {
      const unresolvedAlarms = await refreshMonitoring()
      const currentAlarm = unresolvedAlarms.find((item) => String(item.id) === String(alarm.id))
      if (!currentAlarm) {
        showToast('This alarm has already resolved.')
        return
      }
      navigate(path, { state: { alarmId: currentAlarm.id, tab: getAlarmTab(currentAlarm.status) } })
      showToast(`${currentAlarm.equipmentCode ?? currentAlarm.alarmCode} alarm opened`)
    } catch (error) {
      showToast(`Unable to refresh alarm status: ${error.message}`)
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
