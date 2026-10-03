import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, KeyRound, LogOut, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { changePassword, getProfile, updateProfile } from '../api/profileApi'

const emptyDetails = { fullName: '', email: '', phone: '' }
const emptyPassword = { currentPassword: '', newPassword: '', confirmPassword: '' }

function toDetails(profile) {
  return {
    fullName: profile.fullName ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
  }
}

function initialsOf(profile) {
  const source = profile?.fullName || profile?.username || '?'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function formatDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function ContactRow({ icon, label, value }) {
  return (
    <li>
      {icon}
      <div>
        <span>{label}</span>
        {value ? <strong>{value}</strong> : <em>Not set</em>}
      </div>
    </li>
  )
}

export default function ProfilePage() {
  const { logout, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [details, setDetails] = useState(emptyDetails)
  const [savingDetails, setSavingDetails] = useState(false)
  const [password, setPassword] = useState(emptyPassword)
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    let ignore = false
    getProfile()
      .then((data) => {
        if (ignore) return
        setProfile(data)
        setDetails(toDetails(data))
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.message || 'Unable to load profile')
      })
    return () => {
      ignore = true
    }
  }, [])

  const detailsChanged = profile
    ? Object.entries(toDetails(profile)).some(([key, value]) => value !== details[key])
    : false

  async function handleSaveDetails(event) {
    event.preventDefault()
    setSavingDetails(true)
    try {
      const saved = await updateProfile(details)
      setProfile(saved)
      setDetails(toDetails(saved))
      updateUser({ fullName: saved.fullName, email: saved.email, phone: saved.phone })
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error.message || 'Unable to update profile')
    } finally {
      setSavingDetails(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordError('')
    if (password.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(password.currentPassword, password.newPassword)
      setPassword(emptyPassword)
      toast.success('Password changed')
    } catch (error) {
      setPasswordError(error.message || 'Unable to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loadError) {
    return <p className="empty-state">{loadError}</p>
  }

  if (!profile) {
    return <p className="empty-state">Loading profile...</p>
  }

  return (
    <div className="profile-page">
      <aside className="profile-card">
        <div className="profile-avatar" aria-hidden="true">{initialsOf(profile)}</div>
        <h2>{profile.fullName || profile.username}</h2>
        <p className="profile-username">@{profile.username}</p>
        <span className="profile-role"><ShieldCheck size={13} /> {profile.role}</span>

        <ul className="profile-contact">
          <ContactRow icon={<Mail size={16} />} label="Email" value={profile.email} />
          <ContactRow icon={<Phone size={16} />} label="Phone" value={profile.phone} />
          <ContactRow icon={<CalendarDays size={16} />} label="Member since" value={formatDate(profile.createdAt)} />
        </ul>

        <button type="button" className="profile-signout" onClick={() => logout()}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <div className="profile-forms">
        <section className="profile-panel">
          <header>
            <UserRound size={18} />
            <div>
              <h3>Personal details</h3>
              <p>How your name and contact details appear to the team.</p>
            </div>
          </header>
          <form onSubmit={handleSaveDetails}>
            <label className="profile-field wide">
              <span>Full name</span>
              <input
                value={details.fullName}
                onChange={(event) => setDetails({ ...details, fullName: event.target.value })}
                maxLength={150}
                autoComplete="name"
                placeholder="e.g. Nimal Perera"
              />
            </label>
            <label className="profile-field">
              <span>Email</span>
              <input
                type="email"
                value={details.email}
                onChange={(event) => setDetails({ ...details, email: event.target.value })}
                maxLength={150}
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
            <label className="profile-field">
              <span>Phone</span>
              <input
                type="tel"
                value={details.phone}
                onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                maxLength={30}
                autoComplete="tel"
                placeholder="+94 71 234 5678"
              />
            </label>
            <div className="profile-actions wide">
              <button type="button" className="ghost-btn" disabled={!detailsChanged || savingDetails} onClick={() => setDetails(toDetails(profile))}>
                Reset
              </button>
              <button type="submit" className="primary-btn" disabled={!detailsChanged || savingDetails}>
                {savingDetails ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-panel">
          <header>
            <KeyRound size={18} />
            <div>
              <h3>Security</h3>
              <p>Use at least 8 characters. You stay signed in after changing it.</p>
            </div>
          </header>
          <form onSubmit={handleChangePassword}>
            <label className="profile-field wide">
              <span>Current password</span>
              <input
                type="password"
                value={password.currentPassword}
                onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="profile-field">
              <span>New password</span>
              <input
                type="password"
                value={password.newPassword}
                onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="profile-field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={password.confirmPassword}
                onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                autoComplete="new-password"
                required
              />
            </label>
            {passwordError ? <p className="report-message error wide">{passwordError}</p> : null}
            <div className="profile-actions wide">
              <button type="submit" className="primary-btn" disabled={savingPassword}>
                {savingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
