import React from 'react'
import { formatProbability, predictionRiskLevel } from './predictionRisk'

export default function PredictionRiskBadge({ probability }) {
  const risk = predictionRiskLevel(probability)
  return (
    <span className={`prediction-risk-badge ${risk}`}>
      {risk === 'unknown' ? 'Unknown risk' : `${risk} risk`}
      <strong>{formatProbability(probability)}</strong>
    </span>
  )
}
