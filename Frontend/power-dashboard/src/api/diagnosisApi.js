import api from './axios'

export async function getDiagnosisCatalog() {
  const { data } = await api.get('/api/diagnosis')
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function getEquipmentDiagnosis(equipmentId, params = {}) {
  const { data } = await api.get(`/api/equipment/${equipmentId}/diagnosis`, {
    params: { unresolved: params.unresolved ?? true },
  })
  return Array.isArray(data) ? data : (data.items ?? [])
}
