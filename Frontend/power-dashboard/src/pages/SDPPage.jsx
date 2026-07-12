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
  Gauge,
  Bell,
  Thermometer,
  ShieldAlert,
  Sliders
} from 'lucide-react'

// Horizontal Bar Chart for 3-Phase Voltages (R/Y/B)
function VoltageBarChart({ vr, vy, vb }) {
  const maxVoltage = 300 // scale max to 300V
  const nominal = 230
  
  const getPercentage = (value) => {
    return Math.min(Math.max((value / maxVoltage) * 100, 0), 100)
  }

  const isVoltageAbnormal = (v) => v < 207 || v > 253

  return (
    <SectionCard title="Phase Voltages & Phase Balance" icon={Sliders}>
      <div className="flex flex-col gap-5 py-4 relative">
        {/* Nominal 230V Dotted Line */}
        <div 
          className="absolute top-0 bottom-0 border-r-2 border-dashed border-[#66d7e6]/30 pointer-events-none flex flex-col justify-end"
          style={{ left: `${(nominal / maxVoltage) * 100}%` }}
        >
          <span className="text-[10px] text-[#66d7e6] font-extrabold translate-x-[-50%] bg-[#0b1223] px-1 border border-[#344364] rounded mb-1">
            230V Nominal
          </span>
        </div>

        {/* Phase R */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-red-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Phase R
            </span>
            <span className={`font-black ${isVoltageAbnormal(vr) ? 'text-red-400' : 'text-[#f8fbff]'}`}>
              {vr?.toFixed(1)} V
            </span>
          </div>
          <div className="w-full h-3 bg-[#101a33] rounded-full overflow-hidden border border-[#344364]">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isVoltageAbnormal(vr) ? 'bg-red-500' : 'bg-red-500/80'}`}
              style={{ width: `${getPercentage(vr)}%` }}
            />
          </div>
        </div>

        {/* Phase Y */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Phase Y
            </span>
            <span className={`font-black ${isVoltageAbnormal(vy) ? 'text-red-400' : 'text-[#f8fbff]'}`}>
              {vy?.toFixed(1)} V
            </span>
          </div>
          <div className="w-full h-3 bg-[#101a33] rounded-full overflow-hidden border border-[#344364]">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isVoltageAbnormal(vy) ? 'bg-red-500' : 'bg-amber-400/80'}`}
              style={{ width: `${getPercentage(vy)}%` }}
            />
          </div>
        </div>

        {/* Phase B */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#66d7e6] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Phase B
            </span>
            <span className={`font-black ${isVoltageAbnormal(vb) ? 'text-red-400' : 'text-[#f8fbff]'}`}>
              {vb?.toFixed(1)} V
            </span>
          </div>
          <div className="w-full h-3 bg-[#101a33] rounded-full overflow-hidden border border-[#344364]">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isVoltageAbnormal(vb) ? 'bg-red-500' : 'bg-blue-500/80'}`}
              style={{ width: `${getPercentage(vb)}%` }}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default function SDPPage() {
  const [sdpIds, setSdpIds] = useState(['SDP-01', 'SDP-02'])
  const [selectedSdp, setSelectedSdp] = useState('SDP-01')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 1. Fetch SDP IDs list once on mount
  useEffect(() => {
    let active = true
    api.get('/api/sdp')
      .then(res => {
        if (active && Array.isArray(res.data) && res.data.length > 0) {
          setSdpIds(res.data)
          setSelectedSdp(res.data[0])
        }
      })
      .catch(err => {
        // Fall back to default IDs on failure
        console.warn('Could not fetch SDP IDs list from API, using default IDs list', err)
      })
    return () => {
      active = false
    }
  }, [])

  // 2. Fetch SDP Status
  const fetchStatus = useCallback(() => {
    return api.get(`/api/sdp/${selectedSdp}/status`).then(res => res.data)
  }, [selectedSdp])
  const { data: status, loading: statusLoading, error: statusError } = usePolling(fetchStatus, 5000)

  // 3. Fetch active SDP alarms
  const fetchAlarms = useCallback(() => {
    return api.get(`/api/sdp/${selectedSdp}/alarms`).then(res => res.data)
  }, [selectedSdp])
  const { data: alarms, loading: alarmsLoading, error: alarmsError } = usePolling(fetchAlarms, 5000)

  // Acknowledge alarm handler
  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/api/alarms/${id}/acknowledge`, { note: `Acknowledged via SDP ${selectedSdp} dashboard` })
      toast.success('Alarm acknowledged')
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alarm')
    }
  }

  const isOffline = statusError || alarmsError

  const latestReading = status?.latestReading || {
    voltage_R: 228.0,
    voltage_Y: 228.0,
    voltage_B: 228.0,
    current_R: 0.0,
    current_Y: 0.0,
    current_B: 0.0,
    breaker_status: 'OPEN',
    room_temperature_c: 25.0,
    intruder_alarm: false,
    fire_alarm: false
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Selectors for SDP Panels */}
      <div className="flex border-b border-[#344364] gap-2">
        {sdpIds.map((id) => (
          <button
            key={id}
            onClick={() => setSelectedSdp(id)}
            className={`px-6 py-2.5 text-sm font-black uppercase tracking-wider rounded-t-lg transition-all border-t border-l border-r ${
              selectedSdp === id
                ? 'bg-[#172341] border-[#344364] text-[#66d7e6]'
                : 'bg-transparent border-transparent text-[#aeb9d5] hover:text-[#f8fbff]'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {/* 1. Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#344364] bg-[#172341]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
          <h2 className="text-sm text-[#aeb9d5] font-black uppercase tracking-wider">
            {selectedSdp} Status Monitor
          </h2>
          {isOffline && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              Backend Offline (Using Cached/Default Data)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#101a33] px-3 py-1.5 rounded-lg border border-[#344364]">
            <span className="text-xs text-[#aeb9d5] font-bold">Breaker Status:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-black tracking-wide ${
              latestReading.breaker_status === 'CLOSED' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {latestReading.breaker_status || 'UNKNOWN'}
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

      {/* 2. Visual Bar Chart of Voltage Phase and Relays */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <VoltageBarChart 
          vr={latestReading.voltage_R} 
          vy={latestReading.voltage_Y} 
          vb={latestReading.voltage_B} 
        />
        
        <SectionCard title="Relays & Downstream Protections" icon={ShieldAlert}>
          <div className="flex flex-col gap-3 justify-center h-full pb-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Sub breaker Relay</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.breaker_status === 'CLOSED'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {latestReading.breaker_status === 'CLOSED' ? 'ARMED' : 'TRIPPED'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Surge Protection Device</span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide bg-green-500/20 text-green-400 border border-green-500/30">
                SPD ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Earth Leakage Switch</span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide bg-green-500/20 text-green-400 border border-green-500/30">
                NORMAL
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 3. Three-Phase Currents & Temp row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReadingCard 
          label="Current Phase R" 
          value={latestReading.current_R?.toFixed(1)} 
          unit="A" 
          icon={Gauge} 
        />
        <ReadingCard 
          label="Current Phase Y" 
          value={latestReading.current_Y?.toFixed(1)} 
          unit="A" 
          icon={Gauge} 
        />
        <ReadingCard 
          label="Current Phase B" 
          value={latestReading.current_B?.toFixed(1)} 
          unit="A" 
          icon={Gauge} 
        />
        <ReadingCard 
          label="Cabinet temperature" 
          value={latestReading.room_temperature_c?.toFixed(1)} 
          unit="°C" 
          icon={Thermometer} 
          alert={latestReading.room_temperature_c > 45}
        />
      </div>

      {/* 4. Active Alarms & Environmental Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard title={`Active Alarms - ${selectedSdp}`} icon={Bell}>
            {alarmsLoading && <p className="text-xs text-[#aeb9d5] py-4">Polling alarms...</p>}
            {!alarmsLoading && (!alarms || alarms.length === 0) ? (
              <p className="text-xs text-[#aeb9d5] py-4 italic text-center">No active alarms for this SDP.</p>
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

        <SectionCard title="Cabinet Security Indicators" icon={ShieldAlert}>
          <div className="flex flex-col gap-3 justify-center h-full pb-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Fire Sensor</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.fire_alarm 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.fire_alarm ? 'ALARM ACTIVE' : 'SECURE'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#101a33] border border-[#344364]">
              <span className="text-xs text-[#aeb9d5] font-bold">Intruder Alert</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide ${
                latestReading.intruder_alarm 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {latestReading.intruder_alarm ? 'INTRUSION WARNING' : 'SECURE'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
