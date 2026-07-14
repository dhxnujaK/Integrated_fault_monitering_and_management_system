import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAlarms } from '../api/alarmsApi'
import { getEquipment, getEquipmentStatus } from '../api/equipmentApi'
import usePolling from './usePolling'

/** Shared generic-equipment monitor used by every subsystem page. */
export default function useEquipmentMonitoring(equipmentType, selectedEquipmentId) {
  const [equipment, setEquipment] = useState([])
  const [equipmentError, setEquipmentError] = useState(null)

  const loadEquipment = useCallback(async () => {
    try {
      const items = await getEquipment({ type: equipmentType, enabled: true })
      setEquipment(items)
      setEquipmentError(null)
      return items
    } catch (error) {
      setEquipmentError(error)
      throw error
    }
  }, [equipmentType])

  useEffect(() => {
    loadEquipment().catch(() => {})
  }, [loadEquipment])

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
      ? getAlarms({ equipmentId: effectiveEquipmentId, unresolved: true })
      : Promise.resolve([])),
    [effectiveEquipmentId],
  )
  const statusPolling = usePolling(fetchStatus, 5000)
  const alarmPolling = usePolling(fetchAlarms, 5000)

  const refresh = useCallback(async () => {
    await Promise.all([loadEquipment(), statusPolling.refresh(), alarmPolling.refresh()])
  }, [alarmPolling.refresh, loadEquipment, statusPolling.refresh])

  return {
    equipment,
    equipmentError,
    selectedEquipment,
    effectiveEquipmentId,
    status: statusPolling.data,
    alarms: alarmPolling.data ?? [],
    statusError: statusPolling.error,
    refresh,
  }
}
