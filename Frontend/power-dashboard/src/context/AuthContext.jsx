/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, loginRequest, logoutRequest } from '../api/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('role')
    return username ? { username, role } : null
  })
  const [loadingUser, setLoadingUser] = useState(Boolean(token))

  useEffect(() => {
    let ignore = false

    async function loadUser() {
      if (!token) {
        setLoadingUser(false)
        return
      }

      try {
        const currentUser = await getCurrentUser()
        if (!ignore) {
          localStorage.setItem('username', currentUser.username)
          localStorage.setItem('role', currentUser.role)
          setUser(currentUser)
        }
      } catch {
        if (!ignore) {
          setToken(null)
          setUser(null)
          localStorage.removeItem('token')
          localStorage.removeItem('username')
          localStorage.removeItem('role')
        }
      } finally {
        if (!ignore) setLoadingUser(false)
      }
    }

    loadUser()
    return () => {
      ignore = true
    }
  }, [token])

  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password)
    const nextToken = data.token

    if (!nextToken) {
      throw new Error('Login response did not include a token.')
    }

    const nextUser = {
      username: data.username || username,
      role: data.role || 'USER',
    }

    localStorage.setItem('token', nextToken)
    localStorage.setItem('username', nextUser.username)
    localStorage.setItem('role', nextUser.role)
    setToken(nextToken)
    setUser(nextUser)
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // JWT logout is client-side safe even if the optional endpoint call fails.
    }
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(() => ({
    user,
    token,
    loadingUser,
    isAuthenticated: Boolean(token),
    login,
    logout,
  }), [user, token, loadingUser, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
