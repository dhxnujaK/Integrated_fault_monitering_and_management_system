import api from './axios'
import { monitoringUsesMockData } from './alarmsApi'

const mockEquipment = [
  { id: 1, equipmentCode: 'UPS-01', equipmentType: 'UPS', displayName: 'UPS 01', location: 'Server Room', enabled: true },
  { id: 4, equipmentCode: 'UPS-02', equipmentType: 'UPS', displayName: 'UPS 02', location: 'Operations Office', enabled: true },
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
