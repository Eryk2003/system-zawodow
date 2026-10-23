import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/cloudSync'
import { useAuth } from '../lib/AuthContext'

/** The backend decides who is the principal administrator. Never trust client claims. */
export default function OrganizerRoleManager() {
  const { user } = useAuth()
  const [authorized, setAuthorized] = useState(false)
  const [diagnostic, setDiagnostic] = useState('')
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reload = useCallback(async () => {
    if (!supabase) { setDiagnostic('Brak połączenia z systemem kont. Sprawdź konfigurację Vercel.'); setLoading(false); return }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData?.session?.user) { setDiagnostic('Brak aktywnej sesji Supabase. Wyloguj się i zaloguj ponownie przez Logowanie organizatora.'); setAuthorized(false); setLoading(false); return }
    const { data, error: requestError } = await supabase.rpc('ika_list_organizer_accounts')
    if (requestError) {
      setAuthorized(false)
      const message = requestError.message || ''
      setDiagnostic(/not authorized|permission denied|not allowed|insufficient privilege/i.test(message)
        ? 'To konto nie ma potwierdzonych uprawnień głównego administratora w Supabase. Sprawdź, czy UID zalogowanego konta odpowiada wpisowi w ika_primary_admins.'
        : 'Nie udało się odczytać uprawnień z bazy (' + (requestError.code || 'RPC') + '). Sprawdź funkcję ika_list_organizer_accounts oraz sesję logowania.')
    } else {
      setAuthorized(true)
      setAccounts(Array.isArray(data) ? data : [])
      setError('')
      setDiagnostic('')
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload().catch(() => setLoading(false)) }, [reload])

  const changeRole = async (targetEmail, grant) => {
    const action = grant ? 'nadać' : 'odebrać'
    if (!window.confirm(`Czy na pewno ${action} rolę ORGANIZATOR dla ${targetEmail}?`)) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const { error: requestError } = await supabase.rpc('ika_set_organizer_role', {
        target_email: targetEmail.trim(), make_organizer: grant,
      })
      if (requestError) throw requestError
      setSuccess(grant ? 'Nadano rolę organizatora.' : 'Odebrano rolę organizatora.')
      setEmail('')
      await reload()
    } catch (e) { setError(e.message || 'Nie udało się zmienić uprawnień.') }
    finally { setBusy(false) }
  }

  if (loading) return null
  if (!authorized) {
    if (user?.role !== 'organizer') return null
    return <section className="panel-section" aria-label="Stan uprawnień organizatorów">
      <div className="panel-section-head"><div><span className="eyebrow">Diagnostyka dostępu</span><h2>Uprawnienia organizatorów</h2></div></div>
      <p role="status">{diagnostic || 'Nie udało się potwierdzić uprawnień. Zaloguj się ponownie.'}</p>
      <button className="btn" type="button" onClick={reload}>Sprawdź ponownie</button>
    </section>
  }
  return (
    <section className="panel-section organizer-club-management" aria-label="Zarządzanie organizatorami">
      <div className="panel-section-head"><div>
        <span className="eyebrow">Tylko główny administrator</span>
        <h2>Uprawnienia organizatorów</h2>
        <p>Nadaj lub odbierz rolę kontu, które już istnieje. Zmiany są chronione po stronie serwera.</p>
      </div></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}
      <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) changeRole(email, true) }}
        style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
        <input type="email" aria-label="Adres e-mail konta" placeholder="E-mail istniejącego użytkownika"
          required value={email} onChange={(e) => setEmail(e.target.value)}
          style={{flex:'1 1 260px',padding:12,border:'1px solid #ccc',borderRadius:9}} />
        <button className="btn btn-primary" type="submit" disabled={busy}>Nadaj rolę organizatora</button>
      </form>
      <div className="organizer-club-list">
        {accounts.map((account) => <article key={account.user_id}>
          <div><strong>{account.email}</strong><span>{account.full_name || 'Bez nazwy'}</span>
            <small>{account.is_primary_admin ? 'GŁÓWNY ADMINISTRATOR' : 'ORGANIZATOR'}</small></div>
          {account.is_primary_admin
            ? <span className="status status-active">Konto chronione</span>
            : <button type="button" disabled={busy} className="btn btn-danger btn-sm"
                onClick={() => changeRole(account.email, false)}>Odbierz rolę</button>}
        </article>)}
      </div>
    </section>
  )
}
