import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { LanguageSwitch, useLanguage } from '../lib/I18nContext.jsx'
import CloudStatus from './CloudStatus.jsx'

export function Brand() {
  return (
    <Link className="brand" to="/">
      <img className="brand-logo" src="/ika-poland-logo.jpg" alt="IKA Poland" />
      <span><strong className="ika-brand-wordmark"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><small>System Zawodów</small></span>
    </Link>
  )
}

export function PublicHeader() {
  const { user } = useAuth()
  const { t } = useLanguage()
  return (
    <header className="topbar">
      <Brand />
      <nav className="public-nav">
        <NavLink to="/aktualnosci">{t.news}</NavLink>
        <NavLink to="/rodzic">{t.athleteZone}</NavLink>
        <NavLink to="/klasyfikacja">{t.rankings}</NavLink>
        <NavLink to="/telebim">{t.scoreboard}</NavLink>
        {user ? <NavLink to={user.role === 'organizer' ? '/organizator' : '/panel'}>{user.role === 'organizer' ? t.organizer : t.clubEntries}</NavLink> : <NavLink to="/logowanie">{t.clubLogin}</NavLink>}
        <LanguageSwitch compact />
      </nav>
    </header>
  )
}

export function ClubWebsiteLayout({ children, clubName = '', organizer = false }) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const onLogout = async () => { await logout(); navigate('/') }
  return (
    <div className="club-site-shell">
      <header className="topbar club-site-topbar">
        <Brand />
        <nav className="club-site-nav" aria-label="Strefa zgłoszeń klubu">
          <Link to="/">{t.home}</Link><a href="#club-active-tournaments">{t.competitions}</a><a href="#club-athletes">{t.athletes}</a><a href="#club-entries">{t.myEntries}</a>{organizer && <Link to="/organizator">{t.organizer}</Link>}
        </nav>
        <div className="club-site-account"><LanguageSwitch compact /><span>{clubName || user?.email || 'Klub'}</span><button className="btn btn-ghost btn-sm" type="button" onClick={onLogout}>{t.logout}</button></div>
      </header>
      <main className="club-site-main">{children}</main>
      <footer className="club-site-footer"><span className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></span> - strona zgłoszeń klubów i zawodników na zawody</footer>
    </div>
  )
}

export function DashboardLayout({ title, children, organizer = false, showHeadingActions = true }) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const onLogout = async () => { await logout(); navigate('/') }
  return (
    <div className="app-shell">
      <header className="topbar dashboard-topbar">
        <Brand />
        <div className="dashboard-user"><LanguageSwitch compact /><CloudStatus /><span>{user?.fullName}</span><button className="btn btn-ghost btn-sm" onClick={onLogout}>{t.logout}</button></div>
      </header>
      <main className="dashboard-main">
        <div className="page-heading">
          <div><span className="eyebrow">{organizer ? t.organizerPanel : t.clubPanel}</span><h1>{title}</h1></div>
          {showHeadingActions && <div className="heading-actions"><Link className="btn btn-outline" to="/rodzic">{t.athletePreview}</Link><Link className="btn btn-outline" to="/klasyfikacja">{t.rankings}</Link>{organizer && <Link className="btn btn-outline" to="/telebim" target="_blank">{t.openScoreboard}</Link>}</div>}
        </div>
        {user?.authProvider === 'temporary-test' && <div className="alert alert-warning temp-organizer-warning"><strong>TRYB TESTOWY ORGANIZATORA</strong><span> Dostęp ważny do 23.10.2026, 23:59. Zmiany prywatnych danych Supabase nie są w tym trybie synchronizowane.</span></div>}
        {children}
      </main>
    </div>
  )
}

export function EmptyState({ title, text, action }) { return <div className="empty-state"><div className="empty-icon">✦</div><h3>{title}</h3><p>{text}</p>{action}</div> }
export function StatusBadge({ status, label }) {
  const labels = { scheduled: 'Zaplanowana', called: 'Przygotuj się', active: 'Trwa teraz', done: 'Zakończona' }
  return <span className={`status status-${status || 'scheduled'}`}>{label || labels[status] || status}</span>
}
