import { getAlarms } from './alarmApi'
import { getPredictions } from './predictionApi'
import { getSensorReadings } from './sensorApi'
import { getTickets } from './ticketApi'

export const dashboardEndpoints = {
  summary: null,
}

export async function getDashboardSummary() {
  const [alarms, predictions, tickets, sensorReadings] = await Promise.all([
    getAlarms(),
    getPredictions(),
    getTickets(),
    getSensorReadings(),
  ])

  return {
    alarms,
    predictions,
    tickets,
    sensorReadings,
    source: 'computed',
  }
}
