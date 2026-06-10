import { getTickets, ticketEndpoints } from '../api/ticketApi'
import { DataTable, PageHeader, Panel, RefreshButton, StateMessage, useAsyncData } from './pageUtils'

export default function TicketsPage() {
  const { data, loading, error, reload } = useAsyncData(getTickets)
  const rows = data || []

  return (
    <>
      <PageHeader title="Tickets" subtitle="Maintenance ticket API integration" action={<RefreshButton onClick={reload} disabled={loading} />} />
      {error ? <StateMessage title="Unable to load tickets" tone="danger">{error}</StateMessage> : null}
      {loading ? <StateMessage title="Loading tickets" /> : null}
      {!loading ? (
        <Panel title="Ticket list">
          {ticketEndpoints.create ? <button type="button">Create ticket</button> : null}
          <DataTable
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'description', label: 'Description' },
              { key: 'subsystem', label: 'Subsystem' },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status' },
              { key: 'createdDate', label: 'Created date' },
            ]}
            rows={rows}
            emptyTitle="No ticket endpoint available"
            emptyText="No Spring Boot controller currently exposes maintenance ticket list, create, or status update operations."
          />
        </Panel>
      ) : null}
    </>
  )
}
