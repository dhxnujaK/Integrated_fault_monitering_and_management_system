import api from './axios'
import { getAlarms, monitoringUsesMockData } from './alarmsApi'

const mockEquipment = [
  { id: 1, equipmentCode: 'UPS-01', equipmentType: 'UPS', displayName: 'UPS 01', location: 'Server Room', enabled: true },
  { id: 2, equipmentCode: 'GENERATOR-01', equipmentType: 'GENERATOR', displayName: 'Main Standby Generator', location: 'Operations Building', enabled: true },
  { id: 3, equipmentCode: 'MDP-01', equipmentType: 'MDP', displayName: 'Main Distribution Panel', location: 'Operations Building', enabled: true },
  { id: 4, equipmentCode: 'UPS-02', equipmentType: 'UPS', displayName: 'UPS 02', location: 'Operations Office', enabled: true },
  { id: 5, equipmentCode: 'ATS-01', equipmentType: 'ATS', displayName: 'Automatic Transfer Switch', location: 'Operations Building', enabled: true },
  { id: 6, equipmentCode: 'SDP-01', equipmentType: 'SDP', displayName: 'Sub Distribution Panel 01', location: 'Operations Building', enabled: true },
  { id: 7, equipmentCode: 'SDP-02', equipmentType: 'SDP', displayName: 'Sub Distribution Panel 02', location: 'Operations Office', enabled: true },
]

const mockStatuses = {
  1: {
    equipmentId: 1,
    equipmentCode: 'UPS-01',
    equipmentType: 'UPS',
    displayName: 'UPS 01',
    overallStatus: 'WARNING',
    activeAlarmCount: 1,
    acknowledgedAlarmCount: 0,
    recordedAt: '2026-07-13T10:15:00Z',
    latestReading: {
      operational_status: 'ON_BATTERY', battery_charge_pct: 35, battery_voltage_v: 48.5,
      input_voltage_v: 0, output_voltage_v: 230, load_pct: 62, estimated_runtime_min: 42,
    },
  },
  4: {
    equipmentId: 4,
    equipmentCode: 'UPS-02',
    equipmentType: 'UPS',
    displayName: 'UPS 02',
    overallStatus: 'NORMAL',
    activeAlarmCount: 0,
    acknowledgedAlarmCount: 0,
    recordedAt: '2026-07-13T10:15:00Z',
    latestReading: {
      operational_status: 'ONLINE', battery_charge_pct: 83, battery_voltage_v: 52.1,
      input_voltage_v: 231, output_voltage_v: 230, load_pct: 41, estimated_runtime_min: 108,
    },
  },
  2: {
    equipmentId: 2, equipmentCode: 'GENERATOR-01', equipmentType: 'GENERATOR', displayName: 'Main Standby Generator',
    overallStatus: 'NORMAL', activeAlarmCount: 0, acknowledgedAlarmCount: 0, recordedAt: '2026-07-13T10:15:00Z',
    latestReading: { voltage_L1: 230.5, voltage_L2: 229.8, voltage_L3: 231.2, current_L1: 45.2, current_L2: 44.8, current_L3: 45.5, fuel_level_pct: 75, frequency_hz: 50.1, running_status: 'RUNNING', breaker_status: 'CLOSED', room_temperature_c: 28.5, intruder_alarm: false, fire_alarm: false },
  },
  3: {
    equipmentId: 3, equipmentCode: 'MDP-01', equipmentType: 'MDP', displayName: 'Main Distribution Panel',
    overallStatus: 'WARNING', activeAlarmCount: 1, acknowledgedAlarmCount: 0, recordedAt: '2026-07-13T10:15:00Z',
    latestReading: { voltage_R: 230.1, voltage_Y: 229.5, voltage_B: 230.8, current_R: 80.2, current_Y: 79.8, current_B: 80.5, main_breaker_status: 'CLOSED', room_temperature_c: 27, intruder_alarm: false, fire_alarm: false },
  },
  5: {
    equipmentId: 5, equipmentCode: 'ATS-01', equipmentType: 'ATS', displayName: 'Automatic Transfer Switch',
    overallStatus: 'NORMAL', activeAlarmCount: 0, acknowledgedAlarmCount: 0, recordedAt: '2026-07-13T10:15:00Z',
    latestReading: { active_source: 'MAINS', mains_voltage: 230.2, generator_voltage: 229.8, transfer_status: 'NORMAL', breaker_status: 'CLOSED', last_transfer_at: '2026-07-13T09:50:00Z', room_temperature_c: 26, intruder_alarm: false, fire_alarm: false },
  },
  6: {
    equipmentId: 6, equipmentCode: 'SDP-01', equipmentType: 'SDP', displayName: 'Sub Distribution Panel 01',
    overallStatus: 'NORMAL', activeAlarmCount: 0, acknowledgedAlarmCount: 0, recordedAt: '2026-07-13T10:15:00Z',
    latestReading: { voltage_R: 228.5, voltage_Y: 229, voltage_B: 228.8, current_R: 30.2, current_Y: 29.8, current_B: 30.1, breaker_status: 'CLOSED', room_temperature_c: 25.5, intruder_alarm: false, fire_alarm: false },
  },
  7: {
    equipmentId: 7, equipmentCode: 'SDP-02', equipmentType: 'SDP', displayName: 'Sub Distribution Panel 02',
    overallStatus: 'NORMAL', activeAlarmCount: 0, acknowledgedAlarmCount: 0, recordedAt: '2026-07-13T10:15:00Z',
    latestReading: { voltage_R: 229.4, voltage_Y: 228.9, voltage_B: 229.2, current_R: 28.2, current_Y: 29.1, current_B: 29.6, breaker_status: 'CLOSED', room_temperature_c: 25.2, intruder_alarm: false, fire_alarm: false },
  },
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export async function getEquipment(params = {}) {
  if (monitoringUsesMockData) {
    return mockEquipment.filter((item) => !params.type || item.equipmentType === params.type).map(clone)
  }

  const { data } = await api.get('/api/equipment', { params })
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function getEquipmentStatus(equipmentId) {
  if (monitoringUsesMockData) {
    const status = mockStatuses[equipmentId]
    if (!status) throw new Error('Equipment status not found')
    return clone(status)
  }

  const { data } = await api.get(`/api/equipment/${equipmentId}/status`)
  return data
}

export async function getEquipmentReadings(equipmentId, limit = 50) {
  if (monitoringUsesMockData) return []
  const { data } = await api.get(`/api/equipment/${equipmentId}/readings`, { params: { limit } })
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function getEquipmentAlarms(equipmentId, params = { unresolved: true }) {
  if (monitoringUsesMockData) {
    return getAlarms({ ...params, equipmentId })
  }

  const { data } = await api.get(`/api/equipment/${equipmentId}/alarms`, { params })
  return Array.isArray(data) ? data : (data.items ?? [])
}
