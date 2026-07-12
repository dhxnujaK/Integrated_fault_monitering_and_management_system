import React from 'react'

/**
 * Reusable StatusBadge component to display overall status.
 * @param {string} status - The status to display (NORMAL, WARNING, CRITICAL).
 */
export default function StatusBadge({ status }) {
  const statusStr = (status || '').toUpperCase()
  
  let bgClass = 'bg-[#c7f8d0] text-[#061322]' // ok / green
  let label = status || 'NORMAL'

  if (statusStr === 'WARNING') {
    bgClass = 'bg-[#ffe0a9] text-[#061322]' // warning / amber
    label = 'WARNING'
  } else if (statusStr === 'CRITICAL' || statusStr === 'FAULT' || statusStr === 'DANGER') {
    bgClass = 'bg-[#ffc4c8] text-[#061322]' // danger / red
    label = statusStr === 'FAULT' ? 'FAULT' : 'CRITICAL'
  } else if (statusStr === 'NORMAL' || statusStr === 'OK') {
    bgClass = 'bg-[#c7f8d0] text-[#061322]'
    label = 'NORMAL'
  }

  return (
    <span className={`inline-block px-3 py-1 rounded text-xs font-black tracking-wide ${bgClass}`}>
      {label}
    </span>
  )
}
