import api from './axios'

export async function loginRequest(username, password) {
  const { data } = await api.post('/api/auth/login', { username, password })
  return data
}

export async function logoutRequest() {
  return api.post('/api/auth/logout')
}

export async function getCurrentUser() {
  const { data } = await api.get('/api/auth/me')
  return data
}
