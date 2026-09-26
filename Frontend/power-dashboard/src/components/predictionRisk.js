export function predictionRiskLevel(probability) {
  const value = Number(probability)
  if (!Number.isFinite(value)) return 'unknown'
  if (value >= 0.7) return 'high'
  if (value >= 0.4) return 'medium'
  return 'low'
}

export function formatProbability(probability) {
  const value = Number(probability)
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '--'
}
