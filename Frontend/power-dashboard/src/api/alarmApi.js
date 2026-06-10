export const alarmEndpoints = {
  list: null,
  acknowledge: null,
  resolve: null,
}

export async function getAlarms() {
  return []
}

export async function acknowledgeAlarm() {
  throw new Error('Alarm acknowledge endpoint is not available in the backend.')
}

export async function resolveAlarm() {
  throw new Error('Alarm resolve endpoint is not available in the backend.')
}
