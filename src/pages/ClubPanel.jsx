import React, { useEffect, useMemo, useState } from 'react'
import { ClubWebsiteLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { useAuth } from '../lib/AuthContext'
import { db } from '../lib/demoStore'
import { COUNTRIES, countryLabel, countryName } from '../lib/countries.js'
import { useLanguage } from '../lib/i18n.js'

const emptyAthlete = {
  firstName: '', lastName: '', birthDate: '', gender: '', grade: '', nationality: 'PL', parentName: '', parentEmail: '', photo: '',
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
  if (!value) return 'Data do ustalenia'
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
  return { closed: false, label: en ? 'REGISTRATION OPEN' : 'ZGŁOSZENIA OTWARTE', text: en ? `Registration closes in: ${left}` : `Do końca zapisów: ${left}`, short: left }
}

function ClubSetup({ user, onCreated }) {
  const { language, t } = useLanguage()
  const [form, setForm] = useState({ name: '', shortName: '', city: '', country: 'PL', federation: '', phone: '', email: user.email })
  const submit = (e) => {
    e.preventDefault()
    const country = countryName(form.country, 'en') || form.country
    const saved = db.saveClub({ ...form, countryCode: form.country, country, ownerId: user.id })
    onCreated(saved)
  }
  return (
    <div className="setup-card">
      <span className="eyebrow">{t('firstLaunch')}</span>
      <h2>{t('createClubProfile')}</h2>
      <p>{t('clubProfileText')}</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">{t('clubFullName')}<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={language === 'en' ? 'e.g. Karate Club ...' : 'np. Klub Karate ...'} /></label>
        <label>{t('clubShortName')}<input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="KKA" /></label>
        <label>{t('city')}<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>{t('country')}<select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.map((item) => <option value={item.code} key={item.code}>{item.flag} {language === 'en' ? item.en : item.pl}</option>)}</select></label>
        <label>{t('federation')}<input value={form.federation} onChange={(e) => setForm({ ...form, federation: e.target.value })} placeholder={language === 'en' ? 'e.g. national federation / association' : 'np. federacja / organizacja krajowa'} /></label>
        <label>{t('phone')}<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>{t('clubEmail')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <button className="btn btn-primary span-2">{t('createClub')}</button>
      </form>
    </div>
  )
}

function AthleteForm({ clubId, clubCountry = 'PL', initial, onSaved, onCancel }) {
  const { language } = useLanguage()
  const [form, setForm] = useState(initial ? { ...initial, nationality: initial.nationality || clubCountry || 'PL' } : { ...emptyAthlete, nationality: clubCountry || 'PL' })
  const [photoError, setPhotoError] = useState('')

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      setPhotoError(language === 'en' ? 'The photo can be up to 1.5 MB.' : 'Zdjęcie może mieć maksymalnie 1,5 MB w tej wersji.')
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
        <label className="photo-picker">{language === 'en' ? 'Athlete photo' : 'Zdjęcie zawodnika'}<input type="file" accept="image/*" onChange={onPhoto} /><small>{language === 'en' ? 'JPG/PNG, max. 1.5 MB.' : 'JPG/PNG, maks. 1,5 MB.'}</small></label>
      </div>
      {photoError && <div className="alert alert-error span-2">{photoError}</div>}
      <label>{language === 'en' ? 'First name' : 'Imię'}<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
      <label>{language === 'en' ? 'Last name' : 'Nazwisko'}<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
      <label>{language === 'en' ? 'Date of birth' : 'Data urodzenia'}<input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></label>
      <label>{language === 'en' ? 'Gender' : 'Płeć'}<select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">{language === 'en' ? 'Select' : 'Wybierz'}</option><option value="K">{language === 'en' ? 'Female' : 'Kobieta'}</option><option value="M">{language === 'en' ? 'Male' : 'Mężczyzna'}</option></select></label>
      <label>{language === 'en' ? 'Grade / kyu' : 'Stopień / kyu'}<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder={language === 'en' ? 'e.g. 6 kyu' : 'np. 6 kyu'} /></label>
      <label>{language === 'en' ? 'Parent / guardian full name' : 'Imię i nazwisko rodzica / opiekuna'}<input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></label>
      <label>{language === 'en' ? 'Nationality' : 'Narodowość'}<select value={form.nationality || clubCountry || 'PL'} onChange={(e) => setForm({ ...form, nationality: e.target.value })}>{COUNTRIES.map((item) => <option value={item.code} key={item.code}>{item.flag} {language === 'en' ? item.en : item.pl}</option>)}</select></label>
      <label>{language === 'en' ? 'Parent / guardian email' : 'E-mail rodzica / opiekuna'}<input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} /></label>
      <div className="form-actions span-2"><button type="button" className="btn btn-ghost" onClick={onCancel}>{language === 'en' ? 'Cancel' : 'Anuluj'}</button><button className="btn btn-primary">{language === 'en' ? 'Save athlete' : 'Zapisz zawodnika'}</button></div>
    </form>
  )
}

export default function ClubPanel() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const en = language === 'en'
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
        return `${competition?.name || (en ? 'Competition' : 'Konkurencja')} - ${category.name}`
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
      setRegistrationMessage(en ? 'The registration deadline has passed. Entries can no longer be added or removed.' : 'Termin zgłoszeń minął. Nie można już dodawać ani usuwać zgłoszeń.')
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
        ? (en ? `Entry removed: ${athlete.firstName} ${athlete.lastName} - ${category.name}.` : `Usunięto zgłoszenie: ${athlete.firstName} ${athlete.lastName} - ${category.name}.`)
        : (en ? `Registered: ${athlete.firstName} ${athlete.lastName} - ${category.name}.` : `Zgłoszono: ${athlete.firstName} ${athlete.lastName} - ${category.name}.`),
    )
    setDataTick((value) => value + 1)
  }

  if (!club) {
    return (
      <ClubWebsiteLayout organizer={organizerMode}>
        <section className="club-site-intro">
          <span className="eyebrow">IKA Poland</span>
          <h1>{en ? 'Club registration zone' : 'Strefa zgłoszeń klubów'}</h1>
          <p>{en ? 'A registered club adds its athletes here and then submits them to active IKA Poland competitions.' : 'Zarejestrowany klub dodaje tutaj swoich zawodników, a następnie zgłasza ich na aktywne zawody IKA Poland.'}</p>
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
          <span className="eyebrow">{en ? 'Club registration zone' : 'Strefa zgłoszeń klubów'}</span>
          <h1>{club.name}</h1>
          <p>{en ? 'Add your club athletes, check competitions open for registration and submit entries to eligible categories.' : 'Dodaj zawodników swojego klubu, sprawdź zawody otwarte do zgłoszeń i wyślij zgłoszenia do odpowiednich kategorii.'}</p>
          <div className="club-site-details">
            {club.city && <span>{club.city}</span>}
            {club.email && <span>{club.email}</span>}
            <span>{countryLabel(club.countryCode || club.country, language)}</span>
            {club.federation && <span>{club.federation}</span>}
            <span>{athletes.length} {en ? 'athletes in club' : 'zawodników w klubie'}</span>
          </div>
        </div>
        <div className="club-site-intro-actions">
          <a className="btn btn-primary" href="#club-active-tournaments">{en ? 'View events' : 'Zobacz zawody'}</a>
          <a className="btn btn-outline" href="#club-athletes">{en ? 'My athletes' : 'Moi zawodnicy'}</a>
        </div>
      </section>

      <section className="club-site-section" id="club-active-tournaments">
        <div className="club-site-section-head">
          <div>
            <span className="eyebrow">{en ? 'IKA Poland competitions' : 'Zawody IKA Poland'}</span>
            <h2>{en ? 'Active competitions open for registration' : 'Aktywne zawody do zgłoszenia'}</h2>
            <p>{en ? 'The club sees published competitions and can register only its own athletes. Personal data of athletes from other clubs is not displayed.' : 'Klub widzi opublikowane zawody i może zgłaszać wyłącznie swoich zawodników. Dane zawodników innych klubów nie są wyświetlane.'}</p>
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
                {eventDays != null && <strong>{en ? (eventDays > 1 ? `In ${eventDays} days` : eventDays === 1 ? 'Tomorrow' : eventDays === 0 ? 'Today' : 'Date passed') : (eventDays > 1 ? `Za ${eventDays} dni` : eventDays === 1 ? 'Jutro' : eventDays === 0 ? 'Dzisiaj' : 'Termin minął')}</strong>}
                <small>{tournamentCategories.length} {en ? 'categories' : 'kategorii'}</small>
              </div>
            </div>

            <div className="club-event-summary">
              <div><small>{en ? 'Your registered athletes' : 'Twoi zgłoszeni zawodnicy'}</small><strong>{registeredAthleteCount}</strong></div>
              <div><small>{en ? 'Your entries' : 'Twoje zgłoszenia'}</small><strong>{clubEntries.length}</strong></div>
              <div><small>Tatami</small><strong>{visibleTournament.matCount || '-'}</strong></div>
              <div className={`club-deadline-summary ${registrationsClosed ? 'closed' : ''}`}><small>{en ? 'Registration closes in' : 'Do końca zapisów'}</small><strong>{registrationStatus.short}</strong></div>
            </div>

            <div className={`club-registration-deadline ${registrationsClosed ? 'closed' : ''}`}>
              <div><small>{en ? 'DEADLINE' : 'ZAPISY DO'}</small><strong>{formatRegistrationDeadline(visibleTournament.registrationDeadline, language)}</strong></div>
              <div><small>STATUS</small><strong>{registrationStatus.text}</strong></div>
            </div>

            <div className="club-event-categories">
              <small>{en ? 'Available competitions and categories' : 'Dostępne konkurencje i kategorie'}</small>
              <div>
                {visibleCompetitionNames.length ? visibleCompetitionNames.map((name) => <span key={name}>{name}</span>) : <span>{en ? 'Categories will be added by the organizer' : 'Kategorie zostaną dodane przez organizatora'}</span>}
              </div>
            </div>

            <div className="club-event-actions">
              <a className={`btn ${registrationsClosed ? 'btn-ghost registration-disabled-link' : 'btn-primary'}`} href={registrationsClosed ? '#club-entries' : '#club-registration'}>{registrationsClosed ? (en ? 'Registration closed' : 'Zapisy zakończone') : (en ? 'Register athletes' : 'Zgłoś zawodników')}</a>
              <a className="btn btn-outline" href="#club-entries">{en ? 'My entries' : 'Moje zgłoszenia'}</a>
            </div>
          </article>
        ) : (
          <EmptyState title={en ? 'No active competitions' : 'Brak aktywnych zawodów'} text={en ? 'When the organizer publishes an IKA Poland competition, it will appear here automatically.' : 'Gdy organizator opublikuje zawody IKA Poland, pojawią się tutaj automatycznie.'} />
        )}
      </section>

      <section className="club-site-section" id="club-athletes">
        <div className="club-site-section-head club-athletes-head">
          <div>
            <span className="eyebrow">{en ? 'Club athletes' : 'Zawodnicy klubu'}</span>
            <h2>{en ? 'My athletes' : 'Moi zawodnicy'}</h2>
            <p>{en ? 'The list contains only athletes assigned to your club.' : 'Lista zawiera wyłącznie zawodników przypisanych do Twojego klubu.'}</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => { setEditing(null); setShowForm(true) }}>{en ? '+ Add athlete' : '+ Dodaj zawodnika'}</button>
        </div>

        {!!athletes.length && (
          <div className="club-list-search">
            <label><span>{en ? 'Search athlete' : 'Szukaj zawodnika'}</span><input type="search" value={clubAthleteSearch} onChange={(event) => setClubAthleteSearch(event.target.value)} placeholder={en ? 'Name, date of birth, grade...' : 'Imię, nazwisko, data urodzenia, stopień...'} /></label>
            <strong>{filteredClubAthletes.length} / {athletes.length}</strong>
          </div>
        )}

        {showForm && <div className="form-card"><AthleteForm clubId={club.id} clubCountry={club.countryCode || 'PL'} initial={editing || { ...emptyAthlete, nationality: club.countryCode || 'PL' }} onCancel={() => { setShowForm(false); setEditing(null) }} onSaved={() => { refreshAthletes(); setShowForm(false); setEditing(null) }} /></div>}

        {!athletes.length ? (
          <EmptyState title={en ? 'No athletes' : 'Brak zawodników'} text={en ? 'Add the first athlete. You will then be able to register them for categories in active competitions.' : 'Dodaj pierwszego zawodnika. Będzie można zgłosić go do kategorii dostępnych na aktywnych zawodach.'} />
        ) : (
          <div className="table-wrap"><table><thead><tr><th>{en ? 'Athlete' : 'Zawodnik'}</th><th>{en ? 'Nationality' : 'Narodowość'}</th><th>{en ? 'Date of birth' : 'Data urodzenia'}</th><th>{en ? 'Grade' : 'Stopień'}</th><th>{en ? 'Parent / guardian' : 'Rodzic / opiekun'}</th><th></th></tr></thead><tbody>
            {filteredClubAthletes.map((athlete) => <tr key={athlete.id}><td><div className="athlete-cell"><AthleteAvatar athlete={athlete} /><div><strong>{athlete.firstName} {athlete.lastName}</strong><small>{athlete.gender === 'K' ? 'Kobieta' : athlete.gender === 'M' ? 'Mężczyzna' : '-'}</small></div></div></td><td>{countryLabel(athlete.nationality || club.countryCode || club.country, language)}</td><td>{athlete.birthDate || '-'}</td><td>{athlete.grade || '-'}</td><td><strong>{athlete.parentName || '-'}</strong><small className="block-small">{athlete.parentEmail || ''}</small></td><td className="actions-cell"><button className="link-btn" type="button" onClick={() => { setEditing(athlete); setShowForm(true) }}>{en ? 'Edit' : 'Edytuj'}</button><button className="link-btn danger" type="button" onClick={() => { if (confirm(en ? 'Delete athlete?' : 'Usunąć zawodnika?')) { db.deleteAthlete(athlete.id); refreshAthletes() } }}>{en ? 'Delete' : 'Usuń'}</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="club-site-section club-registration-section" id="club-registration">
        <div className="club-site-section-head">
          <div>
            <span className="eyebrow">{en ? 'Athlete registration' : 'Zgłoszenie zawodników'}</span>
            <h2>{en ? 'Register athlete for competition' : 'Zgłoś zawodnika na zawody'}</h2>
            <p>{en ? 'Choose your athlete. The page shows only categories matching age and gender. Only the total number of entries is visible for each category, without data from other clubs.' : 'Wybierz swojego zawodnika. Strona pokaże tylko kategorie pasujące do jego wieku i płci. Przy kategorii widoczna jest wyłącznie łączna liczba zgłoszeń, bez danych innych klubów.'}</p>
          </div>
        </div>

        {visibleTournament && (
          <div className={`registration-deadline-banner ${registrationsClosed ? 'closed' : ''}`}>
            <div><small>{en ? 'Registration deadline' : 'Termin zgłoszeń'}</small><strong>{formatRegistrationDeadline(visibleTournament.registrationDeadline, language)}</strong></div>
            <div><small>Status</small><strong>{registrationStatus.text}</strong></div>
          </div>
        )}

        {!visibleTournament ? (
          <EmptyState title={en ? 'No open competitions' : 'Brak otwartych zawodów'} text={en ? 'When the organizer publishes a competition, the registration form will appear here.' : 'Po opublikowaniu zawodów przez organizatora pojawi się tutaj formularz zgłoszeniowy.'} />
        ) : !tournamentCategories.length ? (
          <EmptyState title={en ? 'The organizer has not added categories yet' : 'Organizator nie dodał jeszcze kategorii'} text={en ? 'When the categories are ready, the club will be able to submit entries.' : 'Gdy kategorie zostaną przygotowane, klub będzie mógł wysłać zgłoszenia.'} />
        ) : !athletes.length ? (
          <EmptyState title={en ? 'Add athletes first' : 'Najpierw dodaj zawodników'} text={en ? 'Add an athlete to your club list, then return to this section.' : 'Dodaj zawodnika do listy swojego klubu, a następnie wróć do tej sekcji.'} />
        ) : (
          <>
            <div className="club-athlete-search-wrap">
              <label>
                <span>{en ? 'Find an athlete from your club' : 'Znajdź zawodnika swojego klubu'}</span>
                <input type="search" value={athleteSearch} onChange={(event) => setAthleteSearch(event.target.value)} placeholder={en ? 'Name, date of birth or grade...' : 'Imię, nazwisko, data urodzenia lub stopień...'} />
              </label>
              <div className="club-search-count"><strong>{searchedAthletes.length}</strong><span>{en ? 'found' : 'znalezionych'}</span></div>
            </div>

            {registrationMessage && <div className="alert alert-success">{registrationMessage}</div>}

            {!searchedAthletes.length ? (
              <div className="empty-state compact"><h3>{en ? 'Athlete not found' : 'Nie znaleziono zawodnika'}</h3><p>{en ? 'Check the entered data or add the athlete to the club list.' : 'Sprawdź wpisane dane albo dodaj zawodnika do listy klubu.'}</p></div>
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
                          <div><h3>{athlete.firstName} {athlete.lastName}</h3><p>{athlete.birthDate || (en ? 'no date of birth' : 'brak daty urodzenia')}{age != null ? ` - ${age} ${en ? 'years' : 'lat'}` : ''}{athlete.grade ? ` - ${athlete.grade}` : ''}</p></div>
                        </div>
                        <span className="registration-total-badge">{clubEntries.filter((entry) => entry.athleteId === athlete.id).length} {en ? 'entries' : 'zgłoszeń'}</span>
                      </div>

                      {!eligible.length ? (
                        <div className="alert alert-info">{en ? 'No categories match this athlete’s age and gender.' : 'Brak kategorii pasujących do wieku i płci tego zawodnika.'}</div>
                      ) : (
                        <div className="club-category-registration-list">
                          {eligible.map((category) => {
                            const competition = comps.find((item) => item.id === category.competitionId)
                            const registered = athleteIsRegistered(athlete.id, category)
                            const participantCount = categoryEntries(category).length
                            return (
                              <div className={`club-category-registration-row ${registered ? 'registered' : ''}`} key={category.id}>
                                <div><small>{competition?.name || (en ? 'Competition' : 'Konkurencja')}</small><strong>{category.name}</strong></div>
                                <div className="category-participant-count"><strong>{participantCount}</strong><span>{en ? `${participantCount === 1 ? 'athlete' : 'athletes'} in category` : `${participantCount === 1 ? 'zawodnik' : 'zawodników'} w kategorii`}</span></div>
                                <button type="button" disabled={registrationsClosed} className={`btn btn-sm ${registered ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleTournamentRegistration(athlete, category)}>{registrationsClosed ? (en ? 'Registration closed' : 'Zapisy zakończone') : registered ? (en ? 'Remove entry' : 'Usuń zgłoszenie') : (en ? 'Register' : 'Zgłoś')}</button>
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
          <div><span className="eyebrow">{en ? 'Entry confirmation' : 'Potwierdzenie zgłoszeń'}</span><h2>{en ? 'My entries' : 'Moje zgłoszenia'}</h2><p>{en ? 'The club sees only entries for its own athletes here.' : 'W tym miejscu klub widzi wyłącznie zgłoszenia swoich zawodników.'}</p></div>
        </div>
        {!clubEntries.length ? <EmptyState title={en ? 'No entries' : 'Brak zgłoszeń'} text={en ? 'After registering an athlete for a category, confirmation will appear here.' : 'Po zgłoszeniu zawodnika do kategorii pojawi się tutaj potwierdzenie.'} /> : (
          <div className="table-wrap"><table><thead><tr><th>{en ? 'Athlete' : 'Zawodnik'}</th><th>{en ? 'Competition' : 'Konkurencja'}</th><th>{en ? 'Category' : 'Kategoria'}</th><th>{en ? 'In category' : 'W kategorii'}</th><th>Tatami</th><th>{en ? 'Estimated start' : 'Szacowany start'}</th><th>Status</th></tr></thead><tbody>
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
