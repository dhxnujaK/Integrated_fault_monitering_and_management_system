import { getAlarms } from '../api/alarmApi'
import { DataTable, PageHeader, Panel, RefreshButton, StateMessage, useAsyncData } from './pageUtils'

export default function AlarmsPage() {
  const { data, loading, error, reload } = useAsyncData(getAlarms)
  const rows = data || []

  return (
    <>
      <PageHeader title="Alarms" subtitle="Alarm API integration" action={<RefreshButton onClick={reload} disabled={loading} />} />
      {error ? <StateMessage title="Unable to load alarms" tone="danger">{error}</StateMessage> : null}
      {loading ? <StateMessage title="Loading alarms" /> : null}
      {!loading ? (
        <Panel title="Alarm list">
          <DataTable
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'message', label: 'Message' },
              { key: 'severity', label: 'Severity' },
              { key: 'status', label: 'Status' },
              { key: 'subsystem', label: 'Subsystem' },
              { key: 'triggeredTime', label: 'Triggered time' },
            ]}
            rows={rows}
            emptyTitle="No alarm endpoint available"
            emptyText="No Spring Boot controller currently exposes alarms, acknowledge, or resolve operations."
          />
        </Panel>
      ) : null}
    </>
  )
}
