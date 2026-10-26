import React, { useEffect, useMemo, useState } from 'react'
import { ClubWebsiteLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import ClubLogoField from '../components/ClubLogoField.jsx'
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

function formatEventDate(value) {
  if (!value) return 'Data do ustalenia'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function daysToEvent(value) {
  if (!value) return null
  const event = new Date(`${value}T12:00:00`)
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  if (Number.isNaN(event.getTime())) return null
  return Math.ceil((event.getTime() - now.getTime()) / 86400000)
}

function formatRegistrationDeadline(value) {
  if (!value) return 'Termin zgłoszeń nie został ustawiony'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function registrationCountdown(value, now = Date.now()) {
  if (!value) return { closed: false, label: 'ZGŁOSZENIA OTWARTE', text: 'Termin zgłoszeń nie został ustawiony', short: 'Zapisy otwarte' }
  const end = new Date(value).getTime()
  if (!Number.isFinite(end)) return { closed: false, label: 'ZGŁOSZENIA OTWARTE', text: 'Termin zgłoszeń nie został ustawiony', short: 'Zapisy otwarte' }
  const diff = end - now
  if (diff <= 0) return { closed: true, label: 'ZAPISY ZAKOŃCZONE', text: 'Termin zgłoszeń minął', short: 'Zapisy zakończone' }
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days) parts.push(`${days} ${days === 1 ? 'dzień' : 'dni'}`)
  if (hours || days) parts.push(`${hours} godz.`)
  parts.push(`${minutes} min`)
  const left = parts.join(' ')
  return { closed: false, label: 'ZGŁOSZENIA OTWARTE', text: `Do końca zapisów: ${left}`, short: left }
}

function ClubSetup({ user, onCreated }) {
  const [form, setForm] = useState({ name: '', shortName: '', city: '', country: 'Polska', phone: '', email: user.email, logo: '' })
  const submit = (e) => {
    e.preventDefault()
    const saved = db.saveClub({ ...form, ownerId: user.id })
    onCreated(saved)
  }
  return (
    <div className="setup-card">
      <span className="eyebrow">Pierwsze uruchomienie</span>
      <h2>Utwórz profil klubu</h2>
      <p>Ten krok wykonujesz tylko raz. Profil klubu służy do dodawania zawodników i wysyłania zgłoszeń na zawody IKA Poland.</p>
      <form className="form-grid" onSubmit={submit}>
        <div className="span-2"><ClubLogoField value={form.logo} onChange={(logo) => setForm((previous) => ({ ...previous, logo }))} /></div>
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
  const [clubAthleteSearch, setClubAthleteSearch] = useState('')
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [dataTick, setDataTick] = useState(0)
  const [deadlineNow, setDeadlineNow] = useState(() => Date.now())

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

  useEffect(() => {
    const interval = setInterval(() => setDeadlineNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

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


  const filteredClubAthletes = useMemo(() => {
    const query = normalize(clubAthleteSearch)
    if (!query) return athletes
    return athletes.filter((athlete) => normalize([
      athlete.firstName,
      athlete.lastName,
      `${athlete.firstName} ${athlete.lastName}`,
      athlete.birthDate,
      athlete.grade,
      athlete.parentName,
      athlete.parentEmail,
    ].filter(Boolean).join(' ')).includes(query))
  }, [athletes, clubAthleteSearch])

  const registeredAthleteCount = useMemo(
    () => new Set(clubEntries.map((entry) => entry.athleteId)).size,
    [clubEntries],
  )

  const eventDays = daysToEvent(visibleTournament?.date)
  const registrationStatus = registrationCountdown(visibleTournament?.registrationDeadline, deadlineNow)
  const registrationsClosed = Boolean(visibleTournament && registrationStatus.closed)
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
    if (registrationsClosed) {
      setRegistrationMessage('Termin zgłoszeń minął. Nie można już dodawać ani usuwać zgłoszeń.')
      return
    }
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
    return (
      <ClubWebsiteLayout organizer={organizerMode}>
        <section className="club-site-intro">
          <span className="eyebrow"><span className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></span></span>
          <h1>Strefa zgłoszeń klubów</h1>
          <p>Zarejestrowany klub dodaje tutaj swoich zawodników, a następnie zgłasza ich na aktywne zawody IKA Poland.</p>
        </section>
        <section className="club-site-section club-profile-setup">
          <ClubSetup user={user} onCreated={(saved) => { setClub(saved); setAthletes([]) }} />
        </section>
      </ClubWebsiteLayout>
    )
  }

  return (
    <ClubWebsiteLayout clubName={club.shortName || club.name} organizer={organizerMode}>
      <section className="club-site-intro">
        <div>
          <span className="eyebrow">Strefa zgłoszeń klubów</span>
          <h1>{club.name}</h1>
          <p>Dodaj zawodników swojego klubu, sprawdź zawody otwarte do zgłoszeń i wyślij zgłoszenia do odpowiednich kategorii.</p>
          <div className="club-site-details">
            {club.city && <span>{club.city}</span>}
            {club.email && <span>{club.email}</span>}
            <span>{athletes.length} zawodników w klubie</span>
          </div>
        </div>
        <div className="club-site-intro-actions">
          <a className="btn btn-primary" href="#club-active-tournaments">Zobacz zawody</a>
          <a className="btn btn-outline" href="#club-athletes">Moi zawodnicy</a>
        </div>
      </section>

      <section className="club-site-section ika-club-logo-settings" id="club-logo-settings">
        <div className="club-site-section-head"><div><h2>Logo klubu</h2><p>Logo będzie widoczne obok nazwy klubu w klasyfikacji medalowej. Możesz je później zmienić lub usunąć.</p></div></div>
        <ClubLogoField value={club.logo || ''} onChange={(logo) => { const updated = db.saveClub({ ...club, logo }); setClub(updated) }} />
      </section>

      <section className="club-site-section" id="club-active-tournaments">
        <div className="club-site-section-head">
          <div>
            <span className="eyebrow">Zawody <span className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></span></span>
            <h2>Aktywne zawody do zgłoszenia</h2>
            <p>Klub widzi opublikowane zawody i może zgłaszać wyłącznie swoich zawodników. Dane zawodników innych klubów nie są wyświetlane.</p>
          </div>
        </div>

        {visibleTournament ? (
          <article className="club-event-card" aria-label="Aktywne zawody IKA Poland">
            {visibleTournament.poster && (
              <div className="club-event-poster">
                <img src={visibleTournament.poster} alt={`Plakat zawodów ${visibleTournament.name}`} />
              </div>
            )}
            <div className={`club-event-main ${visibleTournament.poster ? 'club-event-main-after-poster' : ''}`}>
              <div>
                <span className={`club-event-open ${registrationsClosed ? 'closed' : ''}`}>{registrationStatus.label}</span>
                <h3>{visibleTournament.name}</h3>
                <p>{formatEventDate(visibleTournament.date)}{visibleTournament.startTime ? ` - start ${visibleTournament.startTime}` : ''}{visibleTournament.venue ? ` - ${visibleTournament.venue}` : ''}</p>
              </div>
              <div className="club-event-date-status">
                {eventDays != null && <strong>{eventDays > 1 ? `Za ${eventDays} dni` : eventDays === 1 ? 'Jutro' : eventDays === 0 ? 'Dzisiaj' : 'Termin minął'}</strong>}
                <small>{tournamentCategories.length} kategorii</small>
              </div>
            </div>

            <div className="club-event-summary">
              <div><small>Twoi zgłoszeni zawodnicy</small><strong>{registeredAthleteCount}</strong></div>
              <div><small>Twoje zgłoszenia</small><strong>{clubEntries.length}</strong></div>
              <div><small>Tatami</small><strong>{visibleTournament.matCount || '-'}</strong></div>
              <div className={`club-deadline-summary ${registrationsClosed ? 'closed' : ''}`}><small>Do końca zapisów</small><strong>{registrationStatus.short}</strong></div>
            </div>

            <div className={`club-registration-deadline ${registrationsClosed ? 'closed' : ''}`}>
              <div><small>ZAPISY DO</small><strong>{formatRegistrationDeadline(visibleTournament.registrationDeadline)}</strong></div>
              <div><small>STATUS</small><strong>{registrationStatus.text}</strong></div>
            </div>

            <div className="club-event-categories">
              <small>Dostępne konkurencje i kategorie</small>
              <div>
                {visibleCompetitionNames.length ? visibleCompetitionNames.map((name) => <span key={name}>{name}</span>) : <span>Kategorie zostaną dodane przez organizatora</span>}
              </div>
            </div>

            <div className="club-event-actions">
              <a className={`btn ${registrationsClosed ? 'btn-ghost registration-disabled-link' : 'btn-primary'}`} href={registrationsClosed ? '#club-entries' : '#club-registration'}>{registrationsClosed ? 'Zapisy zakończone' : 'Zgłoś zawodników'}</a>
              <a className="btn btn-outline" href="#club-entries">Moje zgłoszenia</a>
            </div>
          </article>
        ) : (
          <EmptyState title="Brak aktywnych zawodów" text="Gdy organizator opublikuje zawody IKA Poland, pojawią się tutaj automatycznie." />
        )}
      </section>

      <section className="club-site-section" id="club-athletes">
        <div className="club-site-section-head club-athletes-head">
          <div>
            <span className="eyebrow">Zawodnicy klubu</span>
            <h2>Moi zawodnicy</h2>
            <p>Lista zawiera wyłącznie zawodników przypisanych do Twojego klubu.</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => { setEditing(null); setShowForm(true) }}>+ Dodaj zawodnika</button>
        </div>

        {!!athletes.length && (
          <div className="club-list-search">
            <label><span>Szukaj zawodnika</span><input type="search" value={clubAthleteSearch} onChange={(event) => setClubAthleteSearch(event.target.value)} placeholder="Imię, nazwisko, data urodzenia, stopień..." /></label>
            <strong>{filteredClubAthletes.length} / {athletes.length}</strong>
          </div>
        )}

        {showForm && <div className="form-card"><AthleteForm clubId={club.id} initial={editing || emptyAthlete} onCancel={() => { setShowForm(false); setEditing(null) }} onSaved={() => { refreshAthletes(); setShowForm(false); setEditing(null) }} /></div>}

        {!athletes.length ? (
          <EmptyState title="Brak zawodników" text="Dodaj pierwszego zawodnika. Będzie można zgłosić go do kategorii dostępnych na aktywnych zawodach." />
        ) : (
          <div className="table-wrap"><table><thead><tr><th>Zawodnik</th><th>Data urodzenia</th><th>Stopień</th><th>Rodzic / opiekun</th><th></th></tr></thead><tbody>
            {filteredClubAthletes.map((athlete) => <tr key={athlete.id}><td><div className="athlete-cell"><AthleteAvatar athlete={athlete} /><div><strong>{athlete.firstName} {athlete.lastName}</strong><small>{athlete.gender === 'K' ? 'Kobieta' : athlete.gender === 'M' ? 'Mężczyzna' : '-'}</small></div></div></td><td>{athlete.birthDate || '-'}</td><td>{athlete.grade || '-'}</td><td><strong>{athlete.parentName || '-'}</strong><small className="block-small">{athlete.parentEmail || ''}</small></td><td className="actions-cell"><button className="link-btn" type="button" onClick={() => { setEditing(athlete); setShowForm(true) }}>Edytuj</button><button className="link-btn danger" type="button" onClick={() => { if (confirm('Usunąć zawodnika?')) { db.deleteAthlete(athlete.id); refreshAthletes() } }}>Usuń</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="club-site-section club-registration-section" id="club-registration">
        <div className="club-site-section-head">
          <div>
            <span className="eyebrow">Zgłoszenie zawodników</span>
            <h2>Zgłoś zawodnika na zawody</h2>
            <p>Wybierz swojego zawodnika. Strona pokaże tylko kategorie pasujące do jego wieku i płci. Przy kategorii widoczna jest wyłącznie łączna liczba zgłoszeń, bez danych innych klubów.</p>
          </div>
        </div>

        {visibleTournament && (
          <div className={`registration-deadline-banner ${registrationsClosed ? 'closed' : ''}`}>
            <div><small>Termin zgłoszeń</small><strong>{formatRegistrationDeadline(visibleTournament.registrationDeadline)}</strong></div>
            <div><small>Status</small><strong>{registrationStatus.text}</strong></div>
          </div>
        )}

        {!visibleTournament ? (
          <EmptyState title="Brak otwartych zawodów" text="Po opublikowaniu zawodów przez organizatora pojawi się tutaj formularz zgłoszeniowy." />
        ) : !tournamentCategories.length ? (
          <EmptyState title="Organizator nie dodał jeszcze kategorii" text="Gdy kategorie zostaną przygotowane, klub będzie mógł wysłać zgłoszenia." />
        ) : !athletes.length ? (
          <EmptyState title="Najpierw dodaj zawodników" text="Dodaj zawodnika do listy swojego klubu, a następnie wróć do tej sekcji." />
        ) : (
          <>
            <div className="club-athlete-search-wrap">
              <label>
                <span>Znajdź zawodnika swojego klubu</span>
                <input type="search" value={athleteSearch} onChange={(event) => setAthleteSearch(event.target.value)} placeholder="Imię, nazwisko, data urodzenia lub stopień..." />
              </label>
              <div className="club-search-count"><strong>{searchedAthletes.length}</strong><span>znalezionych</span></div>
            </div>

            {registrationMessage && <div className="alert alert-success">{registrationMessage}</div>}

            {!searchedAthletes.length ? (
              <div className="empty-state compact"><h3>Nie znaleziono zawodnika</h3><p>Sprawdź wpisane dane albo dodaj zawodnika do listy klubu.</p></div>
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
                          <div><h3>{athlete.firstName} {athlete.lastName}</h3><p>{athlete.birthDate || 'brak daty urodzenia'}{age != null ? ` - ${age} lat` : ''}{athlete.grade ? ` - ${athlete.grade}` : ''}</p></div>
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
                                <div><small>{competition?.name || 'Konkurencja'}</small><strong>{category.name}</strong></div>
                                <div className="category-participant-count"><strong>{participantCount}</strong><span>{participantCount === 1 ? 'zawodnik' : 'zawodników'} w kategorii</span></div>
                                <button type="button" disabled={registrationsClosed} className={`btn btn-sm ${registered ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleTournamentRegistration(athlete, category)}>{registrationsClosed ? 'Zapisy zakończone' : registered ? 'Usuń zgłoszenie' : 'Zgłoś'}</button>
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

      <section className="club-site-section" id="club-entries">
        <div className="club-site-section-head">
          <div><span className="eyebrow">Potwierdzenie zgłoszeń</span><h2>Moje zgłoszenia</h2><p>W tym miejscu klub widzi wyłącznie zgłoszenia swoich zawodników.</p></div>
        </div>
        {!clubEntries.length ? <EmptyState title="Brak zgłoszeń" text="Po zgłoszeniu zawodnika do kategorii pojawi się tutaj potwierdzenie." /> : (
          <div className="table-wrap"><table><thead><tr><th>Zawodnik</th><th>Konkurencja</th><th>Kategoria</th><th>W kategorii</th><th>Tatami</th><th>Szacowany start</th><th>Status</th></tr></thead><tbody>
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
    </ClubWebsiteLayout>
  )
}
