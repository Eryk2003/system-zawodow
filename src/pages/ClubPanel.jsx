import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { useAuth } from '../lib/AuthContext'
import { db } from '../lib/demoStore'

const emptyAthlete = {
  firstName: '', lastName: '', birthDate: '', gender: '', grade: '', parentName: '', parentEmail: '', photo: '',
}

const normalize = (value) => String(value || '').trim().toLocaleLowerCase('pl')

function ageOnDate(birthDate, eventDate) {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T12:00:00`)
  const event = eventDate ? new Date(`${eventDate}T12:00:00`) : new Date()
  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) return null
  let age = event.getFullYear() - birth.getFullYear()
  const monthDiff = event.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && event.getDate() < birth.getDate())) age -= 1
  return age
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
      <p>Ten krok wykonujesz tylko raz. Później w panelu dodasz zawodników i zgłosisz ich na zawody.</p>
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
  const [athleteSearch, setAthleteSearch] = useState('')
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [dataTick, setDataTick] = useState(0)

  const entries = useMemo(() => db.getEntries(), [dataTick])
  const comps = useMemo(() => db.getCompetitions(), [dataTick])
  const tournamentCategories = useMemo(() => db.getTournamentCategories(), [dataTick])

  const clubEntries = useMemo(() => {
    const ids = new Set(athletes.map((a) => a.id))
    return entries.filter((e) => ids.has(e.athleteId))
  }, [athletes, entries])

  const refreshAthletes = () => {
    if (!club) return
    setAthletes(db.getAthletesForClub(club.id))
    setDataTick((value) => value + 1)
  }

  useEffect(() => {
    const refreshAll = () => {
      setVisibleTournament(db.getVisibleTournamentForClubs())
      if (club) setAthletes(db.getAthletesForClub(club.id))
      setDataTick((value) => value + 1)
    }
    window.addEventListener('ika:data', refreshAll)
    window.addEventListener('storage', refreshAll)
    window.addEventListener('ika:cloud', refreshAll)
    return () => {
      window.removeEventListener('ika:data', refreshAll)
      window.removeEventListener('storage', refreshAll)
      window.removeEventListener('ika:cloud', refreshAll)
    }
  }, [club?.id])

  const visibleCompetitionNames = useMemo(() => {
    if (!visibleTournament) return []
    if (tournamentCategories.length) {
      return tournamentCategories.map((category) => {
        const competition = comps.find((item) => item.id === category.competitionId)
        return `${competition?.name || 'Konkurencja'} - ${category.name}`
      })
    }
    const selected = new Set(visibleTournament.competitionIds || [])
    return comps.filter((competition) => selected.has(competition.id)).map((competition) => competition.name)
  }, [visibleTournament, comps, tournamentCategories])

  const searchedAthletes = useMemo(() => {
    const query = normalize(athleteSearch)
    if (!query) return athletes
    return athletes.filter((athlete) => normalize([
      athlete.firstName,
      athlete.lastName,
      `${athlete.firstName} ${athlete.lastName}`,
      athlete.birthDate,
      athlete.grade,
      athlete.parentName,
    ].filter(Boolean).join(' ')).includes(query))
  }, [athletes, athleteSearch])

  const categoryEntries = (category) => entries.filter((entry) => (
    entry.categoryId === category.id || (entry.competitionId === category.competitionId && entry.category === category.name)
  ))

  const isEligibleForCategory = (athlete, category) => {
    const competition = comps.find((item) => item.id === category.competitionId)
    const age = ageOnDate(athlete.birthDate, visibleTournament?.date)
    const maxAge = category.maxAge ?? competition?.maxAge ?? null
    if (category.gender && athlete.gender !== category.gender) return false
    if (category.minAge != null && (age == null || age < Number(category.minAge))) return false
    if (maxAge != null && (age == null || age > Number(maxAge))) return false
    return true
  }

  const athleteIsRegistered = (athleteId, category) => categoryEntries(category).some((entry) => entry.athleteId === athleteId)

  const toggleTournamentRegistration = (athlete, category) => {
    if (!club || !visibleTournament) return
    const ownAthleteIds = new Set(athletes.map((item) => item.id))
    const currentlyRegistered = categoryEntries(category)
      .filter((entry) => ownAthleteIds.has(entry.athleteId))
      .map((entry) => entry.athleteId)
    const next = new Set(currentlyRegistered)
    const wasRegistered = next.has(athlete.id)
    if (wasRegistered) next.delete(athlete.id)
    else next.add(athlete.id)
    db.setCategoryAthletesForClub(category.id, club.id, [...next])
    setRegistrationMessage(
      wasRegistered
        ? `Usunięto zgłoszenie: ${athlete.firstName} ${athlete.lastName} - ${category.name}.`
        : `Zgłoszono: ${athlete.firstName} ${athlete.lastName} - ${category.name}.`,
    )
    setDataTick((value) => value + 1)
  }

  if (!club) {
    return <DashboardLayout title="Twój klub" organizer={organizerMode}><ClubSetup user={user} onCreated={(saved) => { setClub(saved); setAthletes([]) }} /></DashboardLayout>
  }

  return (
    <DashboardLayout title={club.name} organizer={organizerMode}>
      {organizerMode && <div className="organizer-club-note"><div><strong>Twój klub organizatora</strong><span>Organizator może równocześnie prowadzić swój klub i zgłaszać własnych zawodników na zawody.</span></div><Link className="btn btn-outline btn-sm" to="/organizator">Wróć do organizatora</Link></div>}

      {visibleTournament && (
        <section className="club-tournament-card" aria-label="Dostępne zawody IKA Poland">
          <div className="club-tournament-card-head">
            <div>
              <span className="eyebrow">Zawody otwarte do zgłoszeń</span>
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
            <div><small>Liczba tatami</small><strong>{visibleTournament.matCount || '-'}</strong></div>
            <div><small>Czas walki</small><strong>{visibleTournament.boutSeconds ? `${visibleTournament.boutSeconds} sek.` : '-'}</strong></div>
            <div><small>Twoje zgłoszenia</small><strong>{clubEntries.length}</strong></div>
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
        <div className="stat-card"><span>Zgłoszenia</span><strong>{clubEntries.length}</strong><small>na aktualne zawody</small></div>
        <div className="stat-card"><span>Miasto</span><strong className="stat-text">{club.city}</strong><small>{club.shortName || 'IKA Poland'}</small></div>
      </div>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Baza klubu</span><h2>Zawodnicy</h2></div><button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ Dodaj zawodnika</button></div>
        {showForm && <div className="form-card"><AthleteForm clubId={club.id} initial={editing || emptyAthlete} onCancel={() => { setShowForm(false); setEditing(null) }} onSaved={() => { refreshAthletes(); setShowForm(false); setEditing(null) }} /></div>}
        {!athletes.length ? (
          <EmptyState title="Brak zawodników" text="Dodaj pierwszego zawodnika wraz z podstawowymi danymi i zdjęciem do telebimu." />
        ) : (
          <div className="table-wrap"><table><thead><tr><th>Zawodnik</th><th>Data urodzenia</th><th>Stopień</th><th>Rodzic / opiekun</th><th></th></tr></thead><tbody>
            {athletes.map((athlete) => <tr key={athlete.id}><td><div className="athlete-cell"><AthleteAvatar athlete={athlete} /><div><strong>{athlete.firstName} {athlete.lastName}</strong><small>{athlete.gender === 'K' ? 'Kobieta' : athlete.gender === 'M' ? 'Mężczyzna' : '-'}</small></div></div></td><td>{athlete.birthDate || '-'}</td><td>{athlete.grade || '-'}</td><td><strong>{athlete.parentName || '-'}</strong><small className="block-small">{athlete.parentEmail || ''}</small></td><td className="actions-cell"><button className="link-btn" onClick={() => { setEditing(athlete); setShowForm(true) }}>Edytuj</button><button className="link-btn danger" onClick={() => { if (confirm('Usunąć zawodnika?')) { db.deleteAthlete(athlete.id); refreshAthletes() } }}>Usuń</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel-section club-registration-section">
        <div className="panel-section-head">
          <div>
            <span className="eyebrow">Zgłoszenia na zawody</span>
            <h2>Wyszukaj zawodnika i zgłoś go do konkurencji</h2>
            <p>System pokazuje tylko pasujące kategorie według płci i wieku zawodnika. Przy każdej kategorii widzisz aktualną liczbę wszystkich zgłoszonych.</p>
          </div>
        </div>

        {!visibleTournament ? (
          <EmptyState title="Brak otwartych zawodów" text="Kiedy organizator utworzy zawody, pojawią się tutaj automatycznie." />
        ) : !tournamentCategories.length ? (
          <EmptyState title="Organizator nie dodał jeszcze kategorii" text="Po dodaniu kategorii będziesz mógł od razu zgłaszać swoich zawodników." />
        ) : !athletes.length ? (
          <EmptyState title="Najpierw dodaj zawodników" text="Dodaj zawodnika do bazy klubu, a następnie wyszukaj go tutaj i wybierz konkurencję." />
        ) : (
          <>
            <div className="club-athlete-search-wrap">
              <label>
                <span>Wyszukaj po danych zawodnika</span>
                <input
                  type="search"
                  value={athleteSearch}
                  onChange={(event) => setAthleteSearch(event.target.value)}
                  placeholder="Imię, nazwisko, data urodzenia lub stopień..."
                />
              </label>
              <div className="club-search-count"><strong>{searchedAthletes.length}</strong><span>znalezionych</span></div>
            </div>

            {registrationMessage && <div className="alert alert-success">{registrationMessage}</div>}

            {!searchedAthletes.length ? (
              <div className="empty-state compact"><h3>Nie znaleziono zawodnika</h3><p>Sprawdź wpisane dane albo dodaj zawodnika do bazy klubu.</p></div>
            ) : (
              <div className="club-registration-athletes">
                {searchedAthletes.map((athlete) => {
                  const eligible = tournamentCategories.filter((category) => isEligibleForCategory(athlete, category))
                  const age = ageOnDate(athlete.birthDate, visibleTournament.date)
                  return (
                    <article className="club-registration-athlete" key={athlete.id}>
                      <div className="club-registration-athlete-head">
                        <div className="athlete-cell">
                          <AthleteAvatar athlete={athlete} large />
                          <div>
                            <h3>{athlete.firstName} {athlete.lastName}</h3>
                            <p>{athlete.birthDate || 'brak daty urodzenia'}{age != null ? ` • ${age} lat` : ''}{athlete.grade ? ` • ${athlete.grade}` : ''}</p>
                          </div>
                        </div>
                        <span className="registration-total-badge">{clubEntries.filter((entry) => entry.athleteId === athlete.id).length} zgłoszeń</span>
                      </div>

                      {!eligible.length ? (
                        <div className="alert alert-info">Brak kategorii pasujących do wieku i płci tego zawodnika.</div>
                      ) : (
                        <div className="club-category-registration-list">
                          {eligible.map((category) => {
                            const competition = comps.find((item) => item.id === category.competitionId)
                            const registered = athleteIsRegistered(athlete.id, category)
                            const participantCount = categoryEntries(category).length
                            return (
                              <div className={`club-category-registration-row ${registered ? 'registered' : ''}`} key={category.id}>
                                <div>
                                  <small>{competition?.name || 'Konkurencja'}</small>
                                  <strong>{category.name}</strong>
                                </div>
                                <div className="category-participant-count">
                                  <strong>{participantCount}</strong>
                                  <span>{participantCount === 1 ? 'zawodnik' : 'zawodników'} w kategorii</span>
                                </div>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${registered ? 'btn-outline' : 'btn-primary'}`}
                                  onClick={() => toggleTournamentRegistration(athlete, category)}
                                >
                                  {registered ? 'Usuń zgłoszenie' : '+ Zgłoś'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Twoje zgłoszenia</span><h2>Konkurencje Twoich zawodników</h2><p>Przy każdym zgłoszeniu widzisz także, ilu zawodników jest obecnie w tej samej kategorii.</p></div></div>
        {!clubEntries.length ? <EmptyState title="Brak zgłoszeń" text="Wyszukaj zawodnika wyżej i zgłoś go do jednej z pasujących kategorii." /> : (
          <div className="table-wrap"><table><thead><tr><th>Zawodnik</th><th>Konkurencja</th><th>Kategoria</th><th>W kategorii</th><th>Tatami</th><th>Orientacyjnie</th><th>Status</th></tr></thead><tbody>
            {clubEntries.map((entry) => {
              const athlete = athletes.find((a) => a.id === entry.athleteId)
              const comp = comps.find((c) => c.id === entry.competitionId)
              const category = tournamentCategories.find((item) => item.id === entry.categoryId) || { id: entry.categoryId, competitionId: entry.competitionId, name: entry.category }
              const participantCount = categoryEntries(category).length
              return <tr key={entry.id}><td>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</td><td>{comp?.name || '-'}</td><td>{entry.category || '-'}</td><td><strong>{participantCount}</strong></td><td>{entry.mat || '-'}</td><td><strong>{entry.estimatedStart || '-'}</strong></td><td><StatusBadge status={entry.status} /></td></tr>
            })}
          </tbody></table></div>
        )}
      </section>
    </DashboardLayout>
  )
}
