import { getAlarms } from './alarmApi'
import { getPredictions } from './predictionApi'
import { getSensorReadings } from './sensorApi'
import { getTickets } from './ticketApi'

export const reportEndpoints = {
  list: null,
}

export async function getReportData() {
  const [alarms, tickets, predictions, sensorReadings] = await Promise.all([
    getAlarms(),
    getTickets(),
    getPredictions(),
    getSensorReadings(),
  ])

  return { alarms, tickets, predictions, sensorReadings }
}
