import React, { useCallback } from 'react'
import { Activity, AlertTriangle, BrainCircuit, RefreshCw } from 'lucide-react'
import SectionCard from './SectionCard'
import { getEquipmentPredictions } from '../api/predictionApi'
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
    <SectionCard title={title} icon={BrainCircuit} className="prediction-panel">
      {loading && !prediction ? <p className="empty-state">Loading prediction...</p> : null}
      {error ? (
        <div className="panel-state error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={refresh}><RefreshCw size={14} />Retry</button>
        </div>
      ) : null}
      {!loading && !error && !prediction ? (
        <p className="empty-state">No persisted prediction is available for this equipment.</p>
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
            <div className="mini-heading"><Activity size={14} />Recommended actions</div>
            {prediction.recommendedActions?.length ? (
              <ol>
                {prediction.recommendedActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
              </ol>
            ) : <p>No model action was returned.</p>}
          </div>
          {prediction.diagnosis ? (
            <div className="prediction-actions">
              <div className="mini-heading"><Activity size={14} />Probable causes</div>
              <ul>
                {prediction.diagnosis.probableCauses.map((cause) => <li key={cause}>{cause}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  )
}
