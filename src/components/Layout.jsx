import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import CloudStatus from './CloudStatus.jsx'

export function LanguageSwitch({ compact = false }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className={`language-switch ${compact ? 'language-switch-compact' : ''}`} role="group" aria-label="Language / Język">
      <button type="button" className={language === 'pl' ? 'active' : ''} onClick={() => setLanguage('pl')} aria-pressed={language === 'pl'}>PL</button>
      <span aria-hidden="true">|</span>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
    </div>
  )
}

export function Brand() {
  const { tr } = useLanguage()
  return (
    <Link className="brand" to="/">
      <img className="brand-logo" src="/ika-poland-logo.jpg" alt="IKA Poland" />
      <span>
        <strong>IKA Poland</strong>
        <small>{tr('System Zawodów', 'Competition System')}</small>
      </span>
    </Link>
  )
}

export function PublicHeader() {
  const { user } = useAuth()
  const { tr } = useLanguage()
  return (
    <header className="topbar public-topbar">
      <Brand />
      <div className="public-header-right">
        <nav className="public-nav">
          <NavLink to="/aktualnosci">{tr('Aktualności', 'News')}</NavLink>
          <NavLink to="/rodzic">{tr('Strefa zawodnika', 'Athlete zone')}</NavLink>
          <NavLink to="/klasyfikacja">{tr('Klasyfikacja LIVE', 'LIVE rankings')}</NavLink>
          <NavLink to="/telebim">{tr('Telebim', 'Display')}</NavLink>
          {user
            ? <NavLink to={user.role === 'organizer' ? '/organizator' : '/panel'}>{user.role === 'organizer' ? tr('Organizator', 'Organizer') : tr('Zgłoszenia klubu', 'Club entries')}</NavLink>
            : <NavLink to="/logowanie">{tr('Zaloguj klub', 'Club login')}</NavLink>}
        </nav>
        <LanguageSwitch compact />
      </div>
    </header>
  )
}

export function ClubWebsiteLayout({ children, clubName = '', organizer = false }) {
  const { user, logout } = useAuth()
  const { tr } = useLanguage()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="club-site-shell">
      <header className="topbar club-site-topbar">
        <Brand />
        <nav className="club-site-nav" aria-label={tr('Strefa zgłoszeń klubu', 'Club registration zone')}>
          <Link to="/">{tr('Strona główna', 'Home')}</Link>
          <a href="#club-active-tournaments">{tr('Zawody', 'Events')}</a>
          <a href="#club-athletes">{tr('Zawodnicy', 'Athletes')}</a>
          <a href="#club-entries">{tr('Moje zgłoszenia', 'My entries')}</a>
          {organizer && <Link to="/organizator">{tr('Organizator', 'Organizer')}</Link>}
        </nav>
        <div className="club-site-account">
          <LanguageSwitch compact />
          <span>{clubName || user?.email || tr('Klub', 'Club')}</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onLogout}>{tr('Wyloguj', 'Log out')}</button>
        </div>
      </header>
      <main className="club-site-main">{children}</main>
      <footer className="club-site-footer">{tr('IKA Poland - strona zgłoszeń klubów i zawodników na zawody', 'IKA Poland - club and athlete competition registration')}</footer>
    </div>
  )
}

export function DashboardLayout({ title, titleEn = '', children, organizer = false, showHeadingActions = true }) {
  const { user, logout } = useAuth()
  const { tr } = useLanguage()
  const navigate = useNavigate()
  const onLogout = async () => {
    await logout()
    navigate('/')
  }
  return (
    <div className="app-shell">
      <header className="topbar dashboard-topbar">
        <Brand />
        <div className="dashboard-user">
          <LanguageSwitch compact />
          <CloudStatus />
          <span>{user?.fullName}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>{tr('Wyloguj', 'Log out')}</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{organizer ? tr('Panel organizatora', 'Organizer panel') : tr('Panel klubu', 'Club panel')}</span>
            <h1>{titleEn ? tr(title, titleEn) : title}</h1>
          </div>
          {showHeadingActions && <div className="heading-actions">
            <Link className="btn btn-outline" to="/rodzic">{tr('Podgląd zawodnika', 'Athlete lookup')}</Link>
            <Link className="btn btn-outline" to="/klasyfikacja">{tr('Klasyfikacja LIVE', 'LIVE rankings')}</Link>
            {organizer && <Link className="btn btn-outline" to="/telebim" target="_blank">{tr('Otwórz telebim', 'Open display')}</Link>}
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
  const { tr } = useLanguage()
  const labels = {
    scheduled: tr('Zaplanowana', 'Scheduled'),
    called: tr('Przygotuj się', 'Get ready'),
    active: tr('Trwa teraz', 'Live now'),
    done: tr('Zakończona', 'Finished'),
  }
  return <span className={`status status-${status || 'scheduled'}`}>{label || labels[status] || status}</span>
}
