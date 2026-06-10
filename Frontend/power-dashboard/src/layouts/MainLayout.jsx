import { NavLink, Outlet } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Gauge,
  LayoutDashboard,
  LogOut,
  PanelTop,
  PlugZap,
  Power,
  ServerCog,
  Settings,
  TicketCheck,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/generator', label: 'Generator', icon: Gauge },
  { to: '/ats', label: 'ATS', icon: PlugZap },
  { to: '/mdp', label: 'MDP', icon: PanelTop },
  { to: '/sdp', label: 'SDP', icon: ServerCog },
  { to: '/ups', label: 'UPS', icon: Power },
  { to: '/alarms', label: 'Alarms', icon: AlertTriangle },
  { to: '/predictions', label: 'Predictions', icon: BarChart3 },
  { to: '/tickets', label: 'Tickets', icon: TicketCheck },
  { to: '/reports', label: 'Reports', icon: Wrench },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function MainLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="account-card">
          <strong>{user?.username || 'User'}</strong>
          <span>{user?.role || 'Authenticated'}</span>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button type="button" onClick={logout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
      <main className="workspace">
        <Outlet />
      </main>
    </div>
  )
}
