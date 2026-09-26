import api from './axios'

export async function getEquipmentList(params = {}) {
  const { data } = await api.get('/api/equipment', { params })
  return data
}

export async function updateEquipment(id, updateData) {
  const { data } = await api.put(`/api/equipment/${id}`, updateData)
  return data
}

export async function setEquipmentEnabled(id, enabled) {
  const { data } = await api.patch(`/api/equipment/${id}/enabled`, { enabled })
  return data
}

export async function getThresholds(equipmentId) {
  const { data } = await api.get(`/api/equipment/${equipmentId}/thresholds`)
  return data
}

export async function updateThreshold(equipmentId, metricKey, value) {
  const { data } = await api.put(`/api/equipment/${equipmentId}/thresholds/${metricKey}`, { metricKey, value })
  return data
}

export async function deleteThreshold(equipmentId, metricKey) {
  const { data } = await api.delete(`/api/equipment/${equipmentId}/thresholds/${metricKey}`)
  return data
}
