const RISK_LEVELS = ['low', 'medium', 'high']

/**
 * Prefers the server's risk level, which is relative to each model's own threshold.
 * Fixed probability bands are only a fallback for predictions saved without one.
 */
export function predictionRiskLevel(probability, riskLevel) {
  const level = String(riskLevel ?? '').toLowerCase()
  if (RISK_LEVELS.includes(level)) return level
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
