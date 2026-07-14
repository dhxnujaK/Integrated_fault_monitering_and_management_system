import React from 'react'

/**
 * Reusable StatusBadge component to display overall status.
 * Uses CSS classes from App.css to match the UI theme perfectly.
 * @param {string} status - The status to display (NORMAL, WARNING, CRITICAL).
 */
export default function StatusBadge({ status }) {
  const statusStr = (status || '').toUpperCase()
  
  let toneClass = 'ok'
  let label = status || 'NORMAL'

  if (statusStr === 'WARNING') {
    toneClass = 'warning'
    label = 'WARNING'
  } else if (statusStr === 'CRITICAL' || statusStr === 'FAULT' || statusStr === 'DANGER') {
    toneClass = 'danger'
    label = statusStr === 'FAULT' ? 'FAULT' : 'CRITICAL'
  } else if (statusStr === 'NORMAL' || statusStr === 'OK') {
    toneClass = 'ok'
    label = 'NORMAL'
  }

  return (
    <span className={`mode-chip ${toneClass}`}>
      {label}
    </span>
  )
}
