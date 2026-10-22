import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { LanguageSwitch, useLanguage } from '../lib/LanguageContext.jsx'
import CloudStatus from './CloudStatus.jsx'

export function Brand() {
  const { t } = useLanguage()
  return (
    <Link className="brand" to="/">
      <img className="brand-logo" src="/ika-poland-logo.jpg" alt="IKA Poland" />
      <span>
        <strong>IKA Poland</strong>
        <small>{t('systemName')}</small>
      </span>
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
        <NavLink to="/aktualnosci">{t('news')}</NavLink>
        <NavLink to="/rodzic">{t('athleteZone')}</NavLink>
        <NavLink to="/klasyfikacja">{t('rankingsLive')}</NavLink>
        <NavLink to="/telebim">{t('screen')}</NavLink>
        {user ? <NavLink to={user.role === 'organizer' ? '/organizator' : '/panel'}>{user.role === 'organizer' ? t('organizer') : t('clubEntries')}</NavLink> : <NavLink to="/logowanie">{t('loginClub')}</NavLink>}
      </nav>
      <LanguageSwitch compact />
    </header>
  )
}

export function ClubWebsiteLayout({ children, clubName = '', organizer = false }) {
  const { user, logout } = useAuth()
  const { t, pick } = useLanguage()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="club-site-shell">
      <header className="topbar club-site-topbar">
        <Brand />
        <nav className="club-site-nav" aria-label={pick('Strefa zgłoszeń klubu', 'Club registration area')}>
          <Link to="/">{t('home')}</Link>
          <a href="#club-active-tournaments">{t('events')}</a>
          <a href="#club-athletes">{t('athletes')}</a>
          <a href="#club-entries">{t('myEntries')}</a>
          {organizer && <Link to="/organizator">{t('organizer')}</Link>}
        </nav>
        <div className="club-site-account">
          <LanguageSwitch compact />
          <span>{clubName || user?.email || pick('Klub', 'Club')}</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onLogout}>{t('logout')}</button>
        </div>
      </header>
      <main className="club-site-main">{children}</main>
      <footer className="club-site-footer">{pick('IKA Poland - strona zgłoszeń klubów i zawodników na zawody', 'IKA Poland - club and athlete competition registration')}</footer>
    </div>
  )
}

export function DashboardLayout({ title, children, organizer = false, showHeadingActions = true }) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
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
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>{t('logout')}</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{organizer ? t('organizerPanel') : t('clubPanel')}</span>
            <h1>{title}</h1>
          </div>
          {showHeadingActions && <div className="heading-actions">
            <Link className="btn btn-outline" to="/rodzic">{t('athletePreview')}</Link>
            <Link className="btn btn-outline" to="/klasyfikacja">{t('rankingsLive')}</Link>
            {organizer && <Link className="btn btn-outline" to="/telebim" target="_blank">{t('openScreen')}</Link>}
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
  const { t } = useLanguage()
  const labels = {
    scheduled: t('scheduled'),
    called: t('called'),
    active: t('active'),
    done: t('done'),
  }
  return <span className={`status status-${status || 'scheduled'}`}>{label || labels[status] || status}</span>
}
