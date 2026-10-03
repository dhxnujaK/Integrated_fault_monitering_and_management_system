import React, { useCallback, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import SectionCard from './SectionCard'
import { getEquipmentPredictions, runPredictions } from '../api/predictionApi'
import { predictionRiskLevel } from './predictionRisk'
import usePredictionPolling from '../hooks/usePredictionPolling'
import PredictionRiskBadge from './PredictionRiskBadge'

function getPredictedFaultLabel(predictedFailureType) {
  return predictedFailureType && predictedFailureType !== 'UNKNOWN' ? predictedFailureType : 'No failure predicted'
}

function alarmSeverityRank(alarm) {
  const severity = String(alarm?.severity ?? '').toUpperCase()
  if (severity === 'CRITICAL') return 2
  if (severity === 'WARNING') return 1
  return 0
}

function alarmTriggeredAt(alarm) {
  const time = new Date(alarm?.triggeredAt ?? 0).getTime()
  return Number.isNaN(time) ? 0 : time
}

function mostImportantLiveAlarm(alarms) {
  return alarms
    .filter((alarm) => {
      const status = String(alarm?.status ?? '').toUpperCase()
      return ['ACTIVE', 'ACKNOWLEDGED'].includes(status) && alarm?.diagnosis
    })
    .sort((left, right) => {
      const severityDiff = alarmSeverityRank(right) - alarmSeverityRank(left)
      return severityDiff || alarmTriggeredAt(right) - alarmTriggeredAt(left)
    })[0] ?? null
}

function actionsFromDiagnosis(diagnosis) {
  return diagnosis?.correctiveActions?.map((step) => step.action) ?? []
}

function reconcileWithLiveAlarm(prediction, alarms) {
  const alarm = mostImportantLiveAlarm(alarms)
  if (!alarm) return prediction

  const critical = String(alarm.severity ?? '').toUpperCase() === 'CRITICAL'
  const alarmProbability = critical ? 0.95 : 0.55
  return {
    ...(prediction ?? {}),
    failureProbability: Math.max(Number(prediction?.failureProbability) || 0, alarmProbability),
    predictedFailureType: alarm.alarmCode,
    recommendedActions: actionsFromDiagnosis(alarm.diagnosis),
    confidence: Math.max(Number(prediction?.confidence) || 0, critical ? 0.95 : 0.75),
    estimatedTimeToFailureMinutes: critical ? 0 : prediction?.estimatedTimeToFailureMinutes,
    riskLevel: critical || String(prediction?.riskLevel ?? '').toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM',
    predictedAt: prediction?.predictedAt ?? alarm.triggeredAt,
    diagnosis: alarm.diagnosis,
  }
}

function formatTimeToFailure(minutes) {
  const value = Number(minutes)
  return Number.isFinite(value) ? `${value} min` : 'Not estimated'
}

export default function PredictionPanel({ equipmentId, alarms = [], title = 'Latest Prediction' }) {
  const [runState, setRunState] = useState({ loading: false, message: '', error: '' })
  const loadPrediction = useCallback(async () => {
    if (!equipmentId) {
      return null
    }
    const page = await getEquipmentPredictions(equipmentId, { page: 0, size: 1 })
    return page.items?.[0] ?? null
  }, [equipmentId])
  const { data: prediction, loading, error, refresh } = usePredictionPolling(
    loadPrediction,
    undefined,
    equipmentId ?? 'none',
  )

  const displayPrediction = reconcileWithLiveAlarm(prediction, alarms)
  const risk = predictionRiskLevel(displayPrediction?.failureProbability, displayPrediction?.riskLevel)

  async function handleRunPrediction() {
    setRunState({ loading: true, message: '', error: '' })
    try {
      const result = await runPredictions()
      await refresh()
      setRunState({
        loading: false,
        message: result.savedCount > 0
          ? ''
          : 'Prediction run completed, but no records were saved. Check live readings and ML health.',
        error: '',
      })
    } catch (err) {
      setRunState({
        loading: false,
        message: '',
        error: err.message || 'Unable to run predictions.',
      })
    }
  }

  return (
    <SectionCard title={title} className="prediction-panel">
      {loading && !displayPrediction ? <p className="empty-state">Loading prediction...</p> : null}
      {error ? (
        <div className="panel-state error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={refresh}>Retry</button>
        </div>
      ) : null}
      {!loading && !error && !displayPrediction ? (
        <div className="prediction-empty">
          <p>No persisted prediction is available for this equipment.</p>
          <button
            type="button"
            disabled={runState.loading}
            onClick={handleRunPrediction}
          >
            {runState.loading ? 'Running...' : 'Run prediction'}
          </button>
          {runState.message ? <span className="prediction-run-note">{runState.message}</span> : null}
          {runState.error ? <span className="prediction-run-note error">{runState.error}</span> : null}
        </div>
      ) : null}
      {displayPrediction ? (
        <div className={`prediction-summary ${risk}`}>
          <div className="prediction-score">
            <span>Failure probability</span>
            <PredictionRiskBadge probability={displayPrediction.failureProbability} riskLevel={displayPrediction.riskLevel} />
          </div>
          <dl className="prediction-details">
            <div><dt>Predicted fault</dt><dd>{getPredictedFaultLabel(displayPrediction.predictedFailureType)}</dd></div>
            <div><dt>Time to failure</dt><dd>{formatTimeToFailure(displayPrediction.estimatedTimeToFailureMinutes)}</dd></div>
            <div><dt>Model version</dt><dd>{displayPrediction.modelVersion ?? 'Live alarm'}</dd></div>
            <div><dt>Generated</dt><dd>{displayPrediction.predictedAt ? new Date(displayPrediction.predictedAt).toLocaleString() : '--'}</dd></div>
          </dl>
          <div className="prediction-actions">
            <div className="mini-heading">Recommended actions</div>
            {displayPrediction.recommendedActions?.length ? (
              <ol className="diagnosis-points action-points">
                {displayPrediction.recommendedActions.map((action, index) => (
                  <li key={`${action}-${index}`}><span />{action}</li>
                ))}
              </ol>
            ) : displayPrediction.diagnosis?.correctiveActions?.length ? (
              <ol className="diagnosis-points action-points">
                {displayPrediction.diagnosis.correctiveActions.map((step) => (
                  <li key={step.step}><span />{step.action}</li>
                ))}
              </ol>
            ) : <p>No corrective action required for this low-risk prediction.</p>}
          </div>
          {displayPrediction.diagnosis ? (
            <div className="prediction-actions">
              <div className="mini-heading">Probable causes</div>
              <ul className="diagnosis-points">
                {displayPrediction.diagnosis.probableCauses.map((cause) => (
                  <li key={cause}><span />{cause}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  )
}
