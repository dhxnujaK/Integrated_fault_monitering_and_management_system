import api from './axios'

export async function getProfile() {
  const { data } = await api.get('/api/profile')
  return data
}

export async function updateProfile(profile) {
  const { data } = await api.put('/api/profile', profile)
  return data
}

export async function changePassword(currentPassword, newPassword) {
  await api.put('/api/profile/password', { currentPassword, newPassword })
}
