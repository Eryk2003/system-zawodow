import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand, LanguageToggle } from '../components/Layout'
import { useLanguage } from '../lib/i18n.js'
import { useAuth } from '../lib/AuthContext'
import { cloudSyncConfigured } from '../lib/cloudSync'

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const { language, t } = useLanguage()
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.password.length < 6) return setError(language === 'en' ? 'Password must contain at least 6 characters.' : 'Hasło musi mieć co najmniej 6 znaków.')
    try {
      setBusy(true)
      const user = isRegister ? await register(form) : await login(form)
      navigate(user.role === 'organizer' ? '/organizator' : '/panel')
    } catch (err) {
      if (err?.code === 'EMAIL_CONFIRMATION_REQUIRED') setSuccess(err.message)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-top"><Brand /><div className="auth-top-actions"><LanguageToggle /><Link to="/">{t('backHome')}</Link></div></div>
      <div className="auth-card">
        <span className="eyebrow">{isRegister ? t('newClub') : t('loginHeading')}</span>
        <h1>{isRegister ? t('registerHeading') : t('loginHeading')}</h1>
        <p>{isRegister ? t('registerDesc') : t('loginDesc')}</p>
        <form onSubmit={submit} className="form-stack">
          {isRegister && (
            <label>{t('fullName')}<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder={language === 'en' ? 'e.g. John Smith' : 'np. Jan Kowalski'} /></label>
          )}
          <label>{t('email')}<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="klub@example.pl" /></label>
          <label>{t('password')}<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('minPassword')} /></label>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button disabled={busy} className="btn btn-primary btn-wide">{busy ? t('wait') : isRegister ? t('createAccount') : t('loginAction')}</button>
        </form>
        <div className="auth-switch">
          {isRegister ? <>{t('haveAccount')} <Link to="/logowanie">{t('loginAction')}</Link></> : <>{t('noAccount')} <Link to="/rejestracja">{t('registerClub')}</Link></>}
        </div>
        {!isRegister && !cloudSyncConfigured && <div className="demo-box"><strong>Tryb lokalny - konto testowe organizatora</strong><code>admin@ikapoland.demo</code><code>IKA12345</code></div>}
      </div>
    </div>
  )
}
