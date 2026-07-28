import React, { useState } from 'react'
import { acknowledgeAlarm } from '../api/alarmsApi'
import useEquipmentMonitoring from '../hooks/useEquipmentMonitoring'
import EquipmentSelector from '../components/EquipmentSelector'
import ContextualAlarmPanel from '../components/ContextualAlarmPanel'
import DiagnosisPanel from '../components/DiagnosisPanel'
import PredictionPanel from '../components/PredictionPanel'
import ReadingCard from '../components/ReadingCard'
import SectionCard from '../components/SectionCard'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Flame,
  Gauge,
  Zap,
  SlidersHorizontal,
  Bell,
  Thermometer,
  ShieldCheck,
  ClipboardList,
  RefreshCw
} from 'lucide-react'

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatSampleTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function buildTrendPath(values, min, max, width = 520, height = 112, top = 18) {
  const range = max - min || 1
  let started = false

  return values.map((value, index) => {
    if (value === null) return ''
    const x = values.length > 1 ? (index / (values.length - 1)) * width : width / 2
    const bounded = Math.min(max, Math.max(min, value))
    const y = top + height - ((bounded - min) / range) * height
    const command = started ? 'L' : 'M'
    started = true
    return `${command}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

function LiveTrendPanel({ title, readings, series, min, max, unit }) {
  const samples = [...readings].reverse()
  const plottedSeries = series.map((item) => ({
    ...item,
    values: samples.map((sample) => toNumber(sample.data?.[item.key])),
  }))
  const hasData = plottedSeries.some((item) => item.values.some((value) => value !== null))

  return (
    <SectionCard title={title}>
      {hasData ? (
        <>
          <div className="telemetry-chart">
            <svg viewBox="0 0 520 150" role="img" aria-label={`${title} from recent telemetry`}>
              <g className="chart-grid-lines">
                <path d="M0 30 H520" />
                <path d="M0 75 H520" />
                <path d="M0 120 H520" />
              </g>
              {plottedSeries.map((item) => <path key={item.key} className="telemetry-line" style={{ stroke: item.color }} d={buildTrendPath(item.values, min, max)} />)}
            </svg>
            <div className="telemetry-scale" aria-hidden="true"><span>{max} {unit}</span><span>{min} {unit}</span></div>
          </div>
          <div className="axis-labels">
            <span>{formatSampleTime(samples[0]?.recordedAt)}</span>
            <span>{formatSampleTime(samples[Math.floor(samples.length / 2)]?.recordedAt)}</span>
            <span>{formatSampleTime(samples.at(-1)?.recordedAt)}</span>
          </div>
          <div className="chart-legend">
            {plottedSeries.map((item) => <span key={item.key} style={{ '--legend-color': item.color }}>{item.label} ({item.unit})</span>)}
          </div>
        </>
      ) : <p className="empty-state">Waiting for live generator readings to draw this trend.</p>}
    </SectionCard>
  )
}

function GeneratorConditionsTrend({ readings }) {
  const samples = [...readings].reverse()
  const metrics = [
    { key: 'frequency_hz', label: 'Frequency', unit: 'Hz', min: 48, max: 52, color: '#4c8cff' },
    { key: 'room_temperature_c', label: 'Room temperature', unit: '°C', min: 15, max: 50, color: '#ff8a55' },
  ]

  return (
    <SectionCard title="Generator Conditions">
      <div className="condition-trends">
        {metrics.map((metric) => {
          const values = samples.map((sample) => toNumber(sample.data?.[metric.key]))
          const current = values.at(-1)
          return (
            <div className="condition-trend" key={metric.key}>
              <div className="condition-trend-heading">
                <span>{metric.label}</span>
                <strong>{current === null || current === undefined ? '—' : `${current.toFixed(1)} ${metric.unit}`}</strong>
              </div>
              <svg viewBox="0 0 520 54" role="img" aria-label={`${metric.label} recent trend`}>
                <path className="condition-baseline" d="M0 46 H520" />
                <path className="condition-line" style={{ stroke: metric.color }} d={buildTrendPath(values, metric.min, metric.max, 520, 40, 6)} />
              </svg>
              <small>Operating band {metric.min}–{metric.max} {metric.unit}</small>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

export default function GeneratorPage({ onAcknowledge }) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const { equipment, selectedEquipment, status, alarms, readings, statusError, refresh } = useEquipmentMonitoring('GENERATOR', selectedEquipmentId)

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      if (onAcknowledge) {
        await onAcknowledge(id)
      } else {
        await acknowledgeAlarm(id, 'Acknowledged via Generator page')
        toast.success('Alarm acknowledged')
      }
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  const isOffline = !!statusError

  // Telemetry mappings
  const latestReading = status?.latestReading ?? {}

  const averageOf = (...values) => {
    const numbers = values.map(toNumber).filter((value) => value !== null)
    return numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : null
  }
  const averageVoltage = averageOf(latestReading.voltage_L1, latestReading.voltage_L2, latestReading.voltage_L3)
  const averageCurrent = averageOf(latestReading.current_L1, latestReading.current_L2, latestReading.current_L3)

  const fuelPct = Number.isFinite(latestReading.fuel_level_pct) ? latestReading.fuel_level_pct : null
  const remainingHours = fuelPct === null ? null : (fuelPct * 0.12).toFixed(1)
  let fuelBarColor = '#64748b'
  if (fuelPct !== null && fuelPct < 20) {
    fuelBarColor = '#e23a3a' // red
  } else if (fuelPct !== null && fuelPct < 40) {
    fuelBarColor = '#f28b2d' // amber
  }

  return (
    <div className="flex flex-col gap-4">
      <EquipmentSelector
        equipment={equipment}
        selectedEquipmentId={selectedEquipment?.id}
        onChange={setSelectedEquipmentId}
      />
      {/* Offline warning banner if backend is unavailable */}
      {isOffline && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400 font-bold flex justify-between items-center">
          <span>⚠️ Backend unavailable — no live telemetry is being displayed.</span>
          <button 
            onClick={() => refresh()}
            className="flex items-center gap-1 hover:text-white"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* 1. MetricStrip row (4 aligned panels exactly as in original mockup) */}
      <section className="metric-strip" aria-label="Generator metrics">
        <article className="metric-panel">
          <div className="panel-heading">
            <ShieldCheck size={18} />
            <h2>Generator Running</h2>
          </div>
          <div className="divider" />
          <div className="mt-2 text-left">
            <span className={`px-2 py-0.5 rounded text-xs font-black tracking-wide ${
              latestReading.running_status === 'RUNNING' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : latestReading.running_status === 'FAULT'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {latestReading.running_status || 'UNKNOWN'}
            </span>
          </div>
          <span className="metric-note">Overall status: {status?.overallStatus ?? 'OFFLINE'}</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <Gauge size={18} />
            <h2>Phase Current</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">{averageCurrent === null ? '—' : `${averageCurrent.toFixed(1)} A`}</p>
          <span className="metric-note">Average across L1, L2 and L3</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <SlidersHorizontal size={18} />
            <h2>Fuel Level</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">{fuelPct === null ? '—' : `${fuelPct.toFixed(1)}%`}</p>
          <span className="metric-note">Est. runtime: {remainingHours === null ? '—' : `${remainingHours} Hours`}</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <Zap size={18} />
            <h2>Frequency</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">{latestReading.frequency_hz?.toFixed(1) ?? '—'} Hz</p>
          <span className="metric-note">Live alternator frequency</span>
        </article>
      </section>

      {/* 2. Middle Row: Visual Charts (content-grid two-even) */}
      <div className="content-grid two-even">
        <LiveTrendPanel
          title="Three-Phase Voltage Trend"
          readings={readings}
          min={200}
          max={260}
          unit="V"
          series={[
            { key: 'voltage_L1', label: 'L1', unit: 'V', color: '#447ae4' },
            { key: 'voltage_L2', label: 'L2', unit: 'V', color: '#79cf6b' },
            { key: 'voltage_L3', label: 'L3', unit: 'V', color: '#b7791f' },
          ]}
        />
        <GeneratorConditionsTrend readings={readings} />
      </div>

      {/* 3. Readings Grid: 6 cards for Voltage & Current */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <ReadingCard 
          label="Voltage L1" 
          value={latestReading.voltage_L1?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
          alert={latestReading.voltage_L1 < 207 || latestReading.voltage_L1 > 253}
        />
        <ReadingCard 
          label="Voltage L2" 
          value={latestReading.voltage_L2?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
          alert={latestReading.voltage_L2 < 207 || latestReading.voltage_L2 > 253}
        />
        <ReadingCard 
          label="Voltage L3" 
          value={latestReading.voltage_L3?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
          alert={latestReading.voltage_L3 < 207 || latestReading.voltage_L3 > 253}
        />
        <ReadingCard 
          label="Current L1" 
          value={latestReading.current_L1?.toFixed(1)} 
          unit="A" 
          icon={Gauge} 
        />
        <ReadingCard 
          label="Current L2" 
          value={latestReading.current_L2?.toFixed(1)} 
          unit="A" 
          icon={Gauge} 
        />
        <ReadingCard 
          label="Current L3" 
          value={latestReading.current_L3?.toFixed(1)} 
          unit="A" 
          icon={Gauge} 
        />
      </div>

      {/* 4. Bottom Row: Active Alarms and Fault Diagnosis / Relays */}
      <div className="content-grid main-side">
        {/* Left column: Active alarms using the original .alarm-table styling */}
        <ContextualAlarmPanel
          title="Active Generator Alarms"
          emptyMessage="No active alarms for this generator."
          alarms={alarms}
          onAcknowledge={handleAcknowledge}
        />

        {/* Right column: Fault Diagnosis with fuel bar, temperature, and indicators */}
        <SectionCard title="Safety & Diagnostics" icon={AlertTriangle}>
          <div className="flex flex-col gap-4 py-1.5">
            {/* Horizontal progress bar for fuel */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold text-[#aeb9d5]">
                <span>Fuel Reservoir Level</span>
                <span className="text-[#f8fbff]">{fuelPct === null ? '—' : `${fuelPct.toFixed(1)}%`}</span>
              </div>
              <div className="w-full bg-[#101a33] h-3.5 rounded p-[1px] border border-[#344364]">
                <div 
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${fuelPct ?? 0}%`, backgroundColor: fuelBarColor }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs p-2 rounded bg-[#101a33] border border-[#344364]">
              <span className="font-bold text-[#aeb9d5]">Alternator Frequency</span>
              <span className="font-black text-[#f8fbff]">{latestReading.frequency_hz?.toFixed(1)} Hz</span>
            </div>

            <div className="flex justify-between items-center text-xs p-2 rounded bg-[#101a33] border border-[#344364]">
              <span className="font-bold text-[#aeb9d5]">Room Temperature</span>
              <span className="font-black text-[#f8fbff]">{latestReading.room_temperature_c?.toFixed(1)} °C</span>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#aeb9d5]">Main Breaker Relay</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.breaker_status ?? 'UNKNOWN'}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#aeb9d5]">Cabinet Intrusion</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.intruder_alarm 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.intruder_alarm ? 'WARNING' : 'SECURE'}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#aeb9d5]">Thermal Fire Sensor</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.fire_alarm 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-bounce' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.fire_alarm ? 'FIRE DETECTED' : 'SECURE'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="content-grid two-even">
        <DiagnosisPanel alarms={alarms} title="Generator Fault Diagnosis" />
        <PredictionPanel equipmentId={selectedEquipment?.id} title="Generator Prediction" />
      </div>

      {/* 5. Live monitoring snapshot */}
      <SectionCard title="Live Monitoring Snapshot" icon={ClipboardList}>
        <div className="snapshot-grid">
          <article><span>Equipment</span><strong>{selectedEquipment?.equipmentCode ?? '—'}</strong></article>
          <article><span>Last telemetry sample</span><strong>{status?.recordedAt ? new Date(status.recordedAt).toLocaleString() : '—'}</strong></article>
          <article><span>Average phase voltage</span><strong>{averageVoltage === null ? '—' : `${averageVoltage.toFixed(1)} V`}</strong></article>
          <article><span>Active alarms</span><strong>{status?.activeAlarmCount ?? '—'}</strong></article>
        </div>
      </SectionCard>
    </div>
  )
}
