import React, { useState } from 'react'
import { acknowledgeAlarm } from '../api/alarmsApi'
import useEquipmentMonitoring from '../hooks/useEquipmentMonitoring'
import ContextualAlarmPanel from '../components/ContextualAlarmPanel'
import DiagnosisPanel from '../components/DiagnosisPanel'
import PredictionPanel from '../components/PredictionPanel'
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

export default function SDPPage({ onAcknowledge }) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const { equipment, selectedEquipment, status, alarms, statusError, refresh } = useEquipmentMonitoring('SDP', selectedEquipmentId)
  const selectedSdp = selectedEquipment?.equipmentCode ?? 'SDP'

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      if (onAcknowledge) {
        await onAcknowledge(id)
      } else {
        await acknowledgeAlarm(id, `Acknowledged via SDP ${selectedSdp} page`)
        toast.success('Alarm acknowledged')
      }
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  const isOffline = !!statusError

  const latestReading = status?.latestReading ?? {}

  const overallStatus = status?.overallStatus ?? 'OFFLINE'
  const overallStatusClass = overallStatus === 'NORMAL' ? 'good' : 'bad'

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

      {/* Tabs at the top to toggle between SDP panels */}
      <div className="flex border-b border-[#344364] gap-2 mb-2">
        {equipment.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedEquipmentId(item.id)}
            className={`px-6 py-2 text-xs font-black uppercase tracking-wider rounded-t transition-all border-t border-l border-r ${
              String(selectedEquipment?.id) === String(item.id)
                ? 'bg-[#172341] border-[#344364] text-[#66d7e6]'
                : 'bg-transparent border-transparent text-[#aeb9d5] hover:text-[#f8fbff]'
            }`}
          >
            {item.equipmentCode}
          </button>
        ))}
      </div>

      {/* 1. State bar representing selected SDP overallStatus */}
      <div className="state-bar">
        <span>Current Status - {selectedSdp}</span>
        <strong className={overallStatusClass}>
          {overallStatus}
        </strong>
      </div>

      {/* 2. Phase Status section matching MDP styling */}
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

      {/* 3. Voltage Chart & Downstream Summary (content-grid two-even) */}
      <div className="content-grid two-even">
        <VoltageBarChart 
          vr={latestReading.voltage_R} 
          vy={latestReading.voltage_Y} 
          vb={latestReading.voltage_B} 
        />
        
        <SectionCard title="Downstream Protections" icon={ShieldCheck}>
          <div className="snapshot-grid" style={{ margin: '14px 0' }}>
            <article><span>Sub-Breaker Relay</span><strong>Armed</strong></article>
            <article><span>SPD Status</span><strong>Healthy</strong></article>
            <article><span>Earth Leakage</span><strong>Online</strong></article>
            <article><span>Thermal Margin</span><strong>15%</strong></article>
          </div>
        </SectionCard>
      </div>

      {/* 4. Bottom Row: Active Alarms & Cabinet Indicators (content-grid main-side) */}
      <div className="content-grid main-side">
        {/* Left column: Active alarms */}
        <ContextualAlarmPanel
          title={`Active Alarms - ${selectedSdp}`}
          emptyMessage="No active alarms for this SDP."
          alarms={alarms}
          onAcknowledge={handleAcknowledge}
        />

        {/* Right column: Main breaker status, cabinet temperature, and alerts */}
        <SectionCard title="Cabinet Security Indicators" icon={ShieldCheck}>
          <div className="flex flex-col gap-3 py-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Sub Breaker Switch</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.breaker_status ?? 'UNKNOWN'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Cabinet Temp</span>
              <span className="font-black text-[#f8fbff]">{latestReading.room_temperature_c?.toFixed(1)} °C</span>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Cabinet Door Alert</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.intruder_alarm 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.intruder_alarm ? 'OPEN' : 'CLOSED'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Fire relay Sensor</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.fire_alarm 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.fire_alarm ? 'ALARM ACTIVE' : 'SECURE'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="content-grid two-even">
        <DiagnosisPanel alarms={alarms} title="SDP Fault Diagnosis" />
        <PredictionPanel equipmentId={selectedEquipment?.id} title="SDP Prediction" />
      </div>
    </div>
  )
}
