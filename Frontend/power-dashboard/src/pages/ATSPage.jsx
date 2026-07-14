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
  Zap,
  PlugZap,
  Bell,
  Thermometer,
  ShieldCheck,
  Gauge,
  ClipboardList,
  RefreshCw
} from 'lucide-react'

export default function ATSPage({ onAcknowledge }) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const { equipment, selectedEquipment, status, alarms, statusError, refresh } = useEquipmentMonitoring('ATS', selectedEquipmentId)

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      if (onAcknowledge) {
        await onAcknowledge(id)
      } else {
        await acknowledgeAlarm(id, 'Acknowledged via ATS page')
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

  const activeSource = (latestReading.active_source ?? 'UNKNOWN').toUpperCase()
  const isMainsActive = activeSource === 'MAINS'
  const isGeneratorActive = activeSource === 'GENERATOR'
  const transferStatus = (latestReading.transfer_status ?? 'UNKNOWN').toUpperCase()
  const generatorMode = activeSource === 'MAINS' ? 'Standby' : activeSource === 'GENERATOR' ? 'Active' : 'Unknown'

  return (
    <div className="flex flex-col gap-4">
      <EquipmentSelector
        equipment={equipment}
        selectedEquipmentId={selectedEquipment?.id}
        onChange={setSelectedEquipmentId}
      />
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

      {/* 1. MetricStrip row (exactly as mockup, dynamically connected) */}
      <section className="metric-strip" aria-label="ATS metrics">
        <article className="metric-panel">
          <div className="panel-heading">
            <PlugZap size={18} />
            <h2>Utility Supply</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">{latestReading.mains_voltage?.toFixed(1)} V</p>
          <span className="metric-note">{isMainsActive ? 'Supplying the load' : 'Available standby source'}</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <Gauge size={18} />
            <h2>Generator</h2>
          </div>
          <div className="divider" />
          <p className="metric-value">{latestReading.generator_voltage?.toFixed(1)} V</p>
          <span className="metric-note">Status: {generatorMode}</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <ClipboardList size={18} />
            <h2>ATS Position</h2>
          </div>
          <div className="divider" />
          <p className="metric-value" style={{ fontSize: '20px', marginTop: '16px' }}>Load on {activeSource}</p>
          <span className="metric-note">Transfer: {latestReading.transfer_status || 'UNKNOWN'}</span>
        </article>

        <article className="metric-panel">
          <div className="panel-heading">
            <ShieldCheck size={18} />
            <h2>Transfer Status</h2>
          </div>
          <div className="divider" />
          <div className="mt-2 text-left">
            <span className={`px-2 py-0.5 rounded text-xs font-black tracking-wide ${
              transferStatus === 'FAILED'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {transferStatus}
            </span>
          </div>
          <span className="metric-note">Overall status: {status?.overallStatus ?? 'OFFLINE'}</span>
        </article>
      </section>

      {/* 2. Middle Row: Visual Flow & Parameters (content-grid two-even) */}
      <div className="content-grid two-even">
        {/* Left: SVG Flow map matching App.css absolute coordinate styles */}
        <SectionCard title="Utility Source Flow Map">
          <div className="ats-flow" style={{ borderRadius: '4px' }}>
            <svg className="ats-wires" viewBox="0 0 620 260" aria-hidden="true">
              <path 
                className="wire utility" 
                style={{ stroke: isMainsActive ? '#80b95a' : '#e04444', transition: 'stroke 0.4s' }}
                d="M115 82 H278" 
              />
              <path 
                className="wire generator" 
                style={{ stroke: isGeneratorActive ? '#80b95a' : '#e04444', transition: 'stroke 0.4s' }}
                d="M122 190 V148 H278" 
              />
              <path className="wire load" style={{ stroke: '#3a6ad8' }} d="M340 116 H505" />
              <circle className="junction" cx="306" cy="116" r="8" />
            </svg>
            <div className={`source ${isMainsActive ? 'green' : 'inactive'} utility-node`}>UTILITY<span>{latestReading.mains_voltage?.toFixed(1) ?? '—'} V</span></div>
            <div className={`source ${transferStatus === 'FAILED' ? 'danger' : 'teal'} ats-node`}>ATS<span>{transferStatus}</span></div>
            <div className="source blue load-node">LOAD<span>Active: {activeSource}</span></div>
            <div className={`source ${isGeneratorActive ? 'green' : 'inactive'} generator-node`}>GENERATOR<span>{latestReading.generator_voltage?.toFixed(1) ?? '—'} V</span></div>
          </div>
        </SectionCard>

        {/* Right: Telemetry parameters */}
        <SectionCard title="Electrical Parameters" icon={Zap}>
          <dl className="parameter-list">
            <div><dt>Utility Voltage</dt><dd>{latestReading.mains_voltage?.toFixed(1)} V</dd></div>
            <div><dt>Generator Voltage L - L</dt><dd>{latestReading.generator_voltage?.toFixed(1)} V</dd></div>
            <div><dt>Active source</dt><dd>{activeSource}</dd></div>
            <div><dt>Phases</dt><dd><span className="phase r">R</span><span className="phase y">Y</span><span className="phase b">B</span></dd></div>
            <div><dt>Last transfer</dt><dd>{latestReading.last_transfer_at ? new Date(latestReading.last_transfer_at).toLocaleString() : 'No transfer recorded'}</dd></div>
          </dl>
        </SectionCard>
      </div>

      {/* 3. Voltages and Temperature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ReadingCard 
          label="Mains Line Voltage" 
          value={latestReading.mains_voltage?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
          alert={latestReading.mains_voltage < 207 || latestReading.mains_voltage > 253}
        />
        <ReadingCard 
          label="Generator Line Voltage" 
          value={latestReading.generator_voltage?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
          alert={!isMainsActive && (latestReading.generator_voltage < 207 || latestReading.generator_voltage > 253)}
        />
        <ReadingCard 
          label="ATS Room Temp" 
          value={latestReading.room_temperature_c?.toFixed(1)} 
          unit="°C" 
          icon={Thermometer} 
        />
      </div>

      {/* 4. Bottom Row: Active Alarms and Events List */}
      <div className="content-grid main-side">
        {/* Left column: Active alarms */}
        <ContextualAlarmPanel
          title="Active ATS Alarms"
          emptyMessage="No active alarms for this ATS."
          alarms={alarms}
          onAcknowledge={handleAcknowledge}
        />

        {/* Right column: Cabinet protection relays and last transfer timestamp */}
        <SectionCard title="ATS Cabinet Relays" icon={PlugZap}>
          <div className="flex flex-col gap-3 py-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#aeb9d5]">Main Breaker Relay</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                latestReading.breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.breaker_status ?? 'UNKNOWN'}
              </span>
            </div>

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
                {latestReading.fire_alarm ? 'FIRE ALERT' : 'SECURE'}
              </span>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#aeb9d5]">Last Transfer Occurrence</span>
              <strong className="text-[#f8fbff] text-[11px]">
                {latestReading.last_transfer_at ? new Date(latestReading.last_transfer_at).toLocaleString() : 'N/A'}
              </strong>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
