import React from 'react'
import { acknowledgeAlarm } from '../api/alarmsApi'
import useEquipmentMonitoring from '../hooks/useEquipmentMonitoring'
import SectionCard from '../components/SectionCard'
import ReadingCard from '../components/ReadingCard'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Flame,
  Zap,
  Gauge,
  Bell,
  Thermometer,
  ShieldCheck,
  Sliders,
  RefreshCw
} from 'lucide-react'

// Custom Horizontal Bar Chart for 3-Phase Voltages (R/Y/B)
function VoltageBarChart({ vr, vy, vb }) {
  const maxVoltage = 300 // scale max to 300V
  const nominal = 230
  
  const getPercentage = (value) => {
    return Math.min(Math.max((value / maxVoltage) * 100, 0), 100)
  }

  const isVoltageAbnormal = (v) => v < 207 || v > 253

  return (
    <SectionCard title="Phase Voltages & Balance Chart" icon={Sliders}>
      <div className="flex flex-col gap-5 py-4 relative">
        {/* Nominal 230V Dotted Line */}
        <div 
          className="absolute top-0 bottom-0 border-r border-dashed border-[#66d7e6]/30 pointer-events-none flex flex-col justify-end"
          style={{ left: `${(nominal / maxVoltage) * 100}%` }}
        >
          <span className="text-[10px] text-[#66d7e6] font-extrabold translate-x-[-50%] bg-[#0b1223] px-1 border border-[#344364] rounded mb-1">
            230V Nominal
          </span>
        </div>

        {/* Phase R (Red) */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold text-[#aeb9d5]">
            <span className="text-red-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Phase R Voltage
            </span>
            <span className={`font-black ${isVoltageAbnormal(vr) ? 'text-red-400' : 'text-[#f8fbff]'}`}>
              {vr?.toFixed(1)} V
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#101a33] rounded overflow-hidden border border-[#344364]">
            <div 
              className={`h-full transition-all duration-500 ${isVoltageAbnormal(vr) ? 'bg-red-500' : 'bg-red-500/80'}`}
              style={{ width: `${getPercentage(vr)}%` }}
            />
          </div>
        </div>

        {/* Phase Y (Yellow/Amber) */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold text-[#aeb9d5]">
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Phase Y Voltage
            </span>
            <span className={`font-black ${isVoltageAbnormal(vy) ? 'text-red-400' : 'text-[#f8fbff]'}`}>
              {vy?.toFixed(1)} V
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#101a33] rounded overflow-hidden border border-[#344364]">
            <div 
              className={`h-full transition-all duration-500 ${isVoltageAbnormal(vy) ? 'bg-red-500' : 'bg-amber-400/80'}`}
              style={{ width: `${getPercentage(vy)}%` }}
            />
          </div>
        </div>

        {/* Phase B (Blue/Cyan) */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold text-[#aeb9d5]">
            <span className="text-[#66d7e6] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Phase B Voltage
            </span>
            <span className={`font-black ${isVoltageAbnormal(vb) ? 'text-red-400' : 'text-[#f8fbff]'}`}>
              {vb?.toFixed(1)} V
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#101a33] rounded overflow-hidden border border-[#344364]">
            <div 
              className={`h-full transition-all duration-500 ${isVoltageAbnormal(vb) ? 'bg-red-500' : 'bg-blue-500/80'}`}
              style={{ width: `${getPercentage(vb)}%` }}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default function MDPPage() {
  const { status, alarms, statusError, refresh } = useEquipmentMonitoring('MDP')

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlarm(id, 'Acknowledged via MDP page')
      toast.success('Alarm acknowledged')
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  const isOffline = !!statusError

  const latestReading = status?.latestReading ?? {}

  const overallStatus = status?.overallStatus || 'NORMAL'

  return (
    <div className="flex flex-col gap-4">
      {/* Offline warning banner if backend is offline */}
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

      {/* 1. State bar at the top (exactly as in original mockup) */}
      <div className="state-bar">
        <span>Current Status</span>
        <strong className={overallStatus === 'CRITICAL' ? 'bad' : 'good'}>
          {overallStatus}
        </strong>
      </div>

      {/* 2. Phase Status section with .phase-grid and .phase-card (exactly as in original mockup) */}
      <SectionCard title="Phase Status" icon={Gauge}>
        <div className="phase-grid">
          <article className="phase-card">
            <h3>Phase R</h3>
            <dl className="kv-list">
              <div><dt>Voltage</dt><dd>{latestReading.voltage_R?.toFixed(1)} V</dd></div>
              <div><dt>Current</dt><dd>{latestReading.current_R?.toFixed(1)} A</dd></div>
              <div><dt>Status</dt><dd className="good">Okay</dd></div>
            </dl>
          </article>

          <article className="phase-card">
            <h3>Phase Y</h3>
            <dl className="kv-list">
              <div><dt>Voltage</dt><dd>{latestReading.voltage_Y?.toFixed(1)} V</dd></div>
              <div><dt>Current</dt><dd>{latestReading.current_Y?.toFixed(1)} A</dd></div>
              <div><dt>Status</dt><dd className="good">Okay</dd></div>
            </dl>
          </article>

          <article className="phase-card">
            <h3>Phase B</h3>
            <dl className="kv-list">
              <div><dt>Voltage</dt><dd>{latestReading.voltage_B?.toFixed(1)} V</dd></div>
              <div><dt>Current</dt><dd>{latestReading.current_B?.toFixed(1)} A</dd></div>
              <div><dt>Status</dt><dd className="good">Okay</dd></div>
            </dl>
          </article>
        </div>
      </SectionCard>

      {/* 3. Voltage Chart & Panel Protection Summary (content-grid two-even) */}
      <div className="content-grid two-even">
        <VoltageBarChart 
          vr={latestReading.voltage_R} 
          vy={latestReading.voltage_Y} 
          vb={latestReading.voltage_B} 
        />
        
        <SectionCard title="Panel Protection Summary" icon={ShieldCheck}>
          <div className="snapshot-grid" style={{ margin: '14px 0' }}>
            <article><span>Earth Fault Relay</span><strong>Healthy</strong></article>
            <article><span>Overcurrent Relay</span><strong>Healthy</strong></article>
            <article><span>Surge Protection</span><strong>Online</strong></article>
            <article><span>Thermal Margin</span><strong>12%</strong></article>
          </div>
        </SectionCard>
      </div>

      {/* 4. Bottom Row: Active Alarms & Cabinet Indicators (content-grid main-side) */}
      <div className="content-grid main-side">
        {/* Left column: Active alarms */}
        <SectionCard title="Active MDP Alarms" icon={Bell}>
          {!alarms || alarms.length === 0 ? (
            <p className="empty-state py-8">No active alarms for this MDP.</p>
          ) : (
            <div className="alarm-table max-h-60 overflow-y-auto">
              {alarms.map((alarm) => (
                <div 
                  key={alarm.id} 
                  className={`alarm-row ${alarm.status === 'ACKNOWLEDGED' ? 'acknowledged' : ''}`}
                >
                  <span className={`severity ${alarm.severity === 'CRITICAL' ? 'danger' : 'warning'}`}>
                    <AlertTriangle size={18} />
                  </span>
                  <strong>{alarm.alarmCode}</strong>
                  <span>
                    {alarm.alarmMessage}
                    {alarm.status === 'ACKNOWLEDGED' && <small>Acknowledged</small>}
                  </span>
                  <time>
                    {new Date(alarm.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  <button
                    type="button"
                    disabled={alarm.status === 'ACKNOWLEDGED'}
                    onClick={() => handleAcknowledge(alarm.id)}
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Right column: Main breaker status, cabinet temperature, and alerts */}
        <SectionCard title="Cabinet Protection Relays" icon={ShieldCheck}>
          <div className="flex flex-col gap-3 py-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Main Breaker Relay</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.main_breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.main_breaker_status || 'OPEN'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Cabinet Temp</span>
              <span className="font-black text-[#f8fbff]">{latestReading.room_temperature_c?.toFixed(1)} °C</span>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Intruder Sensor</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.intruder_alarm 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.intruder_alarm ? 'WARNING' : 'SECURE'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Fire relay Sensor</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.fire_alarm 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.fire_alarm ? 'FIRE WARNING' : 'SECURE'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
