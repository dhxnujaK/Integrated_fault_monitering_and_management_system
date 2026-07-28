import React from 'react'
import { ClipboardCheck, SearchCheck } from 'lucide-react'
import SectionCard from './SectionCard'

function diagnosisFor(alarm) {
  return alarm?.diagnosis ?? alarm?.diagnosisResponse ?? null
}

export default function DiagnosisPanel({ alarms = [], title = 'Fault Diagnosis' }) {
  const diagnosedAlarms = alarms.filter((alarm) => diagnosisFor(alarm))

  return (
    <SectionCard title={title} icon={SearchCheck} className="diagnosis-panel">
      {!diagnosedAlarms.length ? (
        <p className="empty-state">No active alarm diagnosis is available for this equipment.</p>
      ) : (
        <div className="diagnosis-list">
          {diagnosedAlarms.map((alarm) => {
            const diagnosis = diagnosisFor(alarm)
            return (
              <article className="diagnosis-item" key={alarm.id ?? alarm.alarmCode}>
                <header>
                  <strong>{alarm.alarmCode}</strong>
                  <span>{alarm.severity}</span>
                </header>
                <p>{diagnosis.observablePattern}</p>
                <div className="diagnosis-columns">
                  <div>
                    <div className="mini-heading"><ClipboardCheck size={14} />Probable causes</div>
                    <ul>
                      {diagnosis.probableCauses.map((cause) => <li key={cause}>{cause}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="mini-heading"><ClipboardCheck size={14} />Corrective actions</div>
                    <ol>
                      {diagnosis.correctiveActions.map((step) => (
                        <li key={`${alarm.id}-${step.step}`}>{step.action}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
