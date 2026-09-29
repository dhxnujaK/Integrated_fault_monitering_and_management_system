import { useState } from 'react'
import { AlertTriangle, Bell } from 'lucide-react'
import SectionCard from './SectionCard'

export default function ContextualAlarmPanel({ title, emptyMessage, alarms = [], onAcknowledge, onCreateTicket }) {
  const [tab, setTab] = useState('Active')
  const visibleAlarms = alarms.filter((alarm) => {
    const status = String(alarm.status ?? '').toUpperCase()
    if (tab === 'History') return ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)
    if (tab === 'Acknowledged') return status === 'ACKNOWLEDGED'
    return status === 'ACTIVE'
  })

  async function handleAcknowledge(alarmId) {
    await onAcknowledge?.(alarmId)
    setTab('Acknowledged')
  }

  return (
    <SectionCard title={title} icon={Bell}>
      <div className="tabs">
        {['Active', 'Acknowledged', 'History'].map((item) => (
          <button key={item} type="button" className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>
      {visibleAlarms.length === 0 ? (
        <p className="empty-state py-8">{emptyMessage}</p>
      ) : (
        <div className="alarm-table max-h-60 overflow-y-auto">
          {visibleAlarms.map((alarm) => {
            const status = String(alarm.status ?? '').toUpperCase()
            const acknowledged = status === 'ACKNOWLEDGED'
            const active = status === 'ACTIVE'
            return (
              <div key={alarm.id} className={`alarm-row ${acknowledged ? 'acknowledged' : ''}`}>
                <span className={`severity ${alarm.severity === 'CRITICAL' ? 'danger' : 'warning'}`}>
                  <AlertTriangle size={18} />
                </span>
                <div className="alarm-main">
                  <strong>{alarm.alarmCode}</strong>
                  <span>
                    <small>{alarm.alarmMessage}</small>
                    {acknowledged && <small>Acknowledged</small>}
                  </span>
                </div>
                <div className="alarm-meta">
                  <time>{new Date(alarm.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  <p className={`alarm-status ${status.toLowerCase()}`}>{status || 'UNKNOWN'}</p>
                </div>
                {tab !== 'History' ? (
                  <div className="alarm-row-actions">
                    {active ? (
                      <button className="alarm-action" type="button" onClick={() => handleAcknowledge(alarm.id)}>
                        Acknowledge
                      </button>
                    ) : null}
                    {onCreateTicket ? (
                      <button className="alarm-action secondary" type="button" onClick={() => onCreateTicket(alarm)}>
                        Create ticket
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
