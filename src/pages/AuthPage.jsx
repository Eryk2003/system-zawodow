import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { useAuth, TEMP_ORGANIZER_EMAIL, TEMP_ORGANIZER_PASSWORD, isTemporaryOrganizerAvailable } from '../lib/AuthContext'
import { LanguageSwitch, useLanguage } from '../lib/I18nContext.jsx'

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const tempAvailable = !isRegister && isTemporaryOrganizerAvailable()

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (form.password.length < 6) return setError(language === 'en' ? 'Password must have at least 6 characters.' : 'Hasło musi mieć co najmniej 6 znaków.')
    try {
      setBusy(true)
      const user = isRegister ? await register(form) : await login(form)
      navigate(user.role === 'organizer' ? '/organizator' : '/panel')
    } catch (err) {
      if (err?.code === 'EMAIL_CONFIRMATION_REQUIRED') setSuccess(err.message)
      else setError(err.message)
    } finally { setBusy(false) }
  }

  const fillTest = () => setForm((prev) => ({ ...prev, email: TEMP_ORGANIZER_EMAIL, password: TEMP_ORGANIZER_PASSWORD }))

  return (
    <div className="auth-page">
      <div className="auth-top"><Brand /><div className="auth-top-actions"><LanguageSwitch /><Link to="/">{t.backHome}</Link></div></div>
      <div className="auth-card">
        <span className="eyebrow">{isRegister ? (language === 'en' ? 'New club' : 'Nowy klub') : t.login}</span>
        <h1>{isRegister ? t.registerClub : t.login}</h1>
        <p>{isRegister ? (language === 'en' ? 'Create a club account. After signing in you can add athletes and enter them into IKA Poland events.' : 'Utwórz konto klubu. Po zalogowaniu dodasz zawodników i zgłosisz ich na zawody opublikowane przez IKA Poland.') : (language === 'en' ? 'Clubs and the organizer use the same login form. Account permissions are detected automatically.' : 'Kluby i organizator logują się tym samym formularzem. Uprawnienia są rozpoznawane automatycznie.')}</p>
        <form onSubmit={submit} className="form-stack">
          {isRegister && <label>{t.ownerName}<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="np. Jan Kowalski" /></label>}
          <label>{t.email}<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="klub@example.pl" /></label>
          <label>{t.password}<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={language === 'en' ? 'Minimum 6 characters' : 'Minimum 6 znaków'} /></label>
          {error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
          <button disabled={busy} className="btn btn-primary btn-wide">{busy ? (language === 'en' ? 'Please wait…' : 'Proszę czekać…') : isRegister ? t.createAccount : t.signIn}</button>
        </form>
        <div className="auth-switch">{organizerOnly ? <Link to="/logowanie">{language === 'en' ? 'Club login' : 'Logowanie klubu'}</Link> : isRegister ? <>{t.haveAccount} <Link to="/logowanie">{t.signIn}</Link></> : <>{t.noAccount} <Link to="/rejestracja">{t.registerClub}</Link></>}</div>
        {tempAvailable && <div className="demo-box temporary-demo-box"><strong>TESTOWY ORGANIZATOR — ważny do 23.10.2026, 23:59</strong><code>{TEMP_ORGANIZER_EMAIL}</code><code>{TEMP_ORGANIZER_PASSWORD}</code><button type="button" className="btn btn-outline btn-sm" onClick={fillTest}>Wstaw dane testowe</button><small>Tryb testowy służy do sprawdzania panelu. Docelowe konto organizatora będzie kontem Supabase.</small></div>}
      </div>
    </div>
  )
}
