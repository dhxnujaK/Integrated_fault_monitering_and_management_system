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
            const acknowledged = alarm.status === 'ACKNOWLEDGED'
            return (
              <div key={alarm.id} className={`alarm-row ${acknowledged ? 'acknowledged' : ''}`}>
                <span className={`severity ${alarm.severity === 'CRITICAL' ? 'danger' : 'warning'}`}>
                  <AlertTriangle size={18} />
                </span>
                <strong>{alarm.alarmCode}</strong>
                <span>
                  {alarm.alarmMessage}
                  {acknowledged && <small>Acknowledged</small>}
                </span>
                <time>{new Date(alarm.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                <button type="button" disabled={acknowledged} onClick={() => onAcknowledge(alarm.id)}>
                  Acknowledge
                </button>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
