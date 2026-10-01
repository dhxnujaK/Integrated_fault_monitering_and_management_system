import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Activity, KeyRound, RefreshCw, RotateCcw, Settings2, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createUser, getUsers, resetUserPassword, setUserEnabled, setUserRole } from '../api/usersApi'
import { deleteThreshold, getEquipmentList, getThresholds, setEquipmentEnabled, updateThreshold } from '../api/settingsApi'
import { getLatestPredictions, getMlHealth } from '../api/predictionApi'
import { formatProbability, predictionRiskLevel } from '../components/predictionRisk'

const ADMIN_TABS = [
  { key: 'users', label: 'Users', icon: <Users size={16} /> },
  { key: 'equipment', label: 'Equipment & Thresholds', icon: <Settings2 size={16} /> },
]
const SYSTEM_TAB = { key: 'system', label: 'System Status', icon: <Activity size={16} /> }
const MODEL_TYPES = ['GENERATOR', 'MDP', 'SDP', 'UPS']

function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString()
}

export default function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const tabs = isAdmin ? [...ADMIN_TABS, SYSTEM_TAB] : [SYSTEM_TAB]
  const [activeTab, setActiveTab] = useState(tabs[0].key)
  const currentTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : tabs[0].key

  return (
    <div className="settings-page">
      <nav className="operations-nav-tabs" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${currentTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {currentTab === 'users' ? <UsersTab currentUsername={user?.username} /> : null}
      {currentTab === 'equipment' ? <EquipmentTab /> : null}
      {currentTab === 'system' ? <SystemTab /> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Users */

const emptyNewUser = { username: '', fullName: '', email: '', role: 'OPERATOR', password: '' }

function UsersTab({ currentUsername }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await getUsers())
    } catch (error) {
      toast.error(error.message || 'Unable to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  function replaceUser(updated) {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function handleRoleChange(target, role) {
    try {
      replaceUser(await setUserRole(target.id, role))
      toast.success(`${target.username} is now ${role}`)
    } catch (error) {
      toast.error(error.message || 'Unable to change role')
    }
  }

  async function handleToggleEnabled(target) {
    try {
      const updated = await setUserEnabled(target.id, !target.enabled)
      replaceUser(updated)
      toast.success(`${target.username} ${updated.enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error(error.message || 'Unable to update user')
    }
  }

  return (
    <section className="settings-panel">
      <header className="settings-panel-header">
        <div>
          <h3>User accounts</h3>
          <p>Admins manage everything. Operators monitor, acknowledge alarms and handle tickets.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> Add user
        </button>
      </header>

      {loading ? <p className="empty-state settings-empty">Loading users...</p> : (
        <div className="settings-table-wrapper">
          <table className="settings-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {
                const isSelf = item.username === currentUsername
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.fullName || item.username}</strong>
                      <span>@{item.username}{isSelf ? ' · you' : ''}</span>
                    </td>
                    <td>
                      <select
                        value={item.role}
                        disabled={isSelf}
                        onChange={(event) => handleRoleChange(item, event.target.value)}
                        aria-label={`Role for ${item.username}`}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="OPERATOR">Operator</option>
                      </select>
                    </td>
                    <td>
                      <div className="settings-status" title={isSelf ? 'You cannot disable your own account' : undefined}>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(item.enabled)}
                            disabled={isSelf}
                            onChange={() => handleToggleEnabled(item)}
                            aria-label={`${item.enabled ? 'Disable' : 'Enable'} ${item.username}`}
                          />
                          <span className="slider" />
                        </label>
                        <span className={`status-pill ${item.enabled ? 'on' : 'off'}`}>
                          {item.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="settings-row-actions">
                      <button type="button" className="ghost-btn" onClick={() => setResetTarget(item)}>
                        <KeyRound size={14} /> Reset password
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setUsers((current) => [...current, created].sort((a, b) => a.username.localeCompare(b.username)))
            setShowCreate(false)
            toast.success(`User ${created.username} created`)
          }}
        />
      ) : null}

      {resetTarget ? (
        <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} />
      ) : null}
    </section>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyNewUser)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      onCreated(await createUser(form))
    } catch (err) {
      setError(err.message || 'Unable to create user')
    } finally {
      setSaving(false)
    }
  }

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <div className="modal-card settings-modal">
        <h3 id="create-user-title">Add user</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input value={form.username} onChange={update('username')} autoComplete="off" placeholder="e.g. operator1" required />
          </label>
          <label>
            Full name
            <input value={form.fullName} onChange={update('fullName')} placeholder="Optional" />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={update('email')} placeholder="Optional" />
          </label>
          <label>
            Role
            <select value={form.role} onChange={update('role')}>
              <option value="OPERATOR">Operator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label>
            Temporary password
            <input type="password" value={form.password} onChange={update('password')} autoComplete="new-password" minLength={8} required />
          </label>
          {error ? <p className="report-message error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Creating...' : 'Create user'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPasswordModal({ target, onClose }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await resetUserPassword(target.id, password)
      toast.success(`Password reset for ${target.username}`)
      onClose()
    } catch (err) {
      setError(err.message || 'Unable to reset password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
      <div className="modal-card settings-modal">
        <h3 id="reset-password-title">Reset password for {target.username}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <p className="settings-hint">At least 8 characters. Share it with the user, who can change it from their profile.</p>
          {error ? <p className="report-message error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Reset password'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------ Equipment & thresholds */

function EquipmentTab() {
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let ignore = false
    getEquipmentList()
      .then((data) => {
        if (ignore) return
        setEquipmentList(data)
        setSelectedId((current) => current ?? data[0]?.id ?? null)
      })
      .catch((error) => toast.error(error.message || 'Unable to load equipment'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  async function handleToggleEnabled(equipment) {
    try {
      const updated = await setEquipmentEnabled(equipment.id, !equipment.enabled)
      setEquipmentList((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(`${updated.equipmentCode} monitoring ${updated.enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error(error.message || 'Unable to update equipment')
    }
  }

  const selected = equipmentList.find((item) => item.id === selectedId) ?? null

  if (loading) return <p className="empty-state">Loading equipment...</p>

  return (
    <div className="settings-equipment">
      <section className="settings-panel">
        <header className="settings-panel-header">
          <div>
            <h3>Equipment</h3>
            <p>Disabled equipment stops producing readings, alarms and predictions.</p>
          </div>
        </header>
        <ul className="settings-equipment-list">
          {equipmentList.map((item) => (
            <li key={item.id} className={item.id === selectedId ? 'selected' : ''}>
              <button type="button" className="settings-equipment-select" onClick={() => setSelectedId(item.id)}>
                <strong>{item.equipmentCode}</strong>
                <span>{item.displayName} · {item.equipmentType}</span>
              </button>
              <label className="toggle-switch" title={item.enabled ? 'Disable monitoring' : 'Enable monitoring'}>
                <input type="checkbox" checked={Boolean(item.enabled)} onChange={() => handleToggleEnabled(item)} />
                <span className="slider" />
              </label>
            </li>
          ))}
        </ul>
      </section>

      {selected ? <ThresholdPanel key={selected.id} equipment={selected} /> : null}
    </div>
  )
}

function ThresholdPanel({ equipment }) {
  const [thresholds, setThresholds] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [savingKey, setSavingKey] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await getThresholds(equipment.id)
      setThresholds(data)
      setDrafts(Object.fromEntries(data.map((item) => [item.metricKey, String(item.value)])))
    } catch (error) {
      setThresholds([])
      toast.error(error.message || 'Unable to load thresholds')
    }
  }, [equipment.id])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function handleSave(item) {
    const value = Number(drafts[item.metricKey])
    if (!Number.isFinite(value)) {
      toast.error('Enter a number')
      return
    }
    setSavingKey(item.metricKey)
    try {
      await updateThreshold(equipment.id, item.metricKey, value)
      await load()
      toast.success(`${item.label} saved`)
    } catch (error) {
      toast.error(error.message || 'Unable to save threshold')
    } finally {
      setSavingKey(null)
    }
  }

  async function handleReset(item) {
    setSavingKey(item.metricKey)
    try {
      await deleteThreshold(equipment.id, item.metricKey)
      await load()
      toast.success(`${item.label} reset to default`)
    } catch (error) {
      toast.error(error.message || 'Unable to reset threshold')
    } finally {
      setSavingKey(null)
    }
  }

  if (!thresholds?.length) return null

  return (
    <section className="settings-panel">
      <header className="settings-panel-header">
        <div>
          <h3>Alarm thresholds · {equipment.equipmentCode}</h3>
          <p>Alarms fire when readings cross these limits. Changes apply to the next reading.</p>
        </div>
      </header>

      <ul className="threshold-list">
        {thresholds.map((item) => {
          const isCustom = item.id != null
          const draft = drafts[item.metricKey] ?? ''
          const changed = draft !== String(item.value)
          const busy = savingKey === item.metricKey
          return (
            <li key={item.metricKey}>
              <div className="threshold-info">
                <strong>{item.label}</strong>
                <span>
                  Default {item.defaultValue}{item.unit} · allowed {item.minValue}–{item.maxValue}{item.unit}
                  {isCustom && item.updatedBy ? ` · changed by ${item.updatedBy}` : ''}
                </span>
              </div>
              <span className={`status-pill ${isCustom ? 'custom' : 'default'}`}>{isCustom ? 'Custom' : 'Default'}</span>
              <div className="threshold-input">
                <input
                  type="number"
                  step="any"
                  min={item.minValue ?? undefined}
                  max={item.maxValue ?? undefined}
                  value={draft}
                  onChange={(event) => setDrafts({ ...drafts, [item.metricKey]: event.target.value })}
                  aria-label={item.label}
                />
                <span>{item.unit}</span>
              </div>
              <div className="threshold-actions">
                <button type="button" className="primary-btn" disabled={!changed || busy} onClick={() => handleSave(item)}>
                  Save
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={!isCustom || busy}
                  onClick={() => handleReset(item)}
                  title="Reset to default"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------ System status */

function SystemTab() {
  const [health, setHealth] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [healthResult, predictionResult] = await Promise.allSettled([getMlHealth(), getLatestPredictions()])
    setHealth(healthResult.status === 'fulfilled' ? healthResult.value : { reachable: false, status: 'UNAVAILABLE' })
    setPredictions(predictionResult.status === 'fulfilled' ? predictionResult.value : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const models = health?.details?.models ?? {}
  const reachable = Boolean(health?.reachable)

  return (
    <div className="settings-system">
      <section className="settings-panel">
        <header className="settings-panel-header">
          <div>
            <h3>Prediction service</h3>
            <p>Monitoring, alarms, diagnosis and tickets keep working when this service is down.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </header>

        <div className="system-health">
          <div className={`system-health-status ${reachable ? 'up' : 'down'}`}>
            <span className="dot" />
            <div>
              <strong>{reachable ? 'Online' : 'Offline'}</strong>
              <span>{health?.serviceUrl ?? 'ML service'} · checked {formatDateTime(health?.checkedAt)}</span>
            </div>
          </div>

          <ul className="system-models">
            {MODEL_TYPES.map((type) => {
              const model = models[type]
              return (
                <li key={type}>
                  <span className={`dot ${model?.loaded ? 'up' : 'down'}`} />
                  <div>
                    <strong>{type}</strong>
                    <span>{model?.loaded ? model.modelVersion : (model?.message || 'Not loaded')}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="settings-panel">
        <header className="settings-panel-header">
          <div>
            <h3>Latest predictions</h3>
            <p>Most recent six-hour failure forecast for each enabled piece of equipment.</p>
          </div>
        </header>
        {predictions.length === 0 ? (
          <p className="empty-state settings-empty">No predictions yet. They appear once the prediction scheduler runs.</p>
        ) : (
          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Risk</th>
                  <th>Model</th>
                  <th>Predicted at</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.equipmentCode}</strong>
                      <span>{item.equipmentType}</span>
                    </td>
                    <td>
                      <span className={`status-pill risk-${predictionRiskLevel(item.failureProbability, item.riskLevel)}`}>
                        {formatProbability(item.failureProbability)}
                      </span>
                    </td>
                    <td><span className="settings-muted">{item.modelVersion ?? '--'}</span></td>
                    <td><span className="settings-muted">{formatDateTime(item.predictedAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
