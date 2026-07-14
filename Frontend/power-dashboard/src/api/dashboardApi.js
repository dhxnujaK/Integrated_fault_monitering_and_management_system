import api from './axios'
import { monitoringUsesMockData } from './alarmsApi'
import { getEquipment, getEquipmentStatus } from './equipmentApi'

export async function getDashboardSummary() {
  if (monitoringUsesMockData) {
    const equipment = await getEquipment()
    const upsStatuses = await Promise.all(equipment.filter((item) => item.equipmentType === 'UPS').map(getEquipmentStatus))
    return {
      equipment: upsStatuses.map((status) => ({
        equipmentId: status.equipmentId,
        equipmentCode: status.equipmentCode,
        equipmentType: status.equipmentType,
        displayName: status.displayName,
        overallStatus: status.overallStatus,
        recordedAt: status.recordedAt,
        unresolvedAlarmCount: status.activeAlarmCount + status.acknowledgedAlarmCount,
      })),
      alarmTotals: { active: 2, acknowledged: 0, criticalUnresolved: 1, warningUnresolved: 1 },
    }
  }

  const { data } = await api.get('/api/dashboard/summary')
  return data
}
