import React from 'react'

/**
 * Reusable SectionCard component to display panels.
 */
export default function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`section-card ${className}`}>
      <div className="section-title flex items-center gap-2">
        {Icon ? <Icon size={19} /> : null}
        <h2>{title}</h2>
      </div>
      <div className="divider" />
      {children}
    </section>
  )
}
