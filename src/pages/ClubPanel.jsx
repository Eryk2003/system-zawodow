import React, { useEffect, useMemo, useState } from 'react'
import { ClubWebsiteLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'
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

function formatEventDate(value, language = 'pl') {
  if (!value) return language === 'en' ? 'Date to be confirmed' : 'Data do ustalenia'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function daysToEvent(value) {
  if (!value) return null
  const event = new Date(`${value}T12:00:00`)
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  if (Number.isNaN(event.getTime())) return null
  return Math.ceil((event.getTime() - now.getTime()) / 86400000)
}

function formatRegistrationDeadline(value, language = 'pl') {
  if (!value) return language === 'en' ? 'Registration deadline not set' : 'Termin zgłoszeń nie został ustawiony'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'pl-PL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function registrationCountdown(value, now = Date.now(), language = 'pl') {
  const en = language === 'en'
  if (!value) return { closed: false, label: en ? 'REGISTRATION OPEN' : 'ZGŁOSZENIA OTWARTE', text: en ? 'Registration deadline not set' : 'Termin zgłoszeń nie został ustawiony', short: en ? 'Open' : 'Zapisy otwarte' }
  const end = new Date(value).getTime()
  if (!Number.isFinite(end)) return { closed: false, label: en ? 'REGISTRATION OPEN' : 'ZGŁOSZENIA OTWARTE', text: en ? 'Registration deadline not set' : 'Termin zgłoszeń nie został ustawiony', short: en ? 'Open' : 'Zapisy otwarte' }
  const diff = end - now
  if (diff <= 0) return { closed: true, label: en ? 'REGISTRATION CLOSED' : 'ZAPISY ZAKOŃCZONE', text: en ? 'Registration deadline has passed' : 'Termin zgłoszeń minął', short: en ? 'Closed' : 'Zapisy zakończone' }
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days) parts.push(en ? `${days} d` : `${days} ${days === 1 ? 'dzień' : 'dni'}`)
  if (hours || days) parts.push(en ? `${hours} h` : `${hours} godz.`)
  parts.push(`${minutes} min`)
  const left = parts.join(' ')
  return { closed: false, label: en ? 'REGISTRATION OPEN' : 'ZGŁOSZENIA OTWARTE', text: en ? `Time left: ${left}` : `Do końca zapisów: ${left}`, short: left }
}

function ClubSetup({ user, onCreated }) {
  const { tr } = useLanguage()
  const [form, setForm] = useState({ name: '', shortName: '', city: '', country: 'Polska', federation: '', phone: '', email: user.email })
  const submit = (e) => {
    e.preventDefault()
    const saved = db.saveClub({ ...form, ownerId: user.id })
    onCreated(saved)
  }
  return (
    <div className="setup-card">
      <span className="eyebrow">{tr('Pierwsze uruchomienie', 'First setup')}</span>
      <h2>{tr('Utwórz profil klubu', 'Create club profile')}</h2>
      <p>{tr('Ten krok wykonujesz tylko raz. Profil klubu służy do dodawania zawodników i wysyłania zgłoszeń na zawody IKA Poland.', 'You only do this once. The club profile is used to add athletes and submit entries for IKA Poland competitions.')}</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">{tr('Pełna nazwa klubu', 'Full club name')}<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr('np. Klub Karate ...', 'e.g. Karate Club ...')} /></label>
        <label>{tr('Skrócona nazwa', 'Short name')}<input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="np. KKA" /></label>
        <label>{tr('Miasto', 'City')}<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>{tr('Kraj', 'Country')}<input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="np. Polska / Poland" /></label>
        <label>{tr('Federacja / organizacja', 'Federation / organization')}<input value={form.federation || ''} onChange={(e) => setForm({ ...form, federation: e.target.value })} placeholder="np. IKA Poland" /></label>
        <label>{tr('Telefon', 'Phone')}<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>{tr('E-mail klubu', 'Club e-mail')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <button className="btn btn-primary span-2">{tr('Utwórz klub', 'Create club')}</button>
      </form>
    </div>
  )
}

function AthleteForm({ clubId, initial, onSaved, onCancel }) {
  const { tr } = useLanguage()
  const [form, setForm] = useState(initial || emptyAthlete)
  const [photoError, setPhotoError] = useState('')

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      setPhotoError(tr('Zdjęcie może mieć maksymalnie 1,5 MB w tej wersji.', 'Photo may be up to 1.5 MB.'))
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
        <label className="photo-picker">{tr('Zdjęcie zawodnika', 'Athlete photo')}<input type="file" accept="image/*" onChange={onPhoto} /><small>{tr('JPG/PNG, maks. 1,5 MB.', 'JPG/PNG, max. 1.5 MB.')}</small></label>
      </div>
      {photoError && <div className="alert alert-error span-2">{photoError}</div>}
      <label>{tr('Imię', 'First name')}<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
      <label>{tr('Nazwisko', 'Last name')}<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
      <label>{tr('Data urodzenia', 'Date of birth')}<input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></label>
      <label>{tr('Płeć', 'Gender')}<select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">{tr('Wybierz', 'Choose')}</option><option value="K">{tr('Kobieta', 'Female')}</option><option value="M">{tr('Mężczyzna', 'Male')}</option></select></label>
      <label>{tr('Stopień / kyu', 'Grade / kyu')}<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="np. 6 kyu" /></label>
      <label>{tr('Imię i nazwisko rodzica / opiekuna', 'Parent / guardian name')}<input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></label>
      <label className="span-2">{tr('E-mail rodzica / opiekuna', 'Parent / guardian e-mail')}<input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} /></label>
      <div className="form-actions span-2"><button type="button" className="btn btn-ghost" onClick={onCancel}>{tr('Anuluj', 'Cancel')}</button><button className="btn btn-primary">{tr('Zapisz zawodnika', 'Save athlete')}</button></div>
    </form>
  )
}

export default function ClubPanel() {
  const { user } = useAuth()
  const { tr, language, isEnglish } = useLanguage()
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
        return `${competition?.name || tr('Konkurencja', 'Competition')} - ${category.name}`
      })
    }
    const selected = new Set(visibleTournament.competitionIds || [])
    return comps.filter((competition) => selected.has(competition.id)).map((competition) => competition.name)
  }, [visibleTournament, comps, tournamentCategories, language])

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
  const registrationStatus = registrationCountdown(visibleTournament?.registrationDeadline, deadlineNow, language)
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
      setRegistrationMessage(tr('Termin zgłoszeń minął. Nie można już dodawać ani usuwać zgłoszeń.', 'The registration deadline has passed. Entries can no longer be added or removed.'))
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
        ? `${tr('Usunięto zgłoszenie', 'Entry removed')}: ${athlete.firstName} ${athlete.lastName} - ${category.name}.`
        : `${tr('Zgłoszono', 'Entered')}: ${athlete.firstName} ${athlete.lastName} - ${category.name}.`,
    )
    setDataTick((value) => value + 1)
  }

  if (!club) {
    return (
      <ClubWebsiteLayout organizer={organizerMode}>
        <section className="club-site-intro">
          <span className="eyebrow">IKA Poland</span>
          <h1>{tr('Strefa zgłoszeń klubów', 'Club registration zone')}</h1>
          <p>{tr('Zarejestrowany klub dodaje tutaj swoich zawodników, a następnie zgłasza ich na aktywne zawody IKA Poland.', 'A registered club adds its athletes here and then enters them into active IKA Poland competitions.')}</p>
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
          <span className="eyebrow">{tr('Strefa zgłoszeń klubów', 'Club registration zone')}</span>
          <h1>{club.name}</h1>
          <p>{tr('Dodaj zawodników swojego klubu, sprawdź zawody otwarte do zgłoszeń i wyślij zgłoszenia do odpowiednich kategorii.', 'Add your club athletes, check events open for registration and submit entries to the appropriate categories.')}</p>
          <div className="club-site-details">
            {club.city && <span>{club.city}</span>}
            {club.country && <span>{club.country}</span>}
            {club.federation && <span>{club.federation}</span>}
            {club.email && <span>{club.email}</span>}
            <span>{athletes.length} {tr('zawodników w klubie', 'athletes in club')}</span>
          </div>
        </div>
        <div className="club-site-intro-actions">
          <a className="btn btn-primary" href="#club-active-tournaments">{tr('Zobacz zawody', 'View events')}</a>
          <a className="btn btn-outline" href="#club-athletes">{tr('Moi zawodnicy', 'My athletes')}</a>
        </div>
      </section>

      <section className="club-site-section" id="club-active-tournaments">
        <div className="club-site-section-head">
          <div>
            <span className="eyebrow">{tr('Zawody IKA Poland', 'IKA Poland events')}</span>
            <h2>{tr('Aktywne zawody do zgłoszenia', 'Events open for registration')}</h2>
            <p>{tr('Klub widzi opublikowane zawody i może zgłaszać wyłącznie swoich zawodników. Dane zawodników innych klubów nie są wyświetlane.', 'The club sees published events and can enter only its own athletes. Personal data of athletes from other clubs is not displayed.')}</p>
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
                <p>{formatEventDate(visibleTournament.date, language)}{visibleTournament.startTime ? ` - start ${visibleTournament.startTime}` : ''}{visibleTournament.venue ? ` - ${visibleTournament.venue}` : ''}</p>
              </div>
              <div className="club-event-date-status">
                {eventDays != null && <strong>{eventDays > 1 ? (isEnglish ? `In ${eventDays} days` : `Za ${eventDays} dni`) : eventDays === 1 ? tr('Jutro', 'Tomorrow') : eventDays === 0 ? tr('Dzisiaj', 'Today') : tr('Termin minął', 'Date passed')}</strong>}
                <small>{tournamentCategories.length} {tr('kategorii', 'categories')}</small>
              </div>
            </div>

            <div className="club-event-summary">
              <div><small>{tr('Twoi zgłoszeni zawodnicy', 'Your entered athletes')}</small><strong>{registeredAthleteCount}</strong></div>
              <div><small>{tr('Twoje zgłoszenia', 'Your entries')}</small><strong>{clubEntries.length}</strong></div>
              <div><small>Tatami</small><strong>{visibleTournament.matCount || '-'}</strong></div>
              <div className={`club-deadline-summary ${registrationsClosed ? 'closed' : ''}`}><small>{tr('Do końca zapisów', 'Registration closes in')}</small><strong>{registrationStatus.short}</strong></div>
            </div>

            <div className={`club-registration-deadline ${registrationsClosed ? 'closed' : ''}`}>
              <div><small>{tr('ZAPISY DO', 'DEADLINE')}</small><strong>{formatRegistrationDeadline(visibleTournament.registrationDeadline, language)}</strong></div>
              <div><small>STATUS</small><strong>{registrationStatus.text}</strong></div>
            </div>

            <div className="club-event-categories">
              <small>{tr('Dostępne konkurencje i kategorie', 'Available competitions and categories')}</small>
              <div>
                {visibleCompetitionNames.length ? visibleCompetitionNames.map((name) => <span key={name}>{name}</span>) : <span>{tr('Kategorie zostaną dodane przez organizatora', 'Categories will be added by the organizer')}</span>}
              </div>
            </div>

            <div className="club-event-actions">
              <a className={`btn ${registrationsClosed ? 'btn-ghost registration-disabled-link' : 'btn-primary'}`} href={registrationsClosed ? '#club-entries' : '#club-registration'}>{registrationsClosed ? tr('Zapisy zakończone', 'Registration closed') : tr('Zgłoś zawodników', 'Enter athletes')}</a>
              <a className="btn btn-outline" href="#club-entries">{tr('Moje zgłoszenia', 'My entries')}</a>
            </div>
          </article>
        ) : (
          <EmptyState title={tr('Brak aktywnych zawodów', 'No active events')} text={tr('Gdy organizator opublikuje zawody IKA Poland, pojawią się tutaj automatycznie.', 'When the organizer publishes an IKA Poland event, it will appear here automatically.')} />
        )}
      </section>

      <section className="club-site-section" id="club-athletes">
        <div className="club-site-section-head club-athletes-head">
          <div>
            <span className="eyebrow">{tr('Zawodnicy klubu', 'Club athletes')}</span>
            <h2>{tr('Moi zawodnicy', 'My athletes')}</h2>
            <p>{tr('Lista zawiera wyłącznie zawodników przypisanych do Twojego klubu.', 'This list contains only athletes assigned to your club.')}</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => { setEditing(null); setShowForm(true) }}>{tr('+ Dodaj zawodnika', '+ Add athlete')}</button>
        </div>

        {!!athletes.length && (
          <div className="club-list-search">
            <label><span>{tr('Szukaj zawodnika', 'Search athlete')}</span><input type="search" value={clubAthleteSearch} onChange={(event) => setClubAthleteSearch(event.target.value)} placeholder={tr('Imię, nazwisko, data urodzenia, stopień...', 'Name, date of birth, grade...')} /></label>
            <strong>{filteredClubAthletes.length} / {athletes.length}</strong>
          </div>
        )}

        {showForm && <div className="form-card"><AthleteForm clubId={club.id} initial={editing || emptyAthlete} onCancel={() => { setShowForm(false); setEditing(null) }} onSaved={() => { refreshAthletes(); setShowForm(false); setEditing(null) }} /></div>}

        {!athletes.length ? (
          <EmptyState title={tr('Brak zawodników', 'No athletes')} text={tr('Dodaj pierwszego zawodnika. Będzie można zgłosić go do kategorii dostępnych na aktywnych zawodach.', 'Add your first athlete. You will then be able to enter them in categories available at active events.')} />
        ) : (
          <div className="table-wrap"><table><thead><tr><th>{tr('Zawodnik', 'Athlete')}</th><th>{tr('Data urodzenia', 'Date of birth')}</th><th>{tr('Stopień', 'Grade')}</th><th>{tr('Rodzic / opiekun', 'Parent / guardian')}</th><th></th></tr></thead><tbody>
            {filteredClubAthletes.map((athlete) => <tr key={athlete.id}><td><div className="athlete-cell"><AthleteAvatar athlete={athlete} /><div><strong>{athlete.firstName} {athlete.lastName}</strong><small>{athlete.gender === 'K' ? tr('Kobieta', 'Female') : athlete.gender === 'M' ? tr('Mężczyzna', 'Male') : '-'}</small></div></div></td><td>{athlete.birthDate || '-'}</td><td>{athlete.grade || '-'}</td><td><strong>{athlete.parentName || '-'}</strong><small className="block-small">{athlete.parentEmail || ''}</small></td><td className="actions-cell"><button className="link-btn" type="button" onClick={() => { setEditing(athlete); setShowForm(true) }}>{tr('Edytuj', 'Edit')}</button><button className="link-btn danger" type="button" onClick={() => { if (confirm(tr('Usunąć zawodnika?', 'Delete athlete?'))) { db.deleteAthlete(athlete.id); refreshAthletes() } }}>{tr('Usuń', 'Delete')}</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="club-site-section club-registration-section" id="club-registration">
        <div className="club-site-section-head">
          <div>
            <span className="eyebrow">{tr('Zgłoszenie zawodników', 'Athlete entries')}</span>
            <h2>{tr('Zgłoś zawodnika na zawody', 'Enter athlete into competition')}</h2>
            <p>{tr('Wybierz swojego zawodnika. Strona pokaże tylko kategorie pasujące do jego wieku i płci. Przy kategorii widoczna jest wyłącznie łączna liczba zgłoszeń, bez danych innych klubów.', 'Choose your athlete. The page will show only categories matching age and gender. Only the total number of entries is shown for each category, without personal data from other clubs.')}</p>
          </div>
        </div>

        {visibleTournament && (
          <div className={`registration-deadline-banner ${registrationsClosed ? 'closed' : ''}`}>
            <div><small>{tr('Termin zgłoszeń', 'Registration deadline')}</small><strong>{formatRegistrationDeadline(visibleTournament.registrationDeadline, language)}</strong></div>
            <div><small>{tr('Status', 'Status')}</small><strong>{registrationStatus.text}</strong></div>
          </div>
        )}

        {!visibleTournament ? (
          <EmptyState title={tr('Brak otwartych zawodów', 'No open events')} text={tr('Po opublikowaniu zawodów przez organizatora pojawi się tutaj formularz zgłoszeniowy.', 'The registration form will appear here when the organizer publishes an event.')} />
        ) : !tournamentCategories.length ? (
          <EmptyState title={tr('Organizator nie dodał jeszcze kategorii', 'Organizer has not added categories yet')} text={tr('Gdy kategorie zostaną przygotowane, klub będzie mógł wysłać zgłoszenia.', 'Once categories are prepared, the club will be able to submit entries.')} />
        ) : !athletes.length ? (
          <EmptyState title={tr('Najpierw dodaj zawodników', 'Add athletes first')} text={tr('Dodaj zawodnika do listy swojego klubu, a następnie wróć do tej sekcji.', 'Add an athlete to your club list and then return to this section.')} />
        ) : (
          <>
            <div className="club-athlete-search-wrap">
              <label>
                <span>{tr('Znajdź zawodnika swojego klubu', 'Find an athlete from your club')}</span>
                <input type="search" value={athleteSearch} onChange={(event) => setAthleteSearch(event.target.value)} placeholder={tr('Imię, nazwisko, data urodzenia lub stopień...', 'Name, date of birth or grade...')} />
              </label>
              <div className="club-search-count"><strong>{searchedAthletes.length}</strong><span>{tr('znalezionych', 'found')}</span></div>
            </div>

            {registrationMessage && <div className="alert alert-success">{registrationMessage}</div>}

            {!searchedAthletes.length ? (
              <div className="empty-state compact"><h3>{tr('Nie znaleziono zawodnika', 'Athlete not found')}</h3><p>{tr('Sprawdź wpisane dane albo dodaj zawodnika do listy klubu.', 'Check the entered data or add the athlete to your club list.')}</p></div>
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
                          <div><h3>{athlete.firstName} {athlete.lastName}</h3><p>{athlete.birthDate || tr('brak daty urodzenia', 'date of birth missing')}{age != null ? ` - ${age} ${tr('lat', 'years')}` : ''}{athlete.grade ? ` - ${athlete.grade}` : ''}</p></div>
                        </div>
                        <span className="registration-total-badge">{clubEntries.filter((entry) => entry.athleteId === athlete.id).length} {tr('zgłoszeń', 'entries')}</span>
                      </div>

                      {!eligible.length ? (
                        <div className="alert alert-info">{tr('Brak kategorii pasujących do wieku i płci tego zawodnika.', 'No categories match this athlete’s age and gender.')}</div>
                      ) : (
                        <div className="club-category-registration-list">
                          {eligible.map((category) => {
                            const competition = comps.find((item) => item.id === category.competitionId)
                            const registered = athleteIsRegistered(athlete.id, category)
                            const participantCount = categoryEntries(category).length
                            return (
                              <div className={`club-category-registration-row ${registered ? 'registered' : ''}`} key={category.id}>
                                <div><small>{competition?.name || tr('Konkurencja', 'Competition')}</small><strong>{category.name}</strong></div>
                                <div className="category-participant-count"><strong>{participantCount}</strong><span>{participantCount === 1 ? tr('zawodnik', 'athlete') : tr('zawodników', 'athletes')} {tr('w kategorii', 'in category')}</span></div>
                                <button type="button" disabled={registrationsClosed} className={`btn btn-sm ${registered ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleTournamentRegistration(athlete, category)}>{registrationsClosed ? tr('Zapisy zakończone', 'Registration closed') : registered ? tr('Usuń zgłoszenie', 'Remove entry') : tr('Zgłoś', 'Enter')}</button>
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
          <div><span className="eyebrow">{tr('Potwierdzenie zgłoszeń', 'Entry confirmation')}</span><h2>{tr('Moje zgłoszenia', 'My entries')}</h2><p>{tr('W tym miejscu klub widzi wyłącznie zgłoszenia swoich zawodników.', 'Here the club sees only entries for its own athletes.')}</p></div>
        </div>
        {!clubEntries.length ? <EmptyState title={tr('Brak zgłoszeń', 'No entries')} text={tr('Po zgłoszeniu zawodnika do kategorii pojawi się tutaj potwierdzenie.', 'After entering an athlete into a category, the confirmation will appear here.')} /> : (
          <div className="table-wrap"><table><thead><tr><th>{tr('Zawodnik', 'Athlete')}</th><th>{tr('Konkurencja', 'Competition')}</th><th>{tr('Kategoria', 'Category')}</th><th>{tr('W kategorii', 'In category')}</th><th>Tatami</th><th>{tr('Szacowany start', 'Estimated start')}</th><th>Status</th></tr></thead><tbody>
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
