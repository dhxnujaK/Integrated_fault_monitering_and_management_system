import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Panel } from './pageUtils'

export default function SettingsPage() {
  const { user, logout } = useAuth()

  return (
    <>
      <PageHeader title="Settings" subtitle="Authenticated user details" />
      <Panel title="Account">
        <dl className="detail-list">
          <div><dt>Username</dt><dd>{user?.username || localStorage.getItem('username') || 'Unknown'}</dd></div>
          <div><dt>Role</dt><dd>{user?.role || localStorage.getItem('role') || 'Unknown'}</dd></div>
        </dl>
        <button className="danger-button" type="button" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </Panel>
    </>
  )
}
