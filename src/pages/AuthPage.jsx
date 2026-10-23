import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { LanguageSwitch, useLanguage } from '../lib/I18nContext.jsx'

export default function AuthPage({ mode = 'login' }) {
  const organizerOnly = mode === 'organizer'
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (form.password.length < 6) return setError(language === 'en' ? 'Password must have at least 6 characters.' : 'Hasło musi mieć co najmniej 6 znaków.')
    try {
      setBusy(true)
      const user = isRegister ? await register(form) : await login(form)
      if (organizerOnly && user.role !== 'organizer') {
        setError(language === 'en' ? 'This account does not have organizer permissions.' : 'To konto nie ma uprawnień organizatora.')
        return
      }
      navigate(user.role === 'organizer' ? '/organizator' : '/panel')
    } catch (err) {
      if (err?.code === 'EMAIL_CONFIRMATION_REQUIRED') setSuccess(err.message)
      else setError(err.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-top"><Brand /><div className="auth-top-actions"><LanguageSwitch /><Link to="/">{t.backHome}</Link></div></div>
      <div className="auth-card">
        <span className="eyebrow">{organizerOnly ? (language === 'en' ? 'Organizer zone' : 'Strefa organizatora') : isRegister ? (language === 'en' ? 'New club' : 'Nowy klub') : t.login}</span>
        <h1>{organizerOnly ? (language === 'en' ? 'Organizer login' : 'Logowanie organizatora') : isRegister ? t.registerClub : t.login}</h1>
        <p>{organizerOnly ? (language === 'en' ? 'Sign in with your IKA Poland organizer account.' : 'Zaloguj się na konto organizatora IKA Poland.') : isRegister ? (language === 'en' ? 'Create a club account. After signing in you can add athletes and enter them into IKA Poland events.' : 'Utwórz konto klubu. Po zalogowaniu dodasz zawodników i zgłosisz ich na zawody opublikowane przez IKA Poland.') : (language === 'en' ? 'Sign in to manage your club and competition registrations.' : 'Zaloguj się, aby zarządzać klubem i zgłoszeniami na zawody.')}</p>
        <form onSubmit={submit} className="form-stack">
          {isRegister && <label>{t.ownerName}<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="np. Jan Kowalski" /></label>}
          <label>{t.email}<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={organizerOnly ? "organizator@example.pl" : "klub@example.pl"} /></label>
          <label>{t.password}<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={language === 'en' ? 'Minimum 6 characters' : 'Minimum 6 znaków'} /></label>
          {error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
          <button disabled={busy} className="btn btn-primary btn-wide">{busy ? (language === 'en' ? 'Please wait…' : 'Proszę czekać…') : isRegister ? t.createAccount : t.signIn}</button>
        </form>
        <div className="auth-switch">{organizerOnly ? <Link to="/logowanie">{language === 'en' ? 'Club login' : 'Logowanie klubu'}</Link> : isRegister ? <>{t.haveAccount} <Link to="/logowanie">{t.signIn}</Link></> : <>{t.noAccount} <Link to="/rejestracja">{t.registerClub}</Link></>}</div>
      </div>
    </div>
  )
}
