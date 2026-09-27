import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SectionCard from '../components/SectionCard'
import { createTicket, getTickets, updateTicket } from '../api/ticketsApi'
import { downloadAlarmsReport, downloadTicketsReport } from '../api/reportsApi'
import { getEquipmentList, getThresholds, setEquipmentEnabled, updateThreshold } from '../api/settingsApi'
import { CheckCircle2, Clock, Download, FileSpreadsheet, Plus, RefreshCw, Settings2, Ticket, AlertTriangle } from 'lucide-react'

export default function OperationsPage() {
  const location = useLocation()
  const initialTab = location.state?.tab || 'tickets'
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="operations-page">
      <nav className="operations-nav-tabs" aria-label="Operations workspace sections">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <Ticket size={16} />
          Maintenance Tickets
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileSpreadsheet size={16} />
          Reports & Export
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          <Settings2 size={16} />
          Equipment & Thresholds
        </button>
      </nav>

      <div className="operations-tab-content">
        {activeTab === 'tickets' ? <TicketsTab locationState={location.state} /> : null}
        {activeTab === 'reports' ? <ReportsTab /> : null}
        {activeTab === 'equipment' ? <EquipmentTab /> : null}
      </div>
    </div>
  )
}

function TicketsTab({ locationState }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(Boolean(locationState?.createModal || locationState?.alarmId))
  const [creating, setCreating] = useState(false)

  // Form State
  const [equipmentId, setEquipmentId] = useState(locationState?.equipmentId || '1')
  const [alarmId, setAlarmId] = useState(locationState?.alarmId || '')
  const [title, setTitle] = useState(locationState?.title || '')
  const [description, setDescription] = useState(locationState?.description || '')
  const [priority, setPriority] = useState('HIGH')
  const [assignedTo, setAssignedTo] = useState('Dispatch Tech')

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const data = await getTickets({ status: statusFilter || undefined })
      setTickets(data.items ?? [])
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  async function handleCreateTicket(e) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    try {
      setCreating(true)
      await createTicket({
        equipmentId: Number(equipmentId),
        alarmId: alarmId ? Number(alarmId) : null,
        title,
        description,
        priority,
        assignedTo,
      })
      setShowCreateModal(false)
      setTitle('')
      setDescription('')
      await fetchTickets()
    } catch (err) {
      alert(err.message || 'Failed to create ticket')
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(ticketId, nextStatus) {
    try {
      await updateTicket(ticketId, { status: nextStatus })
      await fetchTickets()
    } catch (err) {
      alert(err.message || 'Failed to update ticket status')
    }
  }

  return (
    <div className="tickets-section">
      <SectionCard title="Maintenance Work Orders">
        <div className="operations-toolbar">
          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button type="button" className="icon-btn" onClick={fetchTickets} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
          <button type="button" className="primary-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Create Ticket
          </button>
        </div>

        {loading ? <p className="empty-state">Loading tickets...</p> : null}
        {error ? <p className="empty-state error-text">{error}</p> : null}
        {!loading && !error && tickets.length === 0 ? (
          <p className="empty-state">No maintenance tickets found.</p>
        ) : null}

        {tickets.length > 0 ? (
          <div className="tickets-table-wrapper">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title & Equipment</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td><strong>#{t.id}</strong></td>
                    <td>
                      <div className="ticket-title-cell">
                        <strong>{t.title}</strong>
                        <span>{t.equipmentCode ?? 'General'} ({t.equipmentType})</span>
                        <p className="ticket-desc">{t.description}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge ${String(t.priority).toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>{t.assignedTo || '--'}</td>
                    <td>
                      <span className={`status-badge ${String(t.status).toLowerCase()}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : '--'}</td>
                    <td>
                      <select
                        className="status-select"
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>

      {showCreateModal ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Create Maintenance Ticket</h3>
            <form onSubmit={handleCreateTicket}>
              <label>
                <span>Equipment ID</span>
                <input type="number" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} required />
              </label>
              <label>
                <span>Linked Alarm ID (Optional)</span>
                <input type="number" value={alarmId} onChange={(e) => setAlarmId(e.target.value)} placeholder="e.g. 10" />
              </label>
              <label>
                <span>Ticket Title</span>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Inspect day tank fuel level" required />
              </label>
              <label>
                <span>Description</span>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detail the issue and instructions..." required />
              </label>
              <div className="form-row">
                <label>
                  <span>Priority</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>
                <label>
                  <span>Assigned To</span>
                  <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" disabled={creating} className="primary-btn">
                  {creating ? 'Saving...' : 'Create Ticket'}
                </button>
                <button type="button" className="ghost-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReportsTab() {
  const [reportType, setReportType] = useState('alarms')
  const [format, setFormat] = useState('CSV')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 16)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16))
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleDownload(e) {
    e.preventDefault()
    if (format === 'PDF') {
      setMessage('PDF reports are not yet implemented. Please select CSV format.')
      return
    }
    try {
      setDownloading(true)
      setMessage('')
      const params = {
        format: 'CSV',
        from: new Date(from).toISOString().slice(0, 19),
        to: new Date(to).toISOString().slice(0, 19),
      }

      const response = reportType === 'alarms' ? await downloadAlarmsReport(params) : await downloadTicketsReport(params)
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${reportType}-report.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setMessage(`Successfully downloaded ${reportType}-report.csv`)
    } catch (err) {
      setMessage(err.message || 'Report download failed.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="reports-section">
      <SectionCard title="Export & Historical Analytics Reports">
        <form className="reports-form" onSubmit={handleDownload}>
          <div className="form-grid">
            <label>
              <span>Report Type</span>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="alarms">Alarms & Incidents Log</option>
                <option value="tickets">Maintenance Work Orders Report</option>
              </select>
            </label>
            <label>
              <span>Format</span>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="CSV">CSV (Comma Separated Values)</option>
                <option value="PDF">PDF (Pre-cut / Coming soon)</option>
              </select>
            </label>
            <label>
              <span>From Date/Time</span>
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </label>
            <label>
              <span>To Date/Time</span>
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} required />
            </label>
          </div>

          {message ? <p className={`report-message ${format === 'PDF' ? 'warning' : 'info'}`}>{message}</p> : null}

          <div className="reports-actions">
            <button type="submit" disabled={downloading} className="primary-btn">
              <Download size={16} /> {downloading ? 'Generating...' : 'Export Report'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}

function EquipmentTab() {
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEq, setSelectedEq] = useState(null)
  const [thresholds, setThresholds] = useState([])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const data = await getEquipmentList()
      setEquipmentList(data)
      if (data.length > 0 && !selectedEq) {
        setSelectedEq(data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEquipment()
  }, [])

  useEffect(() => {
    if (!selectedEq) return
    getThresholds(selectedEq.id)
      .then(setThresholds)
      .catch(() => setThresholds([]))
  }, [selectedEq])

  async function handleToggleEnabled(eq) {
    try {
      const updated = await setEquipmentEnabled(eq.id, !eq.enabled)
      setEquipmentList((prev) => prev.map((item) => (item.id === eq.id ? updated : item)))
    } catch (err) {
      alert(err.message || 'Failed to toggle equipment state')
    }
  }

  async function handleUpdateThreshold(metricKey, val) {
    if (!selectedEq) return
    try {
      await updateThreshold(selectedEq.id, metricKey, Number(val))
      const updated = await getThresholds(selectedEq.id)
      setThresholds(updated)
    } catch (err) {
      alert(err.message || 'Failed to update threshold')
    }
  }

  return (
    <div className="equipment-threshold-section">
      <SectionCard title="Equipment Registry & Monitoring Controls">
        {loading ? <p className="empty-state">Loading equipment list...</p> : null}
        {!loading && equipmentList.length > 0 ? (
          <div className="equipment-grid">
            {equipmentList.map((eq) => (
              <article key={eq.id} className={`equipment-card ${selectedEq?.id === eq.id ? 'selected' : ''}`} onClick={() => setSelectedEq(eq)}>
                <div className="equipment-header">
                  <div>
                    <strong>{eq.equipmentCode}</strong>
                    <span>{eq.displayName} ({eq.equipmentType})</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(eq.enabled)}
                      onChange={() => handleToggleEnabled(eq)}
                    />
                    <span className="slider" />
                  </label>
                </div>
                <div className="equipment-status">
                  <span className={`badge ${eq.enabled ? 'online' : 'offline'}`}>
                    {eq.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>

      {selectedEq ? (
        <SectionCard title={`Threshold Overrides: ${selectedEq.equipmentCode} (${selectedEq.equipmentType})`}>
          <div className="thresholds-panel">
            {thresholds.length === 0 ? (
              <p className="empty-state">No custom thresholds configured for {selectedEq.equipmentCode}. System defaults apply.</p>
            ) : (
              <div className="thresholds-table">
                {thresholds.map((t) => (
                  <div key={t.id ?? t.metricKey} className="threshold-row">
                    <label><span>{t.metricKey}</span></label>
                    <input
                      type="number"
                      defaultValue={t.value}
                      onBlur={(e) => handleUpdateThreshold(t.metricKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}
