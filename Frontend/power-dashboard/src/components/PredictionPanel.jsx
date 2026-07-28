import React, { useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import SectionCard from './SectionCard'
import { getEquipmentPredictions, runPredictions } from '../api/predictionApi'
import { formatProbability, predictionRiskLevel } from './predictionRisk'
import usePredictionPolling from '../hooks/usePredictionPolling'
import PredictionRiskBadge from './PredictionRiskBadge'

export default function PredictionPanel({ equipmentId, title = 'Latest Prediction' }) {
  const loadPrediction = useCallback(async () => {
    if (!equipmentId) {
      return null
    }
    const page = await getEquipmentPredictions(equipmentId, { page: 0, size: 1 })
    return page.items?.[0] ?? null
  }, [equipmentId])
  const { data: prediction, loading, error, refresh } = usePredictionPolling(
    loadPrediction,
    60000,
    equipmentId ?? 'none',
  )

  const risk = predictionRiskLevel(prediction?.failureProbability)

  return (
    <SectionCard title={title} className="prediction-panel">
      {loading && !prediction ? <p className="empty-state">Loading prediction...</p> : null}
      {error ? (
        <div className="panel-state error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={refresh}>Retry</button>
        </div>
      ) : null}
      {!loading && !error && !prediction ? (
        <div className="prediction-empty">
          <p>No persisted prediction is available for this equipment.</p>
          <button
            type="button"
            onClick={async () => {
              await runPredictions()
              await refresh()
            }}
          >
            Run prediction
          </button>
        </div>
      ) : null}
      {prediction ? (
        <div className={`prediction-summary ${risk}`}>
          <div className="prediction-score">
            <span>Failure probability</span>
            <PredictionRiskBadge probability={prediction.failureProbability} />
          </div>
          <dl className="prediction-details">
            <div><dt>Predicted fault</dt><dd>{prediction.predictedFailureType || 'UNKNOWN'}</dd></div>
            <div><dt>Confidence</dt><dd>{formatProbability(prediction.confidence)}</dd></div>
            <div><dt>Model</dt><dd>{prediction.modelVersion || 'unversioned'}</dd></div>
            <div><dt>Generated</dt><dd>{prediction.predictedAt ? new Date(prediction.predictedAt).toLocaleString() : '--'}</dd></div>
          </dl>
          <div className="prediction-actions">
            <div className="mini-heading">Recommended actions</div>
            {prediction.recommendedActions?.length ? (
              <ol className="diagnosis-points action-points">
                {prediction.recommendedActions.map((action, index) => (
                  <li key={`${action}-${index}`}><span>{index + 1}</span>{action}</li>
                ))}
              </ol>
            ) : prediction.diagnosis?.correctiveActions?.length ? (
              <ol className="diagnosis-points action-points">
                {prediction.diagnosis.correctiveActions.map((step) => (
                  <li key={step.step}><span>{step.step}</span>{step.action}</li>
                ))}
              </ol>
            ) : <p>No model action was returned.</p>}
          </div>
          {prediction.diagnosis ? (
            <div className="prediction-actions">
              <div className="mini-heading">Probable causes</div>
              <ul className="diagnosis-points">
                {prediction.diagnosis.probableCauses.map((cause, index) => (
                  <li key={cause}><span>{index + 1}</span>{cause}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  )
}
