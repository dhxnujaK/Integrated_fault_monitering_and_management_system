import api from './axios'

export async function downloadAlarmsReport({ format = 'CSV', from, to, equipmentId, equipmentType }) {
  const response = await api.get('/api/reports/alarms', {
    params: { format, from, to, equipmentId, equipmentType },
    responseType: 'blob',
  })
  return response
}

export async function downloadTicketsReport({ format = 'CSV', from, to, equipmentId, equipmentType }) {
  const response = await api.get('/api/reports/tickets', {
    params: { format, from, to, equipmentId, equipmentType },
    responseType: 'blob',
  })
  return response
}
