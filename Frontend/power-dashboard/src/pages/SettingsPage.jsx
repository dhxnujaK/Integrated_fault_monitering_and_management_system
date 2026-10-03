import { SlidersHorizontal } from 'lucide-react'
import SectionCard from '../components/SectionCard'

export default function SettingsPage({ onAction }) {
  return (
    <div className="settings-grid">
      <SettingsPanel title="System Parameters & Thresholds">
        <SliderRow label="Phase Voltage Tolerance" value="15 V" />
        <label className="setting-line"><span>Overload Trip Delay</span><input defaultValue="5 sec" /></label>
        <label className="setting-line"><span>Maintenance Alert Interval</span><input defaultValue="90 Days" /></label>
        <label className="setting-line"><span>Report Generation Frequency</span><select defaultValue="monthly"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label>
      </SettingsPanel>
      <SettingsPanel title="Notification & Alert Settings">
        <div className="check-row"><label><input type="checkbox" defaultChecked /> Email Alerts</label><label><input type="checkbox" defaultChecked /> SMS Alerts</label><label><input type="checkbox" /> Push Notifications</label></div>
        <label className="setting-line"><span>Critical Alarm Contact List</span><input defaultValue="Dispatch A, On-call Tech" /></label>
        <label className="setting-line"><span>Status Report Subscription</span><select defaultValue="summary"><option value="summary">Daily Summary</option><option value="incident">Incident Only</option></select></label>
        <label className="setting-line check"><span>Quiet Hours</span><input type="checkbox" defaultChecked /></label>
      </SettingsPanel>
      <SettingsPanel title="Advanced Options & User Permissions">
        <label className="setting-line"><span>User Role & Permissions</span><select defaultValue="tech"><option value="tech">Edit Permission</option><option value="view">View Only</option></select></label>
        <label className="setting-line"><span>Alarm Override Access</span><select defaultValue="allowed"><option value="allowed">Allowed</option><option value="blocked">Blocked</option></select></label>
        <label className="setting-line check"><span>Active Directory Sync</span><input type="checkbox" defaultChecked /></label>
        <label className="setting-line check"><span>Enable Two-Factor Authentication</span><input type="checkbox" defaultChecked /></label>
      </SettingsPanel>
      <SettingsPanel title="Network & Backup Configuration">
        <label className="setting-line"><span>Network Connectivity</span><select defaultValue="primary"><option value="primary">Primary</option><option value="backup">Backup SIM</option></select></label>
        <label className="setting-line"><span>Backup & Restore</span><input defaultValue="Drive K / Auto Sync" /></label>
        <label className="setting-line"><span>Assigned Backup</span><input defaultValue="Local Server" /></label>
        <label className="setting-line check"><span>Auto Backup Enabled</span><input type="checkbox" defaultChecked /></label>
      </SettingsPanel>
      <div className="settings-actions">
        <button type="button" onClick={() => onAction?.('Settings saved')}>Save Changes</button>
        <button type="button" className="ghost">Cancel</button>
      </div>
    </div>
  )
}

function SettingsPanel({ title, children }) {
  return (
    <SectionCard title={title} icon={SlidersHorizontal}>
      {children}
    </SectionCard>
  )
}

function SliderRow({ label, value }) {
  return (
    <label className="setting-line slider-line">
      <span>{label}</span>
      <span className="slider-control"><input type="range" defaultValue="68" /><strong>{value}</strong></span>
    </label>
  )
}
