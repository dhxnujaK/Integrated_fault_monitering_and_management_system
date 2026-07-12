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
  Zap,
  PlugZap,
  Bell,
  Thermometer,
  ShieldAlert,
  ClipboardList
} from 'lucide-react'

export default function ATSPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 1. Fetch ATS status
  const fetchStatus = useCallback(() => {
    return api.get('/api/ats/status').then(res => res.data)
  }, [])
  const { data: status, loading: statusLoading, error: statusError } = usePolling(fetchStatus, 5000)

  // 2. Fetch active ATS alarms
  const fetchAlarms = useCallback(() => {
    return api.get('/api/ats/alarms').then(res => res.data)
  }, [])
  const { data: alarms, loading: alarmsLoading, error: alarmsError } = usePolling(fetchAlarms, 5000)

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/api/alarms/${id}/acknowledge`, { note: 'Acknowledged via ATS dashboard' })
      toast.success('Alarm acknowledged')
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  const isOffline = statusError || alarmsError

  // Extracted reading metrics
  const latestReading = status?.latestReading || {
    active_source: 'MAINS',
    mains_voltage: 230.0,
    generator_voltage: 0.0,
    transfer_status: 'NORMAL',
    breaker_status: 'OPEN',
    last_transfer_at: '2024-01-15T10:30:00',
    room_temperature_c: 25.0,
    intruder_alarm: false,
    fire_alarm: false
  }

  const activeSource = latestReading.active_source || 'MAINS'
  const isMainsActive = activeSource.toUpperCase() === 'MAINS'

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#344364] bg-[#172341]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
          <h2 className="text-sm text-[#aeb9d5] font-black uppercase tracking-wider">
            ATS Status Monitor
          </h2>
          {isOffline && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              Backend Offline (Using Cached/Default Data)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#101a33] px-3 py-1.5 rounded-lg border border-[#344364]">
            <span className="text-xs text-[#aeb9d5] font-bold">Transfer Status:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-black tracking-wide ${
              latestReading.transfer_status === 'NORMAL' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : latestReading.transfer_status === 'FAILED'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {latestReading.transfer_status || 'UNKNOWN'}
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

      {/* 2. Visual Interactive Flow Diagram & Parameter list */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ATS Wiring SVG Diagram */}
        <SectionCard title="Active Power Path" icon={PlugZap}>
          <div className="ats-flow relative min-h-[260px] flex items-center justify-center p-4">
            <svg className="ats-wires w-full max-w-[500px]" viewBox="0 0 620 260" aria-hidden="true">
              {/* Utility to ATS Wire */}
              <path 
                className={`wire utility stroke-[4px] fill-none transition-all duration-500 ${
                  isMainsActive 
                    ? 'stroke-green-500 shadow-lg shadow-green-500/50' 
                    : 'stroke-[#344364]'
                }`} 
                d="M115 82 H278" 
              />
              {/* Generator to ATS Wire */}
              <path 
                className={`wire generator stroke-[4px] fill-none transition-all duration-500 ${
                  !isMainsActive 
                    ? 'stroke-[#66d7e6] shadow-lg shadow-cyan-500/50' 
                    : 'stroke-[#344364]'
                }`} 
                d="M122 190 V148 H278" 
              />
              {/* ATS to Load Wire */}
              <path 
                className="wire load stroke-[4px] fill-none stroke-[#aeb9d5]" 
                d="M340 116 H505" 
              />
              <circle className="junction fill-[#f8fbff]" cx="306" cy="116" r="8" />
            </svg>
            
            <div className={`source absolute left-[15px] top-[40px] text-center font-bold p-3 rounded-lg border uppercase ${
              isMainsActive 
                ? 'bg-green-500/20 text-green-400 border-green-500/30 font-black' 
                : 'bg-[#101a33] text-[#aeb9d5] border-[#344364]'
            }`}>
              CEB Utility
              <span className="block text-[10px] normal-case mt-1">
                {latestReading.mains_voltage?.toFixed(1)} V
              </span>
            </div>

            <div className="source absolute left-[265px] top-[80px] text-center font-bold px-5 py-2.5 rounded-lg border bg-[#172341] border-[#66d7e6] text-[#f8fbff] font-black uppercase">
              ATS Switch
            </div>

            <div className="source absolute right-[20px] top-[80px] text-center font-bold p-3 rounded-lg border border-blue-500/30 bg-blue-500/20 text-blue-400 uppercase">
              Main Load
              <span className="block text-[10px] normal-case mt-1">
                Connected: {activeSource}
              </span>
            </div>

            <div className={`source absolute left-[15px] bottom-[20px] text-center font-bold p-3 rounded-lg border uppercase ${
              !isMainsActive 
                ? 'bg-[#66d7e6]/20 text-[#66d7e6] border-[#66d7e6]/30 font-black' 
                : 'bg-[#101a33] text-[#aeb9d5] border-[#344364]'
            }`}>
              Generator
              <span className="block text-[10px] normal-case mt-1">
                {latestReading.generator_voltage?.toFixed(1)} V
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Electrical parameters details card */}
        <SectionCard title="Telemetry Details" icon={Zap}>
          <dl className="parameter-list flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <dt className="text-xs text-[#aeb9d5] font-bold">Utility Voltage</dt>
              <dd className="text-sm font-black text-[#f8fbff]">{latestReading.mains_voltage?.toFixed(1)} V</dd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <dt className="text-xs text-[#aeb9d5] font-bold">Generator Voltage</dt>
              <dd className="text-sm font-black text-[#f8fbff]">{latestReading.generator_voltage?.toFixed(1)} V</dd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <dt className="text-xs text-[#aeb9d5] font-bold">Active Source Source</dt>
              <dd className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wide ${
                isMainsActive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}>
                {activeSource}
              </dd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <dt className="text-xs text-[#aeb9d5] font-bold">Last Transfer Time</dt>
              <dd className="text-xs font-bold text-[#f8fbff]">
                {latestReading.last_transfer_at ? new Date(latestReading.last_transfer_at).toLocaleString() : 'N/A'}
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      {/* 3. Voltage cards + Temperature & Security Relays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReadingCard 
          label="Mains Voltage" 
          value={latestReading.mains_voltage?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
          alert={latestReading.mains_voltage < 207 || latestReading.mains_voltage > 253}
        />
        <ReadingCard 
          label="Generator Voltage" 
          value={latestReading.generator_voltage?.toFixed(1)} 
          unit="V" 
          icon={Zap} 
        />
        <ReadingCard 
          label="ATS Cabinet Temp" 
          value={latestReading.room_temperature_c?.toFixed(1)} 
          unit="°C" 
          icon={Thermometer} 
        />
      </div>

      {/* 4. Intruder, Fire alarms, and ATS Alarms Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard title="Active ATS Alarms" icon={Bell}>
            {alarmsLoading && <p className="text-xs text-[#aeb9d5] py-4">Polling alarms...</p>}
            {!alarmsLoading && (!alarms || alarms.length === 0) ? (
              <p className="text-xs text-[#aeb9d5] py-4 italic text-center">No active alarms for this ATS.</p>
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

        <SectionCard title="Relay Controls & Events" icon={ShieldAlert}>
          <div className="flex flex-col gap-3 justify-center h-full pb-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Fire Sensor</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.fire_alarm 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.fire_alarm ? 'FIRE WARNING' : 'SECURE'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Intruder Sensor</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.intruder_alarm 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.intruder_alarm ? 'INTRUDER DETECTED' : 'SECURE'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Breaker Switch</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.breaker_status || 'OPEN'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
