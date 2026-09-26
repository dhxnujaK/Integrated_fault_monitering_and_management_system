import { AlertTriangle, Bell } from 'lucide-react'
import SectionCard from './SectionCard'

export default function ContextualAlarmPanel({ title, emptyMessage, alarms = [], onAcknowledge }) {
  return (
    <SectionCard title={title} icon={Bell}>
      {alarms.length === 0 ? (
        <p className="empty-state py-8">{emptyMessage}</p>
      ) : (
        <div className="alarm-table max-h-60 overflow-y-auto">
          {alarms.map((alarm) => {
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
                {active ? (
                  <button className="alarm-action" type="button" onClick={() => onAcknowledge(alarm.id)}>
                    Acknowledge
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
