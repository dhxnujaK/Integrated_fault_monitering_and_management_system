import api from './axios'

const useMockMonitoring = import.meta.env.VITE_USE_MOCK_MONITORING === 'true'

let mockAlarms = [
  {
    id: 'mock-ups-low-battery',
    equipmentId: 1,
    equipmentCode: 'UPS-01',
    equipmentType: 'UPS',
    alarmCode: 'UPS_BATTERY_LOW',
    alarmMessage: 'UPS battery charge is below the warning threshold.',
    severity: 'WARNING',
    status: 'ACTIVE',
    triggeredAt: '2026-07-13T10:15:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
  },
  {
    id: 'mock-generator-fault',
    equipmentId: 2,
    equipmentCode: 'GENERATOR-01',
    equipmentType: 'GENERATOR',
    alarmCode: 'GEN_FAULT',
    alarmMessage: 'Generator is reporting a fault condition.',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    triggeredAt: '2026-07-13T09:20:00Z',
    acknowledgedAt: null,
    resolvedAt: null,
  },
  {
    id: 'mock-mdp-resolved',
    equipmentId: 3,
    equipmentCode: 'MDP-01',
    equipmentType: 'MDP',
    alarmCode: 'MDP_PHASE_IMBALANCE',
    alarmMessage: 'MDP phase voltage imbalance returned to normal.',
    severity: 'WARNING',
    status: 'RESOLVED',
    triggeredAt: '2026-07-13T08:10:00Z',
    acknowledgedAt: '2026-07-13T08:15:00Z',
    resolvedAt: '2026-07-13T08:22:00Z',
  },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function matchesFilters(alarm, params) {
  if (params.status && alarm.status !== params.status) return false
  if (params.unresolved === true && !['ACTIVE', 'ACKNOWLEDGED'].includes(alarm.status)) return false
  if (params.equipmentType && alarm.equipmentType !== params.equipmentType) return false
  if (params.equipmentId && String(alarm.equipmentId) !== String(params.equipmentId)) return false
  return true
}

export async function getAlarms(params = {}) {
  if (useMockMonitoring) {
    return mockAlarms.filter((alarm) => matchesFilters(alarm, params)).map(clone)
  }

  const { data } = await api.get('/api/alarms', { params: { ...params, size: params.size ?? 100 } })
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function acknowledgeAlarm(alarmId, note = '') {
  if (useMockMonitoring) {
    const index = mockAlarms.findIndex((alarm) => String(alarm.id) === String(alarmId))
    if (index < 0) throw new Error('Alarm not found')
    mockAlarms[index] = {
      ...mockAlarms[index],
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date().toISOString(),
      acknowledgementNote: note,
    }
    return clone(mockAlarms[index])
  }

  const { data } = await api.put(`/api/alarms/${alarmId}/acknowledge`, { note })
  return data
}

export const monitoringUsesMockData = useMockMonitoring
