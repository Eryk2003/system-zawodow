import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { useAuth } from '../lib/AuthContext'
import { db } from '../lib/demoStore'

const emptyAthlete = {
  firstName: '', lastName: '', birthDate: '', gender: '', grade: '', parentName: '', parentEmail: '', photo: '',
}

function ClubSetup({ user, onCreated }) {
  const [form, setForm] = useState({ name: '', shortName: '', city: '', country: 'Polska', phone: '', email: user.email })
  const submit = (e) => {
    e.preventDefault()
    const saved = db.saveClub({ ...form, ownerId: user.id })
    onCreated(saved)
  }
  return (
    <div className="setup-card">
      <span className="eyebrow">Pierwsze uruchomienie</span>
      <h2>Utwórz profil klubu</h2>
      <p>Ten krok wykonujesz tylko raz. Później w panelu dodasz zawodników i ich zdjęcia.</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">Pełna nazwa klubu<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="np. Klub Karate ..." /></label>
        <label>Skrócona nazwa<input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="np. KKA" /></label>
        <label>Miasto<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>E-mail klubu<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <button className="btn btn-primary span-2">Utwórz klub</button>
      </form>
    </div>
  )
}

function AthleteForm({ clubId, initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || emptyAthlete)
  const [photoError, setPhotoError] = useState('')

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      setPhotoError('Zdjęcie może mieć maksymalnie 1,5 MB w tej wersji.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, photo: reader.result }))
    reader.readAsDataURL(file)
  }

  const submit = (e) => {
    e.preventDefault()
    const saved = db.saveAthlete({ ...form, clubId })
    onSaved(saved)
  }

  return (
    <form className="form-grid athlete-form" onSubmit={submit}>
      <div className="span-2 photo-picker-row">
        <AthleteAvatar athlete={form} large />
        <label className="photo-picker">Zdjęcie zawodnika<input type="file" accept="image/*" onChange={onPhoto} /><small>JPG/PNG, maks. 1,5 MB.</small></label>
      </div>
      {photoError && <div className="alert alert-error span-2">{photoError}</div>}
      <label>Imię<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
      <label>Nazwisko<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
      <label>Data urodzenia<input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></label>
      <label>Płeć<select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Wybierz</option><option value="K">Kobieta</option><option value="M">Mężczyzna</option></select></label>
      <label>Stopień / kyu<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="np. 6 kyu" /></label>
      <label>Imię i nazwisko rodzica / opiekuna<input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></label>
      <label className="span-2">E-mail rodzica / opiekuna<input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} /></label>
      <div className="form-actions span-2"><button type="button" className="btn btn-ghost" onClick={onCancel}>Anuluj</button><button className="btn btn-primary">Zapisz zawodnika</button></div>
    </form>
  )
}

export default function ClubPanel() {
  const { user } = useAuth()
  const organizerMode = user.role === 'organizer'
  const [club, setClub] = useState(() => db.getClubForOwner(user.id))
  const [athletes, setAthletes] = useState(() => club ? db.getAthletesForClub(club.id) : [])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [visibleTournament, setVisibleTournament] = useState(() => db.getVisibleTournamentForClubs())
  const entries = db.getEntries()
  const comps = db.getCompetitions()
  const tournamentCategories = db.getTournamentCategories()

  const clubEntries = useMemo(() => {
    const ids = new Set(athletes.map((a) => a.id))
    return entries.filter((e) => ids.has(e.athleteId))
  }, [athletes, entries])

  const refreshAthletes = () => setAthletes(db.getAthletesForClub(club.id))

  useEffect(() => {
    const refreshTournament = () => setVisibleTournament(db.getVisibleTournamentForClubs())
    window.addEventListener('ika:data', refreshTournament)
    window.addEventListener('storage', refreshTournament)
    return () => {
      window.removeEventListener('ika:data', refreshTournament)
      window.removeEventListener('storage', refreshTournament)
    }
  }, [])

  const visibleCompetitionNames = useMemo(() => {
    if (!visibleTournament) return []
    if (tournamentCategories.length) {
      return tournamentCategories.map((category) => {
        const competition = comps.find((item) => item.id === category.competitionId)
        return `${competition?.name || 'Konkurencja'} — ${category.name}`
      })
    }
    const selected = new Set(visibleTournament.competitionIds || [])
    return comps.filter((competition) => selected.has(competition.id)).map((competition) => competition.name)
  }, [visibleTournament, comps, tournamentCategories])

  if (!club) {
    return <DashboardLayout title="Twój klub" organizer={organizerMode}><ClubSetup user={user} onCreated={(saved) => { setClub(saved); setAthletes([]) }} /></DashboardLayout>
  }

  return (
    <DashboardLayout title={club.name} organizer={organizerMode}>
      {organizerMode && <div className="organizer-club-note"><div><strong>Twój klub organizatora</strong><span>Zawodnicy z tej bazy będą jedynymi zawodnikami widocznymi dla Ciebie podczas zgłaszania do tworzonych zawodów.</span></div><Link className="btn btn-outline btn-sm" to="/organizator">Wróć do organizatora</Link></div>}

      {visibleTournament && (
        <section className="club-tournament-card" aria-label="Dostępne zawody IKA Poland">
          <div className="club-tournament-card-head">
            <div>
              <span className="eyebrow">Nowe zawody IKA Poland</span>
              <h2>{visibleTournament.name}</h2>
              <p>
                {visibleTournament.date || 'Data do ustalenia'}
                {visibleTournament.startTime ? ` • start ${visibleTournament.startTime}` : ''}
                {visibleTournament.venue ? ` • ${visibleTournament.venue}` : ''}
              </p>
            </div>
            <span className="club-tournament-live">Dostępne dla klubów</span>
          </div>

          <div className="club-tournament-meta">
            <div><small>Liczba tatami</small><strong>{visibleTournament.matCount || '—'}</strong></div>
            <div><small>Czas walki</small><strong>{visibleTournament.boutSeconds ? `${visibleTournament.boutSeconds} sek.` : '—'}</strong></div>
            <div><small>Status</small><strong>Przygotowanie</strong></div>
          </div>

          <div className="club-tournament-competitions">
            <small>Kategorie zawodów</small>
            <div className="club-tournament-chips">
              {visibleCompetitionNames.length ? visibleCompetitionNames.map((name) => <span key={name}>{name}</span>) : <span>Kategorie zostaną dodane przez organizatora</span>}
            </div>
          </div>
        </section>
      )}

      <div className="stats-grid">
        <div className="stat-card"><span>Zawodnicy</span><strong>{athletes.length}</strong><small>dodani do klubu</small></div>
        <div className="stat-card"><span>Zgłoszenia</span><strong>{clubEntries.length}</strong><small>przypisane przez organizatora</small></div>
        <div className="stat-card"><span>Miasto</span><strong className="stat-text">{club.city}</strong><small>{club.shortName || 'IKA Poland'}</small></div>
      </div>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Baza klubu</span><h2>Zawodnicy</h2></div><button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ Dodaj zawodnika</button></div>
        {showForm && <div className="form-card"><AthleteForm clubId={club.id} initial={editing || emptyAthlete} onCancel={() => { setShowForm(false); setEditing(null) }} onSaved={() => { refreshAthletes(); setShowForm(false); setEditing(null) }} /></div>}
        {!athletes.length ? (
          <EmptyState title="Brak zawodników" text="Dodaj pierwszego zawodnika wraz z podstawowymi danymi i zdjęciem do telebimu." />
        ) : (
          <div className="table-wrap"><table><thead><tr><th>Zawodnik</th><th>Data urodzenia</th><th>Stopień</th><th>Rodzic / opiekun</th><th></th></tr></thead><tbody>
            {athletes.map((athlete) => <tr key={athlete.id}><td><div className="athlete-cell"><AthleteAvatar athlete={athlete} /><div><strong>{athlete.firstName} {athlete.lastName}</strong><small>{athlete.gender === 'K' ? 'Kobieta' : athlete.gender === 'M' ? 'Mężczyzna' : '—'}</small></div></div></td><td>{athlete.birthDate || '—'}</td><td>{athlete.grade || '—'}</td><td><strong>{athlete.parentName || '—'}</strong><small className="block-small">{athlete.parentEmail || ''}</small></td><td className="actions-cell"><button className="link-btn" onClick={() => { setEditing(athlete); setShowForm(true) }}>Edytuj</button><button className="link-btn danger" onClick={() => { if (confirm('Usunąć zawodnika?')) { db.deleteAthlete(athlete.id); refreshAthletes() } }}>Usuń</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Zawody</span><h2>Konkurencje Twoich zawodników</h2></div></div>
        {!clubEntries.length ? <EmptyState title="Brak przypisanych konkurencji" text="Po zgłoszeniu i ułożeniu harmonogramu przez organizatora zobaczysz tutaj starty zawodników." /> : (
          <div className="table-wrap"><table><thead><tr><th>Zawodnik</th><th>Konkurencja</th><th>Kategoria</th><th>Tatami</th><th>Orientacyjnie</th><th>Status</th></tr></thead><tbody>
            {clubEntries.map((entry) => { const athlete = athletes.find((a) => a.id === entry.athleteId); const comp = comps.find((c) => c.id === entry.competitionId); return <tr key={entry.id}><td>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '—'}</td><td>{comp?.name || '—'}</td><td>{entry.category || '—'}</td><td>{entry.mat || '—'}</td><td><strong>{entry.estimatedStart || '—'}</strong></td><td><StatusBadge status={entry.status} /></td></tr> })}
          </tbody></table></div>
        )}
      </section>
    </DashboardLayout>
  )
}
