import React, { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import usePolling from '../hooks/usePolling'
import StatusBadge from '../components/StatusBadge'
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
  ShieldAlert,
  ClipboardList,
  RefreshCw
} from 'lucide-react'

// Dummy charts for premium visual aesthetic (matching the theme)
function GeneratorChartPanel({ title, variant, legend }) {
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
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 1. Fetch generator status
  const fetchStatus = useCallback(() => {
    return api.get('/api/generator/status').then(res => res.data)
  }, [])
  const { data: status, loading: statusLoading, error: statusError } = usePolling(fetchStatus, 5000)

  // 2. Fetch active generator alarms
  const fetchAlarms = useCallback(() => {
    return api.get('/api/generator/alarms').then(res => res.data)
  }, [])
  const { data: alarms, loading: alarmsLoading, error: alarmsError } = usePolling(fetchAlarms, 5000)

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/api/alarms/${id}/acknowledge`, { note: 'Acknowledged via Generator dashboard' })
      toast.success('Alarm acknowledged')
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  // Force reload data helper (optional convenience)
  const handleManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Use local fallback if APIs are loading or offline for demo purposes, but show warnings
  const isOffline = statusError || alarmsError

  // Extracted reading metrics
  const latestReading = status?.latestReading || {
    voltage_L1: 230.0,
    voltage_L2: 230.0,
    voltage_L3: 230.0,
    current_L1: 0.0,
    current_L2: 0.0,
    current_L3: 0.0,
    fuel_level_pct: 0,
    frequency_hz: 50.0,
    running_status: 'STOPPED',
    breaker_status: 'OPEN',
    room_temperature_c: 25.0,
    intruder_alarm: false,
    fire_alarm: false
  }

  const fuelPct = latestReading.fuel_level_pct || 0
  let fuelBarColor = 'bg-red-500'
  if (fuelPct >= 40) {
    fuelBarColor = 'bg-green-500'
  } else if (fuelPct >= 20) {
    fuelBarColor = 'bg-amber-500'
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#344364] bg-[#172341]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
          <h2 className="text-sm text-[#aeb9d5] font-black uppercase tracking-wider">
            Generator Status Monitor
          </h2>
          {isOffline && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              Backend Offline (Using Cached/Default Data)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#101a33] px-3 py-1.5 rounded-lg border border-[#344364]">
            <span className="text-xs text-[#aeb9d5] font-bold">Running Status:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-black tracking-wide ${
              latestReading.running_status === 'RUNNING' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : latestReading.running_status === 'FAULT'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-[#344364] text-[#aeb9d5] border border-[#344364]'
            }`}>
              {latestReading.running_status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#101a33] px-3 py-1.5 rounded-lg border border-[#344364]">
            <span className="text-xs text-[#aeb9d5] font-bold">Active Alarms:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-black tracking-wide ${
              status?.activeAlarmCount > 0 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {status?.activeAlarmCount ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#101a33] px-3 py-1.5 rounded-lg border border-[#344364]">
            <span className="text-xs text-[#aeb9d5] font-bold">Overall Status:</span>
            <StatusBadge status={status?.overallStatus || 'NORMAL'} />
          </div>
        </div>
      </div>

      {/* 2. Readings Grid: 6 cards for Voltage & Current */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
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

      {/* 3. Fuel Level & Key Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Level Card */}
        <SectionCard title="Fuel System" icon={SlidersHorizontal}>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[#aeb9d5] text-xs">Current Fuel Level</span>
              <span className="text-xl text-[#f8fbff] font-black">{fuelPct.toFixed(1)}%</span>
            </div>
            
            {/* Horizontal progress bar */}
            <div className="w-full bg-[#101a33] h-4 rounded-full overflow-hidden border border-[#344364] p-[2px]">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${fuelBarColor}`}
                style={{ width: `${Math.min(Math.max(fuelPct, 0), 100)}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[10px] text-[#aeb9d5] font-bold uppercase mt-1">
              <span className={fuelPct < 10 ? 'text-red-400 font-extrabold' : ''}>Critical (10%)</span>
              <span className={fuelPct < 20 ? 'text-amber-400 font-extrabold' : ''}>Low (20%)</span>
              <span>Full (100%)</span>
            </div>
          </div>
        </SectionCard>

        {/* Frequency & Temperature */}
        <div className="grid grid-cols-2 gap-4">
          <ReadingCard 
            label="Frequency" 
            value={latestReading.frequency_hz?.toFixed(1)} 
            unit="Hz" 
            icon={Zap} 
          />
          <ReadingCard 
            label="Room Temp" 
            value={latestReading.room_temperature_c?.toFixed(1)} 
            unit="°C" 
            icon={Thermometer} 
            alert={latestReading.room_temperature_c > 45}
          />
        </div>

        {/* Breaker, Intruder & Fire Indicators */}
        <SectionCard title="Safety & Breaker Relays" icon={ShieldAlert}>
          <div className="flex flex-col gap-3 justify-center h-full pb-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Breaker Status</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.breaker_status || 'OPEN'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold flex items-center gap-1.5">
                Fire Protection Relay
              </span>
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.fire_alarm 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-bounce' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.fire_alarm && <Flame size={12} className="animate-pulse" />}
                {latestReading.fire_alarm ? 'FIRE TRIGGERED' : 'NORMAL / SECURE'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Intruder Sensor</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.intruder_alarm 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.intruder_alarm ? 'INTRUSION DETECTED' : 'NORMAL / SECURE'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 4. Premium Mock Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GeneratorChartPanel title="Power & Voltage" variant="power" legend={['Power (kW)', 'Voltage (V)']} />
        <GeneratorChartPanel title="Engine Parameters" variant="engine" legend={['Coolant Temp (°C)', 'Oil Pressure (psi)']} />
      </div>

      {/* 5. Alarms Panel & Maintenance snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard title="Active Generator Alarms" icon={Bell}>
            {alarmsLoading && <p className="text-xs text-[#aeb9d5] py-4">Polling alarms status...</p>}
            {!alarmsLoading && (!alarms || alarms.length === 0) ? (
              <p className="text-xs text-[#aeb9d5] py-4 italic text-center">No active alarms for this generator.</p>
            ) : (
              <div className="alarm-table max-h-60 overflow-y-auto mt-2">
                {alarms?.map((alarm) => (
                  <div key={alarm.id} className="alarm-row flex items-center justify-between py-2 border-b border-[#344364]">
                    <div className="flex items-center gap-3">
                      <span className={`severity ${alarm.severity === 'CRITICAL' ? 'danger' : ''} text-lg`}>
                        <AlertTriangle size={18} />
                      </span>
                      <div>
                        <strong className="text-sm font-black text-[#f8fbff] block">{alarm.alarmCode}</strong>
                        <span className="text-xs text-[#aeb9d5]">{alarm.alarmMessage}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <time className="text-xs text-[#aeb9d5] font-semibold">
                        {new Date(alarm.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(alarm.id)}
                        className="px-3 py-1 rounded text-xs font-extrabold bg-[#344364] hover:bg-[#66d7e6] hover:text-[#0b1223] transition-colors"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Generator Maintenance Snapshot" icon={ClipboardList}>
            <div className="snapshot-grid gap-4 mt-2">
              <article className="p-3 bg-[#101a33] rounded-lg border border-[#344364]">
                <span className="text-[10px] text-[#aeb9d5] font-black uppercase">Last Service</span>
                <strong className="block text-sm text-[#f8fbff] mt-1">12 Feb 2026</strong>
              </article>
              <article className="p-3 bg-[#101a33] rounded-lg border border-[#344364]">
                <span className="text-[10px] text-[#aeb9d5] font-black uppercase">Runtime Hours</span>
                <strong className="block text-sm text-[#f8fbff] mt-1">1,284 h</strong>
              </article>
              <article className="p-3 bg-[#101a33] rounded-lg border border-[#344364]">
                <span className="text-[10px] text-[#aeb9d5] font-black uppercase">Next Test</span>
                <strong className="block text-sm text-[#f8fbff] mt-1">Weekly Run</strong>
              </article>
              <article className="p-3 bg-[#101a33] rounded-lg border border-[#344364]">
                <span className="text-[10px] text-[#aeb9d5] font-black uppercase">Assigned Team</span>
                <strong className="block text-sm text-[#f8fbff] mt-1">Electrical Ops</strong>
              </article>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
