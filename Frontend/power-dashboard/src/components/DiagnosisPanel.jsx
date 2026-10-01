import React, { useMemo } from 'react'
import SectionCard from './SectionCard'

function diagnosisFor(alarm) {
  return alarm?.diagnosis ?? alarm?.diagnosisResponse ?? null
}

function diagnosisKeyFor(alarm, diagnosis) {
  return diagnosis?.key ?? alarm?.alarmCode ?? alarm?.id
}

function severityRank(severity) {
  const normalized = String(severity ?? '').toUpperCase()
  if (normalized === 'CRITICAL') return 3
  if (normalized === 'WARNING') return 2
  if (normalized === 'INFO') return 1
  return 0
}

function triggeredTime(alarm) {
  const time = new Date(alarm?.triggeredAt ?? 0).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isBetterRepresentative(candidate, current) {
  const candidateSeverity = severityRank(candidate.severity)
  const currentSeverity = severityRank(current.severity)
  if (candidateSeverity !== currentSeverity) {
    return candidateSeverity > currentSeverity
  }
  return triggeredTime(candidate) > triggeredTime(current)
}

export default function DiagnosisPanel({ alarms = [], title = 'Fault Diagnosis' }) {
  const diagnosedAlarms = useMemo(() => {
    const byDiagnosis = new Map()

    alarms.forEach((alarm) => {
      const status = String(alarm?.status ?? '').toUpperCase()
      const diagnosis = diagnosisFor(alarm)
      if (!diagnosis || status === 'RESOLVED') return

      const key = diagnosisKeyFor(alarm, diagnosis)
      const current = byDiagnosis.get(key)
      if (!current || isBetterRepresentative(alarm, current)) {
        byDiagnosis.set(key, alarm)
      }
    })

    return Array.from(byDiagnosis.values())
  }, [alarms])

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
                      {diagnosis.probableCauses.map((cause) => (
                        <li key={cause}><span />{cause}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mini-heading">Corrective actions</div>
                    <ol className="diagnosis-points action-points">
                      {diagnosis.correctiveActions.map((step) => (
                        <li key={`${alarm.id}-${step.step}`}><span />{step.action}</li>
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
