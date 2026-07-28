import React, { useEffect, useState } from 'react'
import { BrainCircuit, RefreshCw } from 'lucide-react'
import SectionCard from '../components/SectionCard'
import { getLatestPredictions } from '../api/predictionApi'
import { formatProbability, predictionRiskLevel } from '../components/predictionRisk'

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadPredictions() {
    try {
      const records = await getLatestPredictions()
      setPredictions(records)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load predictions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPredictions()
    const intervalId = window.setInterval(loadPredictions, 60000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="predictions-page">
      <SectionCard title="Prediction Comparison" icon={BrainCircuit}>
        <div className="prediction-toolbar">
          <span>{predictions.length} equipment predictions</span>
          <button type="button" onClick={loadPredictions}><RefreshCw size={14} />Refresh</button>
        </div>
        {loading ? <p className="empty-state">Loading predictions...</p> : null}
        {error ? <p className="empty-state">{error}</p> : null}
        {!loading && !error && !predictions.length ? (
          <p className="empty-state">No persisted predictions are available yet.</p>
        ) : null}
        {predictions.length ? (
          <div className="prediction-table">
            {predictions.map((prediction) => {
              const risk = predictionRiskLevel(prediction.failureProbability)
              return (
                <article className={`prediction-row ${risk}`} key={prediction.id ?? prediction.equipmentId}>
                  <div>
                    <strong>{prediction.equipmentCode}</strong>
                    <span>{prediction.equipmentType}</span>
                  </div>
                  <div>
                    <span>Fault</span>
                    <strong>{prediction.predictedFailureType || 'UNKNOWN'}</strong>
                  </div>
                  <div>
                    <span>Probability</span>
                    <strong>{formatProbability(prediction.failureProbability)}</strong>
                  </div>
                  <div>
                    <span>Confidence</span>
                    <strong>{formatProbability(prediction.confidence)}</strong>
                  </div>
                  <div>
                    <span>Model</span>
                    <strong>{prediction.modelVersion || 'unversioned'}</strong>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
