import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SectionCard from '../components/SectionCard'
import { createTicket, getTickets, updateTicket } from '../api/ticketsApi'
import { downloadAlarmsReport, downloadTicketsReport } from '../api/reportsApi'
import { getEquipmentList } from '../api/settingsApi'
import { CheckCircle2, Clock, Download, FileSpreadsheet, Plus, RefreshCw, Settings2, Ticket, AlertTriangle } from 'lucide-react'
import EquipmentThresholdsTab from './EquipmentThresholdsTab'

export default function OperationsPage() {
  const location = useLocation()
  const initialTab = location.state?.tab || 'tickets'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveTab(location.state?.tab || 'tickets'), 0)
    return () => window.clearTimeout(timer)
  }, [location.state])

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
        {activeTab === 'equipment' ? <EquipmentThresholdsTab /> : null}
      </div>
    </div>
  )
}

function TicketsTab({ locationState }) {
  const [tickets, setTickets] = useState([])
  const [equipmentOptions, setEquipmentOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingEquipment, setLoadingEquipment] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(Boolean(locationState?.createModal || locationState?.alarmId))
  const [creating, setCreating] = useState(false)

  // Form State
  const [equipmentId, setEquipmentId] = useState(locationState?.equipmentId || '1')
  const [alarmId, setAlarmId] = useState(locationState?.alarmId || '')
  const [title, setTitle] = useState(locationState?.title || '')
  const [description, setDescription] = useState(locationState?.description || '')
  const [priority, setPriority] = useState(locationState?.priority || 'HIGH')
  const [assignedGroup, setAssignedGroup] = useState(locationState?.assignedGroup || 'Electrical Team')

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getTickets({ status: statusFilter || undefined })
      const items = data.items ?? []
      setTickets(statusFilter ? items : items.filter((ticket) => ticket.status !== 'CLOSED'))
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    setShowCreateModal(Boolean(locationState?.createModal || locationState?.alarmId))
    if (locationState?.equipmentId) setEquipmentId(String(locationState.equipmentId))
    if (locationState?.alarmId) setAlarmId(String(locationState.alarmId))
    if (locationState?.title) setTitle(locationState.title)
    if (locationState?.description) setDescription(locationState.description)
    if (locationState?.priority) setPriority(locationState.priority)
    if (locationState?.assignedGroup) setAssignedGroup(locationState.assignedGroup)
  }, [locationState])

  useEffect(() => {
    getEquipmentList({ enabled: true })
      .then((data) => {
        const options = Array.isArray(data) ? data : (data.items ?? [])
        setEquipmentOptions(options)
        if (!locationState?.equipmentId && options.length) setEquipmentId(String(options[0].id))
      })
      .catch(() => setEquipmentOptions([]))
      .finally(() => setLoadingEquipment(false))
  }, [locationState?.equipmentId])

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
        assignedGroup,
      })
      setShowCreateModal(false)
      setTitle('')
      setDescription('')
      setAlarmId('')
      setAssignedGroup('Electrical Team')
      setFeedback({ type: 'success', message: 'Maintenance ticket created successfully.' })
      await fetchTickets()
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create ticket.' })
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(ticketId, nextStatus) {
    try {
      await updateTicket(ticketId, { status: nextStatus })
      setFeedback({ type: 'success', message: 'Ticket status updated.' })
      await fetchTickets()
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Invalid status change.' })
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
              <option value="CLOSED">Closed / History</option>
            </select>
            <button type="button" className="icon-btn" onClick={fetchTickets} title="Refresh">
              <RefreshCw size={15} />
            </button>
            <span className="result-count">{loading ? 'Loading' : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}</span>
          </div>
          <button type="button" className="primary-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Create Ticket
          </button>
        </div>

        {feedback ? <p className={`operation-feedback ${feedback.type}`}>{feedback.message}</p> : null}

        {loading ? (
          <div className="ticket-skeleton-list" aria-label="Loading tickets">
            {[1, 2, 3].map((item) => <div className="ticket-skeleton" key={item} />)}
          </div>
        ) : null}
        {error ? <p className="empty-state error-text">{error}</p> : null}
        {!loading && !error && tickets.length === 0 ? (
          <div className="operations-empty">
            <AlertTriangle size={24} />
            <strong>No maintenance tickets found</strong>
            <span>Create a work order when an alarm or maintenance task needs attention.</span>
            <button type="button" className="primary-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} /> Create Ticket
            </button>
          </div>
        ) : null}

        {tickets.length > 0 ? (
          <div className="tickets-table-wrapper">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title & Equipment</th>
                  <th>Priority</th>
                  <th>Assigned Group</th>
                  <th>Status</th>
                  <th>Created At</th>
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
                    <td>{t.assignedGroup || '--'}</td>
                    <td>
                      <select className="status-select" value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}>
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                    <td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : '--'}</td>
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
                <span>Equipment</span>
                <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} required disabled={loadingEquipment || !equipmentOptions.length}>
                  {loadingEquipment ? <option>Loading equipment...</option> : null}
                  {!loadingEquipment && !equipmentOptions.length ? <option value="">No equipment available</option> : null}
                  {equipmentOptions.map((equipment) => (
                    <option value={equipment.id} key={equipment.id}>{equipment.equipmentCode} - {equipment.displayName}</option>
                  ))}
                </select>
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
                  </select>
                </label>
                <label>
                  <span>Assigned Group</span>
                  <select value={assignedGroup} onChange={(e) => setAssignedGroup(e.target.value)}>
                    <option value="Electrical Team">Electrical Team</option>
                    <option value="Mechanical Team">Mechanical Team</option>
                    <option value="Operations Team">Operations Team</option>
                    <option value="Safety Team">Safety Team</option>
                  </select>
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
        from: from.length === 16 ? `${from}:00` : from,
        to: to.length === 16 ? `${to}:59` : to,
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
