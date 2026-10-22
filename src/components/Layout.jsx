import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import CloudStatus from './CloudStatus.jsx'

export function Brand() {
  return (
    <Link className="brand" to="/">
      <img className="brand-logo" src="/ika-poland-logo.jpg" alt="IKA Poland" />
      <span>
        <strong>IKA Poland</strong>
        <small>System Zawodów</small>
      </span>
    </Link>
  )
}

export function PublicHeader() {
  const { user } = useAuth()
  return (
    <header className="topbar">
      <Brand />
      <nav className="public-nav">
        <NavLink to="/aktualnosci">Aktualności</NavLink>
        <NavLink to="/rodzic">Strefa zawodnika</NavLink>
        <NavLink to="/klasyfikacja">Klasyfikacja LIVE</NavLink>
        <NavLink to="/telebim">Telebim</NavLink>
        {user ? <NavLink to={user.role === 'organizer' ? '/organizator' : '/panel'}>{user.role === 'organizer' ? 'Organizator' : 'Zgłoszenia klubu'}</NavLink> : <NavLink to="/logowanie">Zaloguj klub</NavLink>}
      </nav>
    </header>
  )
}

export function ClubWebsiteLayout({ children, clubName = '', organizer = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="club-site-shell">
      <header className="topbar club-site-topbar">
        <Brand />
        <nav className="club-site-nav" aria-label="Strefa zgłoszeń klubu">
          <Link to="/">Strona główna</Link>
          <a href="#club-active-tournaments">Zawody</a>
          <a href="#club-athletes">Zawodnicy</a>
          <a href="#club-entries">Moje zgłoszenia</a>
          {organizer && <Link to="/organizator">Organizator</Link>}
        </nav>
        <div className="club-site-account">
          <span>{clubName || user?.email || 'Klub'}</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onLogout}>Wyloguj</button>
        </div>
      </header>
      <main className="club-site-main">{children}</main>
      <footer className="club-site-footer">IKA Poland - strona zgłoszeń klubów i zawodników na zawody</footer>
    </div>
  )
}

export function DashboardLayout({ title, children, organizer = false, showHeadingActions = true }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const onLogout = () => {
    logout()
    navigate('/')
  }
  return (
    <div className="app-shell">
      <header className="topbar dashboard-topbar">
        <Brand />
        <div className="dashboard-user">
          <CloudStatus />
          <span>{user?.fullName}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Wyloguj</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{organizer ? 'Panel organizatora' : 'Panel klubu'}</span>
            <h1>{title}</h1>
          </div>
          {showHeadingActions && <div className="heading-actions">
            <Link className="btn btn-outline" to="/rodzic">Podgląd zawodnika</Link>
            <Link className="btn btn-outline" to="/klasyfikacja">Klasyfikacja LIVE</Link>
            {organizer && <Link className="btn btn-outline" to="/telebim" target="_blank">Otwórz telebim</Link>}
          </div>}
        </div>
        {children}
      </main>
    </div>
  )
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">✦</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function StatusBadge({ status, label }) {
  const labels = {
    scheduled: 'Zaplanowana',
    called: 'Przygotuj się',
    active: 'Trwa teraz',
    done: 'Zakończona',
  }
  return <span className={`status status-${status || 'scheduled'}`}>{label || labels[status] || status}</span>
}
