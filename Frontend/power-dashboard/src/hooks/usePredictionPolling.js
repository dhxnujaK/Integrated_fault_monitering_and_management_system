import { useCallback, useEffect, useState } from 'react'

export default function usePredictionPolling(loader, intervalMs = 60000, resetKey = '') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const nextData = await loader()
      setData(nextData)
      setError('')
      return nextData
    } catch (err) {
      setError(err.message || 'Unable to load prediction data.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [loader])

  useEffect(() => {
    let disposed = false

    async function load() {
      try {
        const nextData = await loader()
        if (!disposed) {
          setData(nextData)
          setError('')
        }
      } catch (err) {
        if (!disposed) setError(err.message || 'Unable to load prediction data.')
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    setLoading(true)
    load()
    const intervalId = window.setInterval(load, intervalMs)
    return () => {
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [intervalMs, loader, resetKey])

  return { data, loading, error, refresh }
}
