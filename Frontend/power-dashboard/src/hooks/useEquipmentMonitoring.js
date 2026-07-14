import { useCallback, useMemo } from 'react'
import { getEquipment, getEquipmentAlarms, getEquipmentStatus } from '../api/equipmentApi'
import usePolling from './usePolling'

/** Shared generic-equipment monitor used by every subsystem page. */
export default function useEquipmentMonitoring(equipmentType, selectedEquipmentId) {
  const loadEquipment = useCallback(
    () => getEquipment({ type: equipmentType, enabled: true }),
    [equipmentType],
  )
  const equipmentPolling = usePolling(loadEquipment, 30000)
  const equipment = useMemo(() => equipmentPolling.data ?? [], [equipmentPolling.data])

  const effectiveEquipmentId = selectedEquipmentId ?? equipment[0]?.id
  const selectedEquipment = useMemo(
    () => equipment.find((item) => String(item.id) === String(effectiveEquipmentId)) ?? null,
    [effectiveEquipmentId, equipment],
  )

  const fetchStatus = useCallback(
    () => (effectiveEquipmentId ? getEquipmentStatus(effectiveEquipmentId) : Promise.resolve(null)),
    [effectiveEquipmentId],
  )
  const fetchAlarms = useCallback(
    () => (effectiveEquipmentId
      ? getEquipmentAlarms(effectiveEquipmentId, { unresolved: true })
      : Promise.resolve([])),
    [effectiveEquipmentId],
  )
  const statusPolling = usePolling(fetchStatus, 5000)
  const alarmPolling = usePolling(fetchAlarms, 5000)

  const refresh = useCallback(async () => {
    await Promise.all([equipmentPolling.refresh(), statusPolling.refresh(), alarmPolling.refresh()])
  }, [alarmPolling, equipmentPolling, statusPolling])

  return {
    equipment,
    equipmentError: equipmentPolling.error,
    selectedEquipment,
    effectiveEquipmentId,
    status: statusPolling.data,
    alarms: alarmPolling.data ?? [],
    statusError: statusPolling.error,
    refresh,
  }
}
