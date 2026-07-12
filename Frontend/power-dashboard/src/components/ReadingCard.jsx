import React from 'react'

/**
 * Reusable ReadingCard component to display telemetry metrics.
 * @param {string} label - Name of the metric.
 * @param {any} value - Value of the metric.
 * @param {string} unit - Metric unit (e.g. V, A, Hz, °C).
 * @param {React.ComponentType} [icon] - Optional lucide-react icon component.
 * @param {boolean} [alert] - If true, applies critical styling.
 */
export default function ReadingCard({ label, value, unit, icon: Icon, alert = false }) {
  return (
    <div 
      className={`p-5 rounded-xl border transition-all duration-300 ${
        alert 
          ? 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/5' 
          : 'bg-[#172341] border-[#344364] hover:border-[#66d7e6]/50'
      }`}
    >
      <div className="flex items-center justify-between text-xs text-[#aeb9d5] font-extrabold tracking-wider uppercase">
        <span>{label}</span>
        {Icon && (
          <Icon 
            size={16} 
            className={alert ? 'text-red-400 animate-pulse' : 'text-[#66d7e6]'} 
          />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className={`text-2xl font-black tracking-tight ${alert ? 'text-red-400' : 'text-[#f8fbff]'}`}>
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {unit && (
          <span className="text-sm font-bold text-[#aeb9d5]">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
