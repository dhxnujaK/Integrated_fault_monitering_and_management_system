import React, { useState } from 'react'
import { acknowledgeAlarm } from '../api/alarmsApi'
import useEquipmentMonitoring from '../hooks/useEquipmentMonitoring'
import EquipmentSelector from '../components/EquipmentSelector'
import ContextualAlarmPanel from '../components/ContextualAlarmPanel'
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

// Premium mock ChartPanel to match the theme
function ChartPanel({ title, variant, legend }) {
  const chartSeries = {
    power: {
      a: [46, 42, 51, 47, 58, 54, 61, 57, 66, 62, 70, 68],
      b: [32, 34, 37, 36, 42, 40, 45, 44, 49, 47, 52, 50],
    },
    engine: {
      a: [64, 61, 69, 66, 75, 70, 78, 73, 81, 76, 84, 79],
      b: [42, 48, 45, 55, 50, 59, 53, 62, 58, 64, 60, 66],
    },
  }

  const series = chartSeries[variant] ?? chartSeries.power

  const buildLinePath = (values) => {
    const max = Math.max(...values)
    const min = Math.min(...values)
    const width = 520
    const height = 118
    const top = 16
    const range = max - min || 1
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = top + height - ((value - min) / range) * height
      return [x, y]
    })
    return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  }

  return (
    <SectionCard title={title}>
      <div className={`chart-placeholder ${variant}`}>
        <svg viewBox="0 0 520 150" role="img" aria-label={`${title} chart placeholder`}>
          <g className="chart-grid-lines">
            <path d="M0 30 H520" />
            <path d="M0 75 H520" />
            <path d="M0 120 H520" />
          </g>
          <path className="line-a" d={buildLinePath(series.a)} />
          <path className="line-b" d={buildLinePath(series.b)} />
        </svg>
      </div>
      <div className="axis-labels"><span>9:00</span><span>10:00</span><span>11:00</span><span>12:00</span></div>
      <div className="chart-legend">
        {legend.map((item) => <span key={item}>{item}</span>)}
      </div>
    </SectionCard>
  )
}

export default function GeneratorPage() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const { equipment, selectedEquipment, status, alarms, statusError, refresh } = useEquipmentMonitoring('GENERATOR', selectedEquipmentId)

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlarm(id, 'Acknowledged via Generator page')
      toast.success('Alarm acknowledged')
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  const isOffline = !!statusError

  // Telemetry mappings
  const latestReading = status?.latestReading ?? {}

  const fuelPct = latestReading.fuel_level_pct || 0
  const remainingHours = (fuelPct * 0.12).toFixed(1)
  let fuelBarColor = '#76d33f' // green
  if (fuelPct < 20) {
    fuelBarColor = '#e23a3a' // red
  } else if (fuelPct < 40) {
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
          <span className="metric-note">Overall status: {status?.overallStatus || 'NORMAL'}</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <Gauge size={18} />
            <h2>Output Power</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">250 kW <span style={{ fontSize: '14px', color: 'var(--muted)' }}>/ 312 kVA</span></p>
          <span className="metric-note">Balanced phase loads</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <SlidersHorizontal size={18} />
            <h2>Fuel Level</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">{fuelPct.toFixed(1)}%</p>
          <span className="metric-note">Est. runtime: {remainingHours} Hours</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <Zap size={18} />
            <h2>Battery Voltage</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">11.1 V</p>
          <span className="metric-note">charging active</span>
        </article>
      </section>

      {/* 2. Middle Row: Visual Charts (content-grid two-even) */}
      <div className="content-grid two-even">
        <ChartPanel title="Power & Voltage" variant="power" legend={['Power (kW)', 'Voltage (V)']} />
        <ChartPanel title="Engine Parameters" variant="engine" legend={['Coolant Temp (°C)', 'Oil Pressure (psi)']} />
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
                <span className="text-[#f8fbff]">{fuelPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#101a33] h-3.5 rounded p-[1px] border border-[#344364]">
                <div 
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${fuelPct}%`, backgroundColor: fuelBarColor }}
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
                {latestReading.breaker_status || 'OPEN'}
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

      {/* 5. Maintenance Snapshot at the bottom (matching original positions) */}
      <SectionCard title="Generator Maintenance Snapshot" icon={ClipboardList}>
        <div className="snapshot-grid">
          <article><span>Last Service</span><strong>12 Feb 2026</strong></article>
          <article><span>Runtime Hours</span><strong>1,284 h</strong></article>
          <article><span>Next Test</span><strong>Weekly run</strong></article>
          <article><span>Assigned Team</span><strong>Electrical Ops</strong></article>
        </div>
      </SectionCard>
    </div>
  )
}
