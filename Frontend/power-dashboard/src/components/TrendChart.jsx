import React, { useState } from 'react'

export default function TrendChart({ title = 'Telemetry History', data = [], seriesKeys = [], colors = {} }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  if (!data || data.length === 0 || seriesKeys.length === 0) {
    return (
      <div className="trend-chart-card empty-chart">
        <h4>{title}</h4>
        <p className="empty-state">No historical telemetry data available to display chart.</p>
      </div>
    )
  }

  const width = 640
  const height = 220
  const paddingLeft = 45
  const paddingBottom = 30
  const paddingTop = 20
  const paddingRight = 20

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Collect all values to calculate Y min/max
  const allValues = []
  data.forEach((d) => {
    seriesKeys.forEach((key) => {
      const val = d[key]
      if (typeof val === 'number' && !isNaN(val)) {
        allValues.push(val)
      }
    })
  })

  let minY = allValues.length ? Math.min(...allValues) : 0
  let maxY = allValues.length ? Math.max(...allValues) : 100
  if (minY === maxY) {
    minY = Math.max(0, minY - 10)
    maxY = maxY + 10
  }
  const yBuffer = (maxY - minY) * 0.1 || 5
  minY = Math.floor(minY - yBuffer)
  maxY = Math.ceil(maxY + yBuffer)

  // Map data to SVG coordinates
  const getX = (index) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2
    return paddingLeft + (index / (data.length - 1)) * chartWidth
  }

  const getY = (val) => {
    if (val === null || val === undefined || isNaN(val)) return paddingTop + chartHeight
    return paddingTop + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight
  }

  const defaultColors = ['#00e676', '#29b6f6', '#ab47bc', '#ff9800', '#ec407a']

  return (
    <div className="trend-chart-card">
      <div className="trend-chart-header">
        <h4>{title}</h4>
        <div className="trend-chart-legend">
          {seriesKeys.map((key, idx) => (
            <span key={key} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: colors[key] || defaultColors[idx % defaultColors.length] }}
              />
              {key}
            </span>
          ))}
        </div>
      </div>

      <div className="trend-chart-body">
        <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart-svg">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const yVal = minY + (maxY - minY) * (1 - ratio)
            const yPos = paddingTop + ratio * chartHeight
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#90a4ae"
                  fontSize="10"
                >
                  {Math.round(yVal)}
                </text>
              </g>
            )
          })}

          {/* Time ticks */}
          {data.map((d, idx) => {
            if (idx % Math.ceil(data.length / 5) !== 0 && idx !== data.length - 1) return null
            const xPos = getX(idx)
            const label = d.time ? new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `#${idx + 1}`
            return (
              <text
                key={idx}
                x={xPos}
                y={height - 8}
                textAnchor="middle"
                fill="#90a4ae"
                fontSize="10"
              >
                {label}
              </text>
            )
          })}

          {/* Series Lines */}
          {seriesKeys.map((key, sIdx) => {
            const strokeColor = colors[key] || defaultColors[sIdx % defaultColors.length]
            const points = data
              .map((d, i) => {
                const val = d[key]
                if (val === null || val === undefined || isNaN(val)) return null
                return `${getX(i)},${getY(val)}`
              })
              .filter(Boolean)
              .join(' ')

            return (
              <g key={key}>
                <polyline
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
                {data.map((d, i) => {
                  const val = d[key]
                  if (val === null || val === undefined || isNaN(val)) return null
                  const cx = getX(i)
                  const cy = getY(val)
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={hoverIndex === i ? 5 : 2.5}
                      fill={strokeColor}
                      stroke="#121824"
                      strokeWidth="1.5"
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* Hover overlay guide */}
          {hoverIndex !== null && hoverIndex < data.length ? (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={paddingTop + chartHeight}
                stroke="#64b5f6"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            </g>
          ) : null}
        </svg>

        {hoverIndex !== null && hoverIndex < data.length ? (
          <div className="trend-chart-tooltip" style={{ left: `${(hoverIndex / Math.max(1, data.length - 1)) * 80 + 10}%` }}>
            <div className="tooltip-time">
              {data[hoverIndex].time ? new Date(data[hoverIndex].time).toLocaleTimeString() : `Reading #${hoverIndex + 1}`}
            </div>
            {seriesKeys.map((key) => (
              <div key={key} className="tooltip-val">
                <span>{key}:</span> <strong>{data[hoverIndex][key] ?? '--'}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
