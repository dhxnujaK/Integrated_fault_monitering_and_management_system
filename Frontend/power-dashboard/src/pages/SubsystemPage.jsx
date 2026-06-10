import { useCallback } from 'react'
import { Bell, Gauge, TrendingUp } from 'lucide-react'
import { getAlarms } from '../api/alarmApi'
import { getPredictions } from '../api/predictionApi'
import { getSensorReadingsBySubsystem } from '../api/sensorApi'
import { DataTable, PageHeader, Panel, RefreshButton, StateMessage, useAsyncData } from './pageUtils'

export default function SubsystemPage({ subsystem, title }) {
  const load = useCallback(async () => {
    const [sensorReadings, alarms, predictions] = await Promise.all([
      getSensorReadingsBySubsystem(subsystem),
      getAlarms(),
      getPredictions(),
    ])

    return {
      sensorReadings,
      alarms: alarms.filter((alarm) => String(alarm.subsystem || '').toUpperCase() === subsystem),
      predictions: predictions.filter((prediction) => String(prediction.subsystem || '').toUpperCase() === subsystem),
    }
  }, [subsystem])

  const { data, loading, error, reload } = useAsyncData(load)
  const pageData = data || { sensorReadings: [], alarms: [], predictions: [] }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`Live ${subsystem} data from backend APIs when available.`}
        action={<RefreshButton onClick={reload} disabled={loading} />}
      />

      {error ? <StateMessage title={`Unable to load ${title}`} tone="danger">{error}</StateMessage> : null}
      {loading ? <StateMessage title="Loading subsystem data" /> : null}

      {!loading ? (
        <div className="page-grid">
          <Panel title="Latest sensor data">
            <Gauge size={22} />
            <DataTable
              columns={[
                { key: 'parameter', label: 'Parameter' },
                { key: 'value', label: 'Value' },
                { key: 'unit', label: 'Unit' },
                { key: 'timestamp', label: 'Timestamp' },
              ]}
              rows={pageData.sensorReadings}
              emptyTitle="No sensor readings"
              emptyText="No sensor reading endpoint exists in the backend controllers."
            />
          </Panel>
          <Panel title="Related alarms">
            <Bell size={22} />
            <DataTable
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'message', label: 'Message' },
                { key: 'severity', label: 'Severity' },
                { key: 'status', label: 'Status' },
              ]}
              rows={pageData.alarms}
              emptyTitle="No related alarms"
              emptyText="No alarm endpoint exists in the backend controllers."
            />
          </Panel>
          <Panel title="Related predictions" className="span-two">
            <TrendingUp size={22} />
            <DataTable
              columns={[
                { key: 'predictedFailureType', label: 'Failure type' },
                { key: 'failureProbability', label: 'Probability' },
                { key: 'confidence', label: 'Confidence' },
                { key: 'predictedTime', label: 'Predicted time' },
              ]}
              rows={pageData.predictions}
              emptyTitle="No related predictions"
              emptyText="No prediction endpoint exists in the backend controllers."
            />
          </Panel>
        </div>
      ) : null}
    </>
  )
}
