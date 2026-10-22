import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { LanguageSwitch, useLanguage } from '../lib/LanguageContext.jsx'
import { useAuth } from '../lib/AuthContext'
import { cloudSyncConfigured } from '../lib/cloudSync'

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const { pick } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.password.length < 6) return setError(pick('Hasło musi mieć co najmniej 6 znaków.', 'Password must contain at least 6 characters.'))
    try {
      setBusy(true)
      const user = isRegister ? await register(form) : await login(form)
      navigate(user.role === 'organizer' ? '/organizator' : '/panel')
    } catch (err) {
      if (err?.code === 'EMAIL_CONFIRMATION_REQUIRED') setSuccess(pick('Konto zostało utworzone. Potwierdź adres e-mail, a następnie zaloguj się.', 'Account created. Confirm your email address, then log in.'))
      else if (err?.code === 'ACCOUNT_DISABLED') setError(pick('To konto klubu zostało usunięte lub zablokowane przez organizatora.', 'This club account has been removed or disabled by the organizer.'))
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-top"><Brand /><div className="auth-top-actions"><LanguageSwitch /><Link to="/">{pick('Wróć na stronę główną', 'Back to home')}</Link></div></div>
      <div className="auth-card">
        <span className="eyebrow">{isRegister ? pick('Nowy klub', 'New club') : pick('Logowanie', 'Login')}</span>
        <h1>{isRegister ? pick('Zarejestruj klub', 'Register club') : pick('Logowanie', 'Login')}</h1>
        <p>{isRegister
          ? pick('Utwórz konto klubu. Po zalogowaniu dodasz zawodników i zgłosisz ich na zawody opublikowane przez IKA Poland.', 'Create a club account. After logging in you can add athletes and enter them into IKA Poland events.')
          : pick('Kluby i organizator logują się tym samym formularzem. Uprawnienia są rozpoznawane automatycznie.', 'Clubs and the organizer use the same login form. Permissions are recognized automatically.')}</p>
        <form onSubmit={submit} className="form-stack">
          {isRegister && <label>{pick('Imię i nazwisko właściciela konta', 'Account owner name')}<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder={pick('np. Jan Kowalski', 'e.g. John Smith')} /></label>}
          <label>{pick('Adres e-mail', 'Email address')}<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="club@example.com" /></label>
          <label>{pick('Hasło', 'Password')}<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={pick('Minimum 6 znaków', 'Minimum 6 characters')} /></label>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button disabled={busy} className="btn btn-primary btn-wide">{busy ? pick('Proszę czekać…', 'Please wait…') : isRegister ? pick('Utwórz konto', 'Create account') : pick('Zaloguj się', 'Log in')}</button>
        </form>
        <div className="auth-switch">
          {isRegister ? <>{pick('Masz już konto?', 'Already have an account?')} <Link to="/logowanie">{pick('Zaloguj się', 'Log in')}</Link></> : <>{pick('Nie masz konta?', 'No account yet?')} <Link to="/rejestracja">{pick('Zarejestruj klub', 'Register club')}</Link></>}
        </div>
        {!isRegister && !cloudSyncConfigured && <div className="demo-box"><strong>{pick('Tryb lokalny - konto testowe organizatora', 'Local mode - organizer test account')}</strong><code>admin@ikapoland.demo</code><code>IKA12345</code></div>}
      </div>
    </div>
  )
}
