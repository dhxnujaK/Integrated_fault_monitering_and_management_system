import { useMemo, useState } from 'react'
import { getReportData } from '../api/reportApi'
import { PageHeader, Panel, StateMessage, RefreshButton, useAsyncData, subsystems } from './pageUtils'

export default function ReportsPage() {
  const { data, loading, error, reload } = useAsyncData(getReportData)
  const [filters, setFilters] = useState({
    subsystem: '',
    status: '',
    severity: '',
    from: '',
    to: '',
  })

  const totals = useMemo(() => ({
    alarms: data?.alarms?.length || 0,
    tickets: data?.tickets?.length || 0,
    predictions: data?.predictions?.length || 0,
    sensorReadings: data?.sensorReadings?.length || 0,
  }), [data])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Reports are assembled from available backend data because no report endpoint exists."
        action={<RefreshButton onClick={reload} disabled={loading} />}
      />
      {error ? <StateMessage title="Unable to load report data" tone="danger">{error}</StateMessage> : null}
      {loading ? <StateMessage title="Loading report data" /> : null}
      {!loading ? (
        <>
          <Panel title="Filters">
            <div className="filter-grid">
              <label>Subsystem<select value={filters.subsystem} onChange={(event) => updateFilter('subsystem', event.target.value)}><option value="">All</option>{subsystems.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>Status<input value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} placeholder="Any status" /></label>
              <label>Severity<input value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)} placeholder="Any severity" /></label>
              <label>From<input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label>
              <label>To<input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label>
            </div>
          </Panel>
          <section className="metric-grid">
            {Object.entries(totals).map(([key, value]) => (
              <Panel key={key} title={key}>
                <div className="metric-value"><strong>{value}</strong></div>
              </Panel>
            ))}
          </section>
          <Panel title="Report availability">
            <StateMessage title="No backend report data yet">
              Filters are ready, but no alarm, ticket, prediction, sensor, or report controllers exist to provide report rows.
            </StateMessage>
          </Panel>
        </>
      ) : null}
    </>
  )
}
