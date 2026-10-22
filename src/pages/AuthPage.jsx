import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand, LanguageSwitch } from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
import { cloudSyncConfigured } from '../lib/cloudSync'

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const { tr } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.password.length < 6) return setError(tr('Hasło musi mieć co najmniej 6 znaków.', 'Password must contain at least 6 characters.'))
    try {
      setBusy(true)
      const user = isRegister ? await register(form) : await login(form)
      navigate(user.role === 'organizer' ? '/organizator' : '/panel')
    } catch (err) {
      if (err?.code === 'EMAIL_CONFIRMATION_REQUIRED') setSuccess(tr('Konto zostało utworzone. Potwierdź adres e-mail, a następnie zaloguj się.', 'Account created. Confirm your e-mail address and then log in.'))
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-top">
        <Brand />
        <div className="auth-top-actions"><LanguageSwitch compact /><Link to="/">{tr('Wróć na stronę główną', 'Back to home')}</Link></div>
      </div>
      <div className="auth-card">
        <span className="eyebrow">{isRegister ? tr('Nowy klub', 'New club') : tr('Logowanie', 'Login')}</span>
        <h1>{isRegister ? tr('Zarejestruj klub', 'Register club') : tr('Logowanie', 'Login')}</h1>
        <p>{isRegister
          ? tr('Utwórz konto klubu. Po zalogowaniu dodasz zawodników i zgłosisz ich na zawody opublikowane przez IKA Poland.', 'Create a club account. After logging in you can add athletes and enter them into competitions published by IKA Poland.')
          : tr('Kluby i organizator logują się tym samym formularzem. Uprawnienia są rozpoznawane automatycznie przez konto Supabase.', 'Clubs and the organizer use the same login form. Permissions are recognized automatically by the Supabase account.')}</p>
        <form onSubmit={submit} className="form-stack">
          {isRegister && (
            <label>{tr('Imię i nazwisko właściciela konta', 'Account owner name')}<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder={tr('np. Jan Kowalski', 'e.g. John Smith')} /></label>
          )}
          <label>{tr('Adres e-mail', 'E-mail address')}<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="club@example.com" /></label>
          <label>{tr('Hasło', 'Password')}<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={tr('Minimum 6 znaków', 'Minimum 6 characters')} /></label>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button disabled={busy} className="btn btn-primary btn-wide">{busy ? tr('Proszę czekać…', 'Please wait…') : isRegister ? tr('Utwórz konto', 'Create account') : tr('Zaloguj się', 'Log in')}</button>
        </form>
        <div className="auth-switch">
          {isRegister
            ? <>{tr('Masz już konto?', 'Already have an account?')} <Link to="/logowanie">{tr('Zaloguj się', 'Log in')}</Link></>
            : <>{tr('Nie masz konta?', 'No account yet?')} <Link to="/rejestracja">{tr('Zarejestruj klub', 'Register club')}</Link></>}
        </div>
        {!isRegister && !cloudSyncConfigured && <div className="demo-box"><strong>{tr('Tryb lokalny - konto testowe organizatora', 'Local mode - organizer test account')}</strong><code>admin@ikapoland.demo</code><code>IKA12345</code></div>}
      </div>
    </div>
  )
}
