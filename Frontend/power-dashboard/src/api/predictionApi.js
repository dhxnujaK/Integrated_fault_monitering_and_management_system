import api from './axios'

export async function getLatestPredictions() {
  const { data } = await api.get('/api/predictions/latest')
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function getEquipmentPredictions(equipmentId, params = {}) {
  const { data } = await api.get(`/api/equipment/${equipmentId}/predictions`, {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}
