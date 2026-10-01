import React from 'react'
import { formatProbability, predictionRiskLevel } from './predictionRisk'

export default function PredictionRiskBadge({ probability, riskLevel }) {
  const risk = predictionRiskLevel(probability, riskLevel)
  return (
    <span className={`prediction-risk-badge ${risk}`}>
      <span>{risk === 'unknown' ? 'Unknown' : risk}</span>
      <strong>{formatProbability(probability)}</strong>
    </span>
  )
}
