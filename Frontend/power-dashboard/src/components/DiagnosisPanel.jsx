import React from 'react'
import SectionCard from './SectionCard'

function diagnosisFor(alarm) {
  return alarm?.diagnosis ?? alarm?.diagnosisResponse ?? null
}

export default function DiagnosisPanel({ alarms = [], title = 'Fault Diagnosis' }) {
  const diagnosedAlarms = alarms.filter((alarm) => diagnosisFor(alarm))

  return (
    <SectionCard title={title} className="diagnosis-panel">
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
                    <div className="mini-heading">Probable causes</div>
                    <ul className="diagnosis-points">
                      {diagnosis.probableCauses.map((cause, index) => (
                        <li key={cause}><span>{index + 1}</span>{cause}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mini-heading">Corrective actions</div>
                    <ol className="diagnosis-points action-points">
                      {diagnosis.correctiveActions.map((step) => (
                        <li key={`${alarm.id}-${step.step}`}><span>{step.step}</span>{step.action}</li>
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
