import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import CloudStatus from './CloudStatus.jsx'
import { useLanguage } from '../lib/i18n.js'

export function Brand() {
  const { language } = useLanguage()
  return (
    <Link className="brand" to="/">
      <img className="brand-logo" src="/ika-poland-logo.jpg" alt="IKA Poland" />
      <span>
        <strong>IKA Poland</strong>
        <small>{language === 'en' ? 'Competition System' : 'System Zawodów'}</small>
      </span>
    </Link>
  )
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  return (
    <div className="language-toggle" aria-label="Language / Język">
      <button type="button" className={language === 'pl' ? 'active' : ''} onClick={() => setLanguage('pl')}>PL</button>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
    </div>
  )
}

export function PublicHeader() {
  const { user } = useAuth()
  const { t } = useLanguage()
  return (
    <header className="topbar">
      <Brand />
      <nav className="public-nav">
        <NavLink to="/aktualnosci">{t('news')}</NavLink>
        <NavLink to="/rodzic">{t('athleteZone')}</NavLink>
        <NavLink to="/klasyfikacja">{t('liveRanking')}</NavLink>
        <NavLink to="/telebim">{t('scoreboard')}</NavLink>
        {user ? <NavLink to={user.role === 'organizer' ? '/organizator' : '/panel'}>{user.role === 'organizer' ? t('organizer') : t('clubEntries')}</NavLink> : <NavLink to="/logowanie">{t('loginClub')}</NavLink>}
        <LanguageToggle />
      </nav>
    </header>
  )
}

export function ClubWebsiteLayout({ children, clubName = '', organizer = false }) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
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
          <Link to="/">{t('home')}</Link>
          <a href="#club-active-tournaments">{t('competitions')}</a>
          <a href="#club-athletes">{t('athletes')}</a>
          <a href="#club-entries">{t('myEntries')}</a>
          {organizer && <Link to="/organizator">{t('organizer')}</Link>}
        </nav>
        <div className="club-site-account">
          <span>{clubName || user?.email || 'Klub'}</span>
          <LanguageToggle />
          <button className="btn btn-ghost btn-sm" type="button" onClick={onLogout}>{t('logout')}</button>
        </div>
      </header>
      <main className="club-site-main">{children}</main>
      <footer className="club-site-footer">IKA Poland — {t('clubRegistrationZone')}</footer>
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
  const { language } = useLanguage()
  const labels = language === 'en' ? { scheduled: 'Scheduled', called: 'Get ready', active: 'Live now', done: 'Finished' } : { scheduled: 'Zaplanowana', called: 'Przygotuj się', active: 'Trwa teraz', done: 'Zakończona' }
  return <span className={`status status-${status || 'scheduled'}`}>{label || labels[status] || status}</span>
}
