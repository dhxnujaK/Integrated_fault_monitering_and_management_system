/* eslint-disable react-refresh/only-export-components */
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export const subsystems = ['GENERATOR', 'ATS', 'MDP', 'SDP', 'UPS']

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function Panel({ title, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function StateMessage({ title, children, tone = 'muted' }) {
  return (
    <div className={`state-message ${tone}`}>
      <AlertCircle size={20} />
      <div>
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  )
}

export function RefreshButton({ onClick, disabled }) {
  return (
    <button className="icon-button" type="button" onClick={onClick} disabled={disabled}>
      <RefreshCw size={17} />
      Refresh
    </button>
  )
}

export function DataTable({ columns, rows, emptyTitle, emptyText }) {
  if (!rows.length) {
    return <StateMessage title={emptyTitle}>{emptyText}</StateMessage>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? row.code ?? row.title ?? index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : formatValue(row[column.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function useAsyncData(loadFn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadFn())
    } catch (err) {
      setError(err.message || 'Unable to load data')
    } finally {
      setLoading(false)
    }
  }, [loadFn])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
