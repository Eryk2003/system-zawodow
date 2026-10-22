import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { cloudSyncConfigured } from '../lib/cloudSync'

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
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
    if (form.password.length < 6) return setError('Hasło musi mieć co najmniej 6 znaków.')
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
      <div className="auth-top"><Brand /><Link to="/">Wróć na stronę główną</Link></div>
      <div className="auth-card">
        <span className="eyebrow">{isRegister ? 'Nowy klub' : 'Logowanie'}</span>
        <h1>{isRegister ? 'Zarejestruj klub' : 'Logowanie'}</h1>
        <p>{isRegister ? 'Utwórz konto klubu. Po zalogowaniu dodasz zawodników i zgłosisz ich na zawody opublikowane przez IKA Poland.' : 'Kluby i organizator logują się tym samym formularzem. Uprawnienia są rozpoznawane automatycznie przez konto Supabase.'}</p>
        <form onSubmit={submit} className="form-stack">
          {isRegister && (
            <label>Imię i nazwisko właściciela konta<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="np. Jan Kowalski" /></label>
          )}
          <label>Adres e-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="klub@example.pl" /></label>
          <label>Hasło<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 znaków" /></label>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button disabled={busy} className="btn btn-primary btn-wide">{busy ? 'Proszę czekać…' : isRegister ? 'Utwórz konto' : 'Zaloguj się'}</button>
        </form>
        <div className="auth-switch">
          {isRegister ? <>Masz już konto? <Link to="/logowanie">Zaloguj się</Link></> : <>Nie masz konta? <Link to="/rejestracja">Zarejestruj klub</Link></>}
        </div>
        {!isRegister && !cloudSyncConfigured && <div className="demo-box"><strong>Tryb lokalny - konto testowe organizatora</strong><code>admin@ikapoland.demo</code><code>IKA12345</code></div>}
      </div>
    </div>
  )
}
