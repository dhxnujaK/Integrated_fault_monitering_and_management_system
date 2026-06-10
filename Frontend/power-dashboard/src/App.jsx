import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import GeneratorPage from './pages/GeneratorPage'
import ATSPage from './pages/ATSPage'
import MDPPage from './pages/MDPPage'
import SDPPage from './pages/SDPPage'
import UPSPage from './pages/UPSPage'
import AlarmsPage from './pages/AlarmsPage'
import PredictionsPage from './pages/PredictionsPage'
import TicketsPage from './pages/TicketsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/generator" element={<GeneratorPage />} />
              <Route path="/ats" element={<ATSPage />} />
              <Route path="/mdp" element={<MDPPage />} />
              <Route path="/sdp" element={<SDPPage />} />
              <Route path="/ups" element={<UPSPage />} />
              <Route path="/alarms" element={<AlarmsPage />} />
              <Route path="/predictions" element={<PredictionsPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
