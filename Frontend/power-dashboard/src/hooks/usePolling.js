import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A custom hook to poll an API endpoint at a regular interval.
 * @param {Function} fetchFn - A function returning a Promise that fetches data.
 * @param {number} intervalMs - Polling interval in milliseconds.
 * @returns {Object} { data, loading, error, refresh }
 */
export default function usePolling(fetchFn, intervalMs = 5000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchRef = useRef(fetchFn)
  const mountedRef = useRef(true)

  useEffect(() => {
    fetchRef.current = fetchFn
  }, [fetchFn])

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
    refresh().catch(() => {})

    const interval = setInterval(() => refresh().catch(() => {}), intervalMs)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [intervalMs, refresh])

  return { data, loading, error, refresh }
}
