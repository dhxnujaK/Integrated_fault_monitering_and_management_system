import api from './axios'

export async function getTickets(params = {}) {
  const { data } = await api.get('/api/tickets', {
    params: {
      status: params.status || undefined,
      equipmentType: params.equipmentType || undefined,
      equipmentId: params.equipmentId || undefined,
      page: params.page ?? 0,
      size: params.size ?? 50,
    },
  })
  return data
}

export async function getTicketById(id) {
  const { data } = await api.get(`/api/tickets/${id}`)
  return data
}

export async function createTicket(ticketData) {
  const { data } = await api.post('/api/tickets', ticketData)
  return data
}

export async function updateTicket(id, updateData) {
  const { data } = await api.put(`/api/tickets/${id}`, updateData)
  return data
}
