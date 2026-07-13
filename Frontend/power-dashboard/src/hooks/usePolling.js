import { useEffect, useState, useRef } from 'react'

/**
 * A custom hook to poll an API endpoint at a regular interval.
 * @param {Function} fetchFn - A function returning a Promise that fetches data.
 * @param {number} intervalMs - Polling interval in milliseconds.
 * @returns {Object} { data, loading, error }
 */
export default function usePolling(fetchFn, intervalMs = 5000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchRef = useRef(fetchFn)

  useEffect(() => {
    fetchRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    let active = true

    async function execute() {
      try {
        const result = await fetchRef.current()
        if (active) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (active) {
          setError(err)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    // Run immediately on mount
    execute()

    const interval = setInterval(execute, intervalMs)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [intervalMs])

  return { data, loading, error }
}
