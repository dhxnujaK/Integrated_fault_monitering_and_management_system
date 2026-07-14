import { useCallback, useEffect, useMemo } from 'react'
import { getEquipment, getEquipmentAlarms, getEquipmentReadings, getEquipmentStatus } from '../api/equipmentApi'
import usePolling from './usePolling'

const monitoringCache = new Map()

function cacheFor(equipmentType) {
  if (!monitoringCache.has(equipmentType)) {
    monitoringCache.set(equipmentType, {
      equipment: null,
      selectedEquipmentId: null,
      statusByEquipmentId: {},
      alarmsByEquipmentId: {},
      readingsByEquipmentId: {},
    })
  }
  return monitoringCache.get(equipmentType)
}

function cacheEquipment(equipmentType, equipment) {
  cacheFor(equipmentType).equipment = equipment
}

function cacheSelection(equipmentType, equipmentId) {
  cacheFor(equipmentType).selectedEquipmentId = equipmentId
}

function cacheStatus(equipmentType, status) {
  cacheFor(equipmentType).statusByEquipmentId[String(status.equipmentId)] = status
}

function cacheAlarms(equipmentType, equipmentId, alarms) {
  cacheFor(equipmentType).alarmsByEquipmentId[String(equipmentId)] = alarms
}

function cacheReadings(equipmentType, equipmentId, readings) {
  cacheFor(equipmentType).readingsByEquipmentId[String(equipmentId)] = readings
}

/** Shared generic-equipment monitor used by every subsystem page. */
export default function useEquipmentMonitoring(equipmentType, selectedEquipmentId) {
  const cache = cacheFor(equipmentType)
  const loadEquipment = useCallback(
    () => getEquipment({ type: equipmentType, enabled: true }),
    [equipmentType],
  )
  const equipmentPolling = usePolling(loadEquipment, 30000, {
    initialData: cache.equipment,
    resetKey: equipmentType,
  })
  const equipment = useMemo(() => equipmentPolling.data ?? [], [equipmentPolling.data])

  const effectiveEquipmentId = selectedEquipmentId ?? cache.selectedEquipmentId ?? equipment[0]?.id
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
  const fetchReadings = useCallback(
    () => (effectiveEquipmentId ? getEquipmentReadings(effectiveEquipmentId, 24) : Promise.resolve([])),
    [effectiveEquipmentId],
  )
  const statusPolling = usePolling(fetchStatus, 5000, {
    initialData: effectiveEquipmentId ? cache.statusByEquipmentId[String(effectiveEquipmentId)] ?? null : null,
    resetKey: effectiveEquipmentId,
  })
  const alarmPolling = usePolling(fetchAlarms, 5000, {
    initialData: effectiveEquipmentId ? cache.alarmsByEquipmentId[String(effectiveEquipmentId)] ?? null : null,
    resetKey: effectiveEquipmentId,
  })
  const readingsPolling = usePolling(fetchReadings, 5000, {
    initialData: effectiveEquipmentId ? cache.readingsByEquipmentId[String(effectiveEquipmentId)] ?? null : null,
    resetKey: effectiveEquipmentId,
  })

  useEffect(() => {
    if (equipmentPolling.data) cacheEquipment(equipmentType, equipmentPolling.data)
  }, [equipmentPolling.data, equipmentType])

  useEffect(() => {
    if (effectiveEquipmentId) cacheSelection(equipmentType, effectiveEquipmentId)
  }, [effectiveEquipmentId, equipmentType])

  useEffect(() => {
    const status = statusPolling.data
    if (status?.equipmentId) cacheStatus(equipmentType, status)
  }, [equipmentType, statusPolling.data])

  useEffect(() => {
    if (effectiveEquipmentId && alarmPolling.data) {
      cacheAlarms(equipmentType, effectiveEquipmentId, alarmPolling.data)
    }
  }, [alarmPolling.data, effectiveEquipmentId, equipmentType])

  useEffect(() => {
    if (effectiveEquipmentId && readingsPolling.data) {
      cacheReadings(equipmentType, effectiveEquipmentId, readingsPolling.data)
    }
  }, [effectiveEquipmentId, equipmentType, readingsPolling.data])

  const refresh = useCallback(async () => {
    await Promise.all([
      equipmentPolling.refresh(),
      statusPolling.refresh(),
      alarmPolling.refresh(),
      readingsPolling.refresh(),
    ])
  }, [alarmPolling, equipmentPolling, readingsPolling, statusPolling])

  return {
    equipment,
    equipmentError: equipmentPolling.error,
    selectedEquipment,
    effectiveEquipmentId,
    status: statusPolling.data,
    alarms: alarmPolling.data ?? [],
    readings: readingsPolling.data ?? [],
    statusError: statusPolling.error,
    refresh,
  }
}
