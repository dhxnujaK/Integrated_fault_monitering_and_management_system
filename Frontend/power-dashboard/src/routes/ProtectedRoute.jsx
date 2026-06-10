import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { token, loadingUser } = useAuth()
  const location = useLocation()

  if (loadingUser) {
    return <main className="center-page">Loading session...</main>
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
