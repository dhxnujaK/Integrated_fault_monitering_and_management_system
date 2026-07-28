import React, { useCallback, useState } from 'react'
import { BrainCircuit, Play, RefreshCw, ServerPulse } from 'lucide-react'
import SectionCard from '../components/SectionCard'
import { getLatestPredictions, getMlHealth, getPredictionSummary, runPredictions } from '../api/predictionApi'
import { formatProbability, predictionRiskLevel } from '../components/predictionRisk'
import usePredictionPolling from '../hooks/usePredictionPolling'

export default function PredictionsPage() {
  const [runMessage, setRunMessage] = useState('')

  const loadPageData = useCallback(async () => {
    const [predictions, summary, health] = await Promise.all([
      getLatestPredictions(),
      getPredictionSummary(),
      getMlHealth(),
    ])
    return { predictions, summary, health }
  }, [])
  const { data, loading, error, refresh } = usePredictionPolling(loadPageData)
  const predictions = data?.predictions ?? []
  const summary = data?.summary ?? { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 }
  const health = data?.health

  async function handleRunPredictions() {
    setRunMessage('')
    const result = await runPredictions()
    setRunMessage(`${result.savedCount} prediction(s) persisted.`)
    await refresh()
  }

  return (
    <div className="predictions-page">
      <section className="prediction-summary-strip" aria-label="Prediction summary">
        <article><span>Total</span><strong>{summary.total}</strong></article>
        <article><span>High risk</span><strong>{summary.highRisk}</strong></article>
        <article><span>Medium risk</span><strong>{summary.mediumRisk}</strong></article>
        <article><span>Low risk</span><strong>{summary.lowRisk}</strong></article>
      </section>
      <SectionCard title="Prediction Comparison" icon={BrainCircuit}>
        <div className="prediction-toolbar">
          <span>{predictions.length} equipment predictions</span>
          <div className="prediction-toolbar-actions">
            <span className={`ml-health ${health?.reachable ? 'online' : 'offline'}`}>
              <ServerPulse size={14} />ML {health?.reachable ? 'online' : 'offline'}
            </span>
            <button type="button" onClick={handleRunPredictions}><Play size={14} />Run</button>
            <button type="button" onClick={refresh}><RefreshCw size={14} />Refresh</button>
          </div>
        </div>
        {runMessage ? <p className="prediction-run-message">{runMessage}</p> : null}
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
