import api from './axios'

export async function getUsers() {
  const { data } = await api.get('/api/users', { params: { page: 0, size: 100 } })
  return data.items ?? []
}

export async function createUser(user) {
  const { data } = await api.post('/api/users', user)
  return data
}

export async function setUserEnabled(id, enabled) {
  const { data } = await api.patch(`/api/users/${id}/enabled`, { enabled })
  return data
}

export async function setUserRole(id, role) {
  const { data } = await api.patch(`/api/users/${id}/role`, { role })
  return data
}

export async function resetUserPassword(id, newPassword) {
  await api.put(`/api/users/${id}/password`, { newPassword })
}
