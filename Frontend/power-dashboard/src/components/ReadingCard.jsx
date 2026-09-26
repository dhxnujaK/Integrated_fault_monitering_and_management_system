import React from 'react'

/**
 * Reusable ReadingCard component to display telemetry metrics.
 * Inherits standard classes from App.css to match existing dashboard cards exactly.
 * @param {string} label - Name of the metric.
 * @param {any} value - Value of the metric.
 * @param {string} unit - Metric unit (e.g. V, A, Hz, °C).
 * @param {React.ComponentType} [icon] - Optional lucide-react icon component.
 * @param {boolean} [alert] - If true, applies critical styling.
 */
export default function ReadingCard({ label, value, unit, icon: Icon, alert = false }) {
  return (
    <article 
      className="metric-panel" 
      style={alert ? { borderColor: 'var(--red)', boxShadow: '0 0 10px rgba(226, 58, 58, 0.15)' } : {}}
    >
      <div className="panel-heading">
        {Icon && <Icon size={18} style={{ color: alert ? 'var(--red)' : '#66d7e6' }} />}
        <h2>{label}</h2>
      </div>
      <div className="divider" />
      <p className="metric-value" style={alert ? { color: 'var(--red)' } : {}}>
        {value !== undefined && value !== null ? value : '--'}
        {unit && (
          <span style={{ fontSize: '14px', marginLeft: '4px', color: 'var(--muted)', fontWeight: 700 }}>
            {unit}
          </span>
        )}
      </p>
    </article>
  )
}
