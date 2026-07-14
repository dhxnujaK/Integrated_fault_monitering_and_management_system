import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A custom hook to poll an API endpoint at a regular interval.
 * @param {Function} fetchFn - A function returning a Promise that fetches data.
 * @param {number} intervalMs - Polling interval in milliseconds.
 * @param {Object} options - Optional cached initial data and a key that resets polling inputs.
 * @returns {Object} { data, loading, error, refresh }
 */
export default function usePolling(fetchFn, intervalMs = 5000, { initialData = null, resetKey } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(initialData === null)
  const [error, setError] = useState(null)
  const fetchRef = useRef(fetchFn)
  const initialDataRef = useRef(initialData)
  const mountedRef = useRef(true)

  useEffect(() => {
    fetchRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    initialDataRef.current = initialData
  }, [initialData])

  const refresh = useCallback(async () => {
    try {
      const result = await fetchRef.current()
      if (mountedRef.current) {
        setData(result)
        setError(null)
      }
      return result
    } catch (err) {
      if (mountedRef.current) setError(err)
      throw err
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    setData(initialDataRef.current)
    setError(null)
    setLoading(initialDataRef.current === null)
    refresh().catch(() => {})

    const interval = setInterval(() => refresh().catch(() => {}), intervalMs)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [intervalMs, refresh, resetKey])

  return { data, loading, error, refresh }
}
