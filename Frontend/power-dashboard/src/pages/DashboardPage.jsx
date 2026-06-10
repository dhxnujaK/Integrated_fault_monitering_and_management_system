import { AlertTriangle, BarChart3, Gauge, TicketCheck } from 'lucide-react'
import { getDashboardSummary } from '../api/dashboardApi'
import { PageHeader, Panel, RefreshButton, StateMessage, useAsyncData } from './pageUtils'

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsyncData(getDashboardSummary)
  const summary = data || { alarms: [], predictions: [], tickets: [], sensorReadings: [] }
  const cards = [
    { label: 'Sensor readings', value: summary.sensorReadings.length, icon: Gauge },
    { label: 'Alarms', value: summary.alarms.length, icon: AlertTriangle },
    { label: 'Predictions', value: summary.predictions.length, icon: BarChart3 },
    { label: 'Tickets', value: summary.tickets.length, icon: TicketCheck },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Summary is computed from available backend APIs because no dashboard endpoint exists."
        action={<RefreshButton onClick={reload} disabled={loading} />}
      />

      {error ? <StateMessage title="Unable to load dashboard" tone="danger">{error}</StateMessage> : null}
      {loading ? <StateMessage title="Loading dashboard data" /> : null}

      {!loading ? (
        <>
          <section className="metric-grid">
            {cards.map((card) => (
              <Panel key={card.label} title={card.label}>
                <div className="metric-value">
                  <card.icon size={24} />
                  <strong>{card.value}</strong>
                </div>
              </Panel>
            ))}
          </section>

          <Panel title="Backend integration status">
            <StateMessage title="Operational data endpoints are not available yet">
              The frontend is authenticated against the real backend. Sensor, alarm, prediction, ticket, and report pages will populate when matching Spring controllers are added.
            </StateMessage>
          </Panel>
        </>
      ) : null}
    </>
  )
}
