import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RotateCcw } from 'lucide-react'
import { deleteThreshold, getEquipmentList, getThresholds, setEquipmentEnabled, updateThreshold } from '../api/settingsApi'

export default function EquipmentThresholdsTab() {
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
