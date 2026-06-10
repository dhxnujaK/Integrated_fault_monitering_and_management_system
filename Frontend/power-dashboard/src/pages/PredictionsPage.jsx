import { getPredictions, predictionEndpoints } from '../api/predictionApi'
import { DataTable, PageHeader, Panel, RefreshButton, StateMessage, useAsyncData } from './pageUtils'

export default function PredictionsPage() {
  const { data, loading, error, reload } = useAsyncData(getPredictions)
  const rows = data || []

  return (
    <>
      <PageHeader title="Predictions" subtitle="ML prediction API integration" action={<RefreshButton onClick={reload} disabled={loading} />} />
      {error ? <StateMessage title="Unable to load predictions" tone="danger">{error}</StateMessage> : null}
      {loading ? <StateMessage title="Loading predictions" /> : null}
      {!loading ? (
        <Panel title="Prediction list">
          {predictionEndpoints.create ? <button type="button">Run prediction</button> : null}
          <DataTable
            columns={[
              { key: 'subsystem', label: 'Subsystem' },
              { key: 'failureProbability', label: 'Failure probability' },
              { key: 'predictedFailureType', label: 'Predicted failure type' },
              { key: 'confidence', label: 'Confidence' },
              { key: 'recommendedActions', label: 'Recommended actions' },
              { key: 'predictedTime', label: 'Predicted time' },
            ]}
            rows={rows}
            emptyTitle="No prediction endpoint available"
            emptyText="No Spring Boot controller currently exposes predictions or prediction execution."
          />
        </Panel>
      ) : null}
    </>
  )
}
