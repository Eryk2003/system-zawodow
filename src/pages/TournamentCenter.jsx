import OrganizerRoleManager from '../components/OrganizerRoleManager.jsx'
import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import KumiteBracket from '../components/KumiteBracket'
import AutoTatamiTv from '../components/AutoTatamiTv'
import { db } from '../lib/demoStore'
import { getKumiteSideTheme } from '../lib/kumiteRules'

const emptyEntry = { athleteId: '', categoryId: '', status: 'scheduled' }
const emptyNews = { title: '', body: '', date: new Date().toISOString().slice(0, 10), important: false }
const bracketKey = (competitionId, category, mat) => `${competitionId}|||${category}|||${mat}`
const parseBracketKey = (key) => {
  const [competitionId = '', category = '', mat = ''] = (key || '').split('|||')
  return { competitionId, category, mat }
}
const scoreText = (value) => String(Number(value || 0)).replace('.', ',')
const durationText = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (!rest) return `${minutes} min`
  return `${minutes} min ${rest} s`
}
const boutTimeText = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const formatDisplayTime = (value) => {
  if (!value) return '-'
  const text = String(value).trim()
  if (!text) return '-'
  const parts = text.split(':')
  if (parts.length >= 2) return parts[0] + ':' + parts[1]
  return text
}

const formatRegistrationDeadline = (value) => {
  if (!value) return 'Nie ustawiono'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

const registrationTimeLeft = (value, now = Date.now()) => {
  if (!value) return { closed: false, text: 'Brak terminu - zgłoszenia otwarte' }
  const end = new Date(value).getTime()
  if (!Number.isFinite(end)) return { closed: false, text: 'Nieprawidłowy termin' }
  const diff = end - now
  if (diff <= 0) return { closed: true, text: 'Zapisy zakończone' }
  const minutes = Math.floor(diff / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts = []
  if (days) parts.push(`${days} d`)
  if (hours || days) parts.push(`${hours} godz.`)
  parts.push(`${mins} min`)
  return { closed: false, text: `Pozostało ${parts.join(' ')}` }
}

const printSection = (elementId, title) => {
  const target = document.getElementById(elementId)
  if (!target) return

  const previousTitle = document.title
  const cleanup = () => {
    document.body.classList.remove('print-section-mode')
    target.classList.remove('print-section-active')
    document.title = previousTitle
  }

  document.title = title || previousTitle
  document.body.classList.add('print-section-mode')
  target.classList.add('print-section-active')
  window.addEventListener('afterprint', cleanup, { once: true })

  window.setTimeout(() => {
    try {
      window.print()
    } finally {
      window.setTimeout(cleanup, 400)
    }
  }, 80)
}

const ageOnDate = (birthDate, eventDate) => {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T00:00:00`)
  const event = new Date(`${eventDate || new Date().toISOString().slice(0, 10)}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) return null
  let age = event.getFullYear() - birth.getFullYear()
  const beforeBirthday = event.getMonth() < birth.getMonth() || (event.getMonth() === birth.getMonth() && event.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export default function TournamentCenter() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [entryForm, setEntryForm] = useState(emptyEntry)
  const [newCompetition, setNewCompetition] = useState({ name: '', group: 'Pozostałe' })
  const [newsForm, setNewsForm] = useState(emptyNews)
  const [bracketForm, setBracketForm] = useState({ categoryId: '' })
  const [selectedBracket, setSelectedBracket] = useState('')
  const [kataForm, setKataForm] = useState({ categoryId: '', judgeCount: 3 })
  const [selectedKataSessionId, setSelectedKataSessionId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deadlineNow, setDeadlineNow] = useState(() => Date.now())

  const tournament = db.getTournament()
  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const competitions = db.getCompetitions()
  const categories = db.getTournamentCategories()
  const entries = db.getEntries()
  const liveId = db.getLive()
  const matches = db.getMatches()
  const kataSessions = db.getKataSessions()
  const schedule = db.getSchedule()
  const news = db.getNews()
  const matStates = db.getMatStates()
  const matNames = Array.from({ length: Math.max(1, Number(tournament.matCount) || 1) }, (_, index) => `Tatami ${index + 1}`)

  const selectedAthlete = athletes.find((a) => a.id === entryForm.athleteId)
  const selectedAthleteAge = selectedAthlete ? ageOnDate(selectedAthlete.birthDate, tournament.date) : null
  const entryCategories = categories.filter((category) => {
    const competition = competitions.find((c) => c.id === category.competitionId)
    const maxAge = category.maxAge ?? competition?.maxAge ?? null
    if (!entryForm.athleteId || selectedAthleteAge == null) return true
    if (['K', 'M'].includes(category.gender) && selectedAthlete?.gender !== category.gender) return false
    if (category.minAge != null && selectedAthleteAge < Number(category.minAge)) return false
    if (maxAge != null && selectedAthleteAge > Number(maxAge)) return false
    return true
  })

  const refresh = () => setRefreshKey((v) => v + 1)

  /* ETAP 86B - przerwa osobno na tatami */
  const toggleBreakForMat = (mat, enabled) => {
    try {
      db.setMatBreakMode(mat, enabled)
      setMessage(enabled ? `${mat}: włączono przerwę i plakat na telewizorze.` : `${mat}: wznowiono normalny widok TV.`)
      setError('')
      refresh()
    } catch (err) {
      setMessage('')
      setError(err?.message || 'Nie udało się zmienić widoku tatami.')
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (db.getMatches().some((m) => m.status === 'active' && m.timerRunning)) setRefreshKey((v) => v + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setDeadlineNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])
  /* ETAP 73: klub zglaszajacy */
  const decorated = useMemo(() => entries.map((entry) => {
    const athlete = athletes.find((a) => a.id === entry.athleteId)
    const club = clubs.find((c) => c.id === athlete?.clubId || c.id === entry.clubId)
    return {
      ...entry,
      athlete,
      club,
      competition: competitions.find((c) => c.id === entry.competitionId),
    }
  }).sort((a, b) => (a.estimatedStart || '').localeCompare(b.estimatedStart || '')), [entries, athletes, clubs, competitions, refreshKey])

  const bracketGroups = useMemo(() => {
    const map = new Map()
    matches.forEach((m) => {
      const key = bracketKey(m.competitionId, m.category, m.mat)
      if (!map.has(key)) map.set(key, { key, competitionId: m.competitionId, category: m.category, mat: m.mat })
    })
    return [...map.values()]
  }, [matches, refreshKey])

  const selected = parseBracketKey(selectedBracket || bracketGroups[0]?.key || '')
  const selectedMatches = matches
    .filter((m) => m.competitionId === selected.competitionId && m.category === selected.category && m.mat === selected.mat)
    .sort((a, b) => a.queueOrder - b.queueOrder)
  const selectedCompetition = competitions.find((c) => c.id === selected.competitionId) || null
  const selectedSideTheme = getKumiteSideTheme(selectedCompetition)
  const selectedKataSession = kataSessions.find((session) => session.id === (selectedKataSessionId || kataSessions[0]?.id)) || null
  const registrationStatus = registrationTimeLeft(tournament.registrationDeadline, deadlineNow)

  const saveTournamentField = (field, value) => {
    db.saveTournament({ ...db.getTournament(), [field]: value })
    refresh()
  }

  const saveTournamentBoutMinutes = (rawValue) => {
    const value = rawValue.replace(',', '.').replace(/[^0-9.]/g, '')
    const parsed = Number(value)
    const current = db.getTournament()
    db.saveTournament({
      ...current,
      avgBoutMinutes: value === '' || !Number.isFinite(parsed) ? '' : parsed,
      boutSeconds: value === '' || !Number.isFinite(parsed) ? '' : Math.max(1, Math.round(parsed * 60)),
    })
    refresh()
  }

  const saveTournamentBoutSeconds = (rawValue) => {
    const value = rawValue.replace(/\D/g, '')
    const parsed = Number(value)
    const current = db.getTournament()
    db.saveTournament({
      ...current,
      boutSeconds: value === '' || !Number.isFinite(parsed) ? '' : parsed,
      avgBoutMinutes: value === '' || !Number.isFinite(parsed) ? '' : Math.round((parsed / 60) * 100) / 100,
    })
    refresh()
  }

  const addEntry = (e) => {
    e.preventDefault()
    setError('')
    const athlete = athletes.find((a) => a.id === entryForm.athleteId)
    const category = categories.find((item) => item.id === entryForm.categoryId)
    const competition = competitions.find((c) => c.id === category?.competitionId)
    if (!athlete || !category || !competition) return setError('Wybierz zawodnika i istniejącą kategorię.')
    const age = ageOnDate(athlete.birthDate, tournament.date)
    const maxAge = category.maxAge ?? competition.maxAge ?? null
    if (maxAge != null && age != null && age > Number(maxAge)) return setError(`Zawodnik nie spełnia limitu wieku tej kategorii.`)
    if (category.minAge != null && age != null && age < Number(category.minAge)) return setError(`Zawodnik nie spełnia limitu wieku tej kategorii.`)
    if (['K', 'M'].includes(category.gender) && athlete.gender !== category.gender) return setError('Zawodnik nie spełnia kryterium płci tej kategorii.')
    db.saveEntry({ athleteId: athlete.id, competitionId: category.competitionId, category: category.name, categoryId: category.id, status: 'scheduled' })
    setEntryForm(emptyEntry)
    setMessage('Zawodnik został dodany do istniejącej kategorii. Harmonogram przeliczono automatycznie.')
    refresh()
  }

  const updateScheduleSlot = (slotId, patch) => {
    db.updateScheduleSlot(slotId, patch)
    setMessage('Pozycja harmonogramu została ustawiona ręcznie. Pozostałe automatyczne pozycje zostały przeliczone.')
    refresh()
  }

  const resetScheduleSlot = (slotId) => {
    db.resetScheduleSlotAuto(slotId)
    setMessage('Pozycja harmonogramu ponownie jest wyliczana automatycznie.')
    refresh()
  }

  const updateStatus = (entry, status) => {
    db.saveEntry({ ...entry, athlete: undefined, competition: undefined, status })
    if (status === 'active') {
      db.setLive(entry.id)
      if (entry.mat) db.setMatState(entry.mat, { competitionId: entry.competitionId, category: entry.category })
    }
    setMessage(status === 'active' ? 'Zawodnik został wysłany na telebim.' : '')
    refresh()
  }

  const addCompetition = (e) => {
    e.preventDefault()
    if (!newCompetition.name.trim()) return
    const next = [...competitions, { id: `custom_${Date.now()}`, name: newCompetition.name.trim(), group: newCompetition.group, active: true }]
    db.saveCompetitions(next)
    setNewCompetition({ name: '', group: 'Pozostałe' })
    refresh()
  }

  const toggleCompetition = (id) => {
    db.saveCompetitions(competitions.map((c) => c.id === id ? { ...c, active: !c.active } : c))
    refresh()
  }

  const createBracket = (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const category = categories.find((item) => item.id === bracketForm.categoryId)
      if (!category) throw new Error('Wybierz kategorię kumite.')
      const slot = db.getSchedule().find((item) => item.competitionId === category.competitionId && item.category === category.name)
      if (!slot?.mat) throw new Error('Najpierw dodaj zawodników do kategorii, aby otrzymała tatami.')
      db.generateBracket({ competitionId: category.competitionId, category: category.name, categoryId: category.id, mat: slot.mat, shuffle: true })
      const key = bracketKey(category.competitionId, category.name, slot.mat)
      setSelectedBracket(key)
      setMessage('Drabinka została wylosowana. Kolejność zawodników została ustalona losowo.')
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const createKataList = (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const category = categories.find((item) => item.id === kataForm.categoryId)
      if (!category) throw new Error('Wybierz kategorię kata.')
      const competition = competitions.find((item) => item.id === category.competitionId)
      if (competition?.group !== 'Kata') throw new Error('Wybrana kategoria nie jest kategorią kata.')
      const slot = db.getSchedule().find((item) => item.competitionId === category.competitionId && item.category === category.name)
      if (!slot?.mat) throw new Error('Najpierw dodaj zawodników do kategorii, aby otrzymała tatami.')
      const session = db.generateKataStartList({ competitionId: category.competitionId, category: category.name, categoryId: category.id, mat: slot.mat, judgeCount: Number(kataForm.judgeCount), shuffle: true })
      setSelectedKataSessionId(session.id)
      setMessage('Lista startowa kata została wylosowana. Możesz otworzyć panel sędziego i tablicę TV.')
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const addNews = (e) => {
    e.preventDefault()
    db.saveNewsItem(newsForm)
    setNewsForm({ ...emptyNews, date: new Date().toISOString().slice(0, 10) })
    setMessage('Aktualność została opublikowana.')
    refresh()
  }

  return (
    <DashboardLayout title="Centrum zawodów" organizer>
      <OrganizerRoleManager />
      <div className="organizer-banner">
        <div><span className="eyebrow">Turniej</span><h2>{tournament.name}</h2><p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p></div>
        <div className="live-control"><span className={liveId ? 'live-dot active' : 'live-dot'} />{liveId ? 'Telebim pokazuje zawodnika' : 'Telebim oczekuje'}</div>
      </div>

      <AutoTatamiTv matCount={tournament.matCount || 1} />

      <section className="panel-section break-display-panel ika86b-break-panel">
        <div className="panel-section-head">
          <div>
            <span className="eyebrow">Telebimy</span>
            <h2>Przerwa na tatami</h2>
            <p>Włącz plakat tylko na wybranym tatami. Na pozostałych telewizorach walki i wyniki będą widoczne normalnie.</p>
          </div>
        </div>
        {!tournament.poster && <div className="alert alert-info">Nie dodano plakatu zawodów. W czasie przerwy TV pokaże ekran BREAK.</div>}
        <div className="ika86b-break-list">
          {matNames.map((mat) => {
            const paused = Boolean(matStates[mat]?.breakActive || matStates[mat]?.mode === 'break')
            const clockRunning = matches.some((match) => match.mat === mat && match.status === 'active' && match.timerRunning)
            return (
              <div className={`ika86b-break-row ${paused ? 'is-break' : ''}`} key={mat}>
                <div className="ika86b-break-info">
                  <strong>{mat}</strong>
                  <span>{paused ? 'PRZERWA — PLAKAT NA TV' : clockRunning ? 'WALKA TRWA — zatrzymaj zegar przed przerwą' : 'Normalny widok telebimu'}</span>
                </div>
                <div className="ika86b-break-actions">
                  <button type="button" className="btn btn-primary" disabled={paused || clockRunning} onClick={() => toggleBreakForMat(mat, true)}>Włącz przerwę</button>
                  <button type="button" className="btn btn-outline" disabled={!paused} onClick={() => toggleBreakForMat(mat, false)}>Wznów TV</button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Ustawienia</span><h2>Dane zawodów</h2></div></div>
        <div className="form-grid compact-form">
          <label className="span-2">Nazwa zawodów<input value={tournament.name} onChange={(e) => saveTournamentField('name', e.target.value)} /></label>
          <label>Data<input type="date" value={tournament.date} onChange={(e) => saveTournamentField('date', e.target.value)} /></label>
          <label>Godzina rozpoczęcia<input type="time" value={tournament.startTime || ''} onChange={(e) => saveTournamentField('startTime', e.target.value)} /></label>
          <label>Miejsce<input value={tournament.venue} onChange={(e) => saveTournamentField('venue', e.target.value)} /></label>
          <label>Domyślny czas jednej walki (min)<input className="numeric-input" inputMode="decimal" value={tournament.avgBoutMinutes ?? ''} onChange={(e) => saveTournamentBoutMinutes(e.target.value)} /></label>
          <label>Domyślny czas walki (sek.)<input className="numeric-input" inputMode="numeric" value={tournament.boutSeconds ?? ''} onChange={(e) => saveTournamentBoutSeconds(e.target.value)} /><small className="field-hint">Minuty i sekundy są zsynchronizowane. Kategoria może mieć własny czas 1:00, 1:30, 2:00 lub 3:00.</small></label>
        </div>
      </section>

      <section className="panel-section registration-deadline-admin">
        <div className="panel-section-head">
          <div><span className="eyebrow">Zgłoszenia klubów</span><h2>Termin zgłoszeń</h2><p>Ustaw dokładną datę i godzinę zakończenia zapisów. Kluby zobaczą licznik pozostałego czasu, a po terminie formularz zgłoszeń zostanie automatycznie zablokowany.</p></div>
          <span className={`registration-deadline-status ${registrationStatus.closed ? 'closed' : 'open'}`}>{registrationStatus.text}</span>
        </div>
        <div className="registration-deadline-admin-grid">
          <label>Zapisy do<input type="datetime-local" value={tournament.registrationDeadline || ''} onChange={(e) => saveTournamentField('registrationDeadline', e.target.value)} /></label>
          <div className="registration-deadline-preview"><small>Kluby zobaczą</small><strong>{formatRegistrationDeadline(tournament.registrationDeadline)}</strong><span>{registrationStatus.text}</span></div>
        </div>
      </section>

      <section className="panel-section athlete-identifiers-access">
        <div className="panel-section-head">
          <div>
            <span className="eyebrow">Akredytacje</span>
            <h2>Identyfikatory zawodników</h2>
            <p>Identyfikatory zawierają zdjęcie, stały numer startowy, imię i nazwisko, klub, kraj, kategorię oraz kod QR prowadzący bezpośrednio do informacji o godzinach startów zawodnika.</p>
          </div>
          <span className={`registration-deadline-status ${registrationStatus.closed ? 'closed' : 'open'}`}>{registrationStatus.closed ? 'DOSTĘPNE' : 'ZABLOKOWANE'}</span>
        </div>
        {registrationStatus.closed ? (
          <div className="identifier-access-ready">
            <div><strong>Zgłoszenia są zamknięte.</strong><span>Numery startowe zostaną utrwalone przy pierwszym otwarciu identyfikatorów.</span></div>
            <a className="btn btn-primary" href="/organizator/identyfikatory">Otwórz identyfikatory</a>
          </div>
        ) : (
          <div className="alert alert-info">Identyfikatory zostaną odblokowane automatycznie po upływie terminu zgłoszeń. Do tego czasu nie można ich generować ani drukować.</div>
        )}
      </section>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Harmonogram</span><h2>Automatyczny harmonogram zawodów</h2><p>Nie wpisujesz godziny przy zawodniku. System rozkłada kategorie na dostępne tatami i liczy każdą walkę według czasu ustawionego dla kategorii. Przy 1:30 kolejne walki dostają czasy np. 09:00:00, 09:01:30, 09:03:00. Harmonogram możesz później poprawić ręcznie.</p></div></div>
        {!athletes.length && <div className="alert alert-info">Najpierw co najmniej jeden klub musi dodać zawodnika.</div>}
        <form className="entry-builder auto-entry-builder" onSubmit={addEntry}>
          <label>Zawodnik<select required value={entryForm.athleteId} onChange={(e) => setEntryForm({ ...entryForm, athleteId: e.target.value, categoryId: '' })}><option value="">Wybierz zawodnika</option>{athletes.map((a) => { const club = clubs.find((c) => c.id === a.clubId); return <option value={a.id} key={a.id}>{a.firstName} {a.lastName} - {club?.shortName || club?.name || 'klub'}</option> })}</select>{selectedAthlete && <small className="ika73-selected-club">Klub zgłaszający: <b>{clubs.find((c) => c.id === selectedAthlete.clubId)?.name || 'Nieprzypisany klub'}</b></small>}</label>
          <label>Kategoria<select required value={entryForm.categoryId} onChange={(e) => setEntryForm({ ...entryForm, categoryId: e.target.value })}><option value="">Wybierz utworzoną kategorię</option>{entryCategories.map((category) => { const competition = competitions.find((c) => c.id === category.competitionId); return <option value={category.id} key={category.id}>{competition?.name || 'Konkurencja'} - {category.name}</option> })}</select>{entryForm.athleteId && <small>{selectedAthleteAge == null ? 'Nie udało się obliczyć wieku zawodnika.' : `Wiek zawodnika w dniu zawodów: ${selectedAthleteAge} lat`}</small>}</label>
          <div className="auto-schedule-note"><strong>Start i tatami: automatycznie</strong><small>Zawodnika można dodać wyłącznie do kategorii utworzonej wcześniej dla tych zawodów.</small></div>
          <button className="btn btn-primary" disabled={!categories.length}>Dodaj zawodnika</button>
        </form>

        {!schedule.length ? (
          <EmptyState title="Harmonogram jest jeszcze pusty" text="Dodaj zawodników do konkurencji i kategorii. System sam utworzy kolejność, godzinę rozpoczęcia i tatami." />
        ) : (
          <div className="schedule-editor-list tournament-schedule-editor">
            {schedule.map((slot) => {
              const competition = competitions.find((c) => c.id === slot.competitionId)
              const matOptions = Array.from({ length: Math.max(1, Number(tournament.matCount) || 1) }, (_, index) => `Tatami ${index + 1}`)
              return (
                <article className={`schedule-editor-row ${slot.manual ? 'manual' : ''}`} key={slot.id}>
                  <div className="schedule-editor-info"><strong>{competition?.name || 'Konkurencja'}</strong><span>{slot.category}</span><small>{slot.athleteCount} zawodników • {slot.estimatedBoutCount || 0} {competition?.group === 'Kumite' ? 'walk' : 'startów'} × {boutTimeText(slot.boutSeconds || tournament.boutSeconds)} • {durationText(slot.durationSeconds || Math.round(Number(slot.durationMinutes || 0) * 60))}{slot.manual ? ' • ustawione ręcznie' : ' • automat'}</small></div>
                  <label>Start<input type="time" step="1" value={slot.startTime} onChange={(e) => updateScheduleSlot(slot.id, { startTime: e.target.value })} /></label>
                  <label>Tatami<select value={slot.mat} onChange={(e) => updateScheduleSlot(slot.id, { mat: e.target.value })}>{matOptions.map((mat) => <option value={mat} key={mat}>{mat}</option>)}</select></label>
                  <div className="schedule-editor-end"><small>Orientacyjny koniec</small><strong>{slot.endTime}</strong></div>
                  {slot.manual && <button type="button" className="btn btn-ghost btn-sm" onClick={() => resetScheduleSlot(slot.id)}>Przywróć automat</button>}
                </article>
              )
            })}
          </div>
        )}

        {!!decorated.length && (
          <div className="schedule-list athlete-schedule-list">
            {decorated.map((entry) => <article className={`schedule-card ${liveId === entry.id ? 'schedule-live' : ''}`} key={entry.id}>
              <div className="schedule-time"><strong>{formatDisplayTime(entry.estimatedStart)}</strong><small>{entry.mat || '-'}</small></div>
              <AthleteAvatar athlete={entry.athlete} />
              <div className="schedule-person"><strong>{entry.athlete ? `${entry.athlete.firstName} ${entry.athlete.lastName}` : 'Nieznany zawodnik'}</strong><span>{entry.competition?.name || '-'} • {entry.category || '-'}</span><small className="ika73-club-source">Klub zgłaszający: <b>{entry.club?.name || entry.club?.shortName || 'Nieprzypisany klub'}</b></small></div>
              <StatusBadge status={entry.status} />
              <div className="schedule-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateStatus(entry, 'called')}>Wywołaj</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(entry, 'active')}>Na telebim</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateStatus(entry, 'done')}>Zakończ</button>
                <button type="button" className="link-btn danger" onClick={() => { db.deleteEntry(entry.id); if (liveId === entry.id) db.clearLive(); refresh() }}>Usuń</button>
              </div>
            </article>)}
          </div>
        )}
        {liveId && <div className="telebim-stop"><button className="btn btn-outline" onClick={() => { db.clearLive(); refresh() }}>Wyczyść telebim</button></div>}
      </section>

      <section className="panel-section kata-admin-section">
        <div className="panel-section-head"><div><span className="eyebrow">Kata</span><h2>Lista startowa + punktacja sędziów</h2><p>W kata nie ma drabinki. Losujesz kolejność zawodników, wybierasz 3 albo 5 sędziów i prowadzisz występy jeden po drugim.</p></div></div>
        <form className="bracket-builder kata-list-builder" onSubmit={createKataList}>
          <label>Kategoria kata<select required value={kataForm.categoryId} onChange={(e) => setKataForm({ ...kataForm, categoryId: e.target.value })}><option value="">Wybierz kategorię</option>{categories.filter((category) => competitions.find((c) => c.id === category.competitionId)?.group === 'Kata').map((category) => { const competition = competitions.find((c) => c.id === category.competitionId); const slot = schedule.find((item) => item.competitionId === category.competitionId && item.category === category.name); return <option value={category.id} key={category.id}>{competition?.name} - {category.name}{slot?.mat ? ` • ${slot.mat}` : ''}</option> })}</select></label>
          <label>Liczba sędziów<select value={kataForm.judgeCount} onChange={(e) => setKataForm({ ...kataForm, judgeCount: Number(e.target.value) })}><option value={3}>3 sędziów</option><option value={5}>5 sędziów</option></select></label>
          <button className="btn btn-primary">Losuj / losuj ponownie listę startową</button>
        </form>

        {!!kataSessions.length && <div className="bracket-tabs kata-session-tabs">{kataSessions.map((session) => { const comp = competitions.find((c) => c.id === session.competitionId); return <button type="button" key={session.id} className={`bracket-tab ${(selectedKataSession?.id) === session.id ? 'active' : ''}`} onClick={() => setSelectedKataSessionId(session.id)}>{session.mat}<small>{comp?.name || 'Kata'} • {session.category}</small></button> })}</div>}

        {selectedKataSession ? (
          <>
            <div className="bracket-toolbar kata-toolbar">
              <div><strong>{selectedKataSession.mat}</strong><span>{competitions.find((c) => c.id === selectedKataSession.competitionId)?.name || 'Kata'} • {selectedKataSession.category} • {selectedKataSession.judgeCount} sędziów</span></div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => { db.showKataList(selectedKataSession.id); refresh() }}>Lista na TV</button>
                <button type="button" className="btn btn-outline" onClick={() => printSection('print-kata-category', `${tournament.name} - ${selectedKataSession.category} - kata`)}>Drukuj listę kata</button>
                <a className="btn btn-outline" href={`/organizator/kata-sedzia/${encodeURIComponent(selectedKataSession.mat)}?sessionId=${encodeURIComponent(selectedKataSession.id)}`} target="_blank" rel="noreferrer">Panel sędziego kata</a>
                <a className="btn btn-primary" href={`/tatami/${encodeURIComponent(selectedKataSession.mat)}`} target="_blank" rel="noreferrer">Tablica TV • {selectedKataSession.mat}</a>
                <button type="button" className="btn btn-ghost" onClick={() => { if (confirm('Usunąć listę startową i wszystkie zapisane oceny tej kategorii?')) { db.resetKataSession(selectedKataSession.id); setSelectedKataSessionId(''); refresh() } }}>Usuń listę</button>
              </div>
            </div>
            <div id="print-kata-category" className="competition-print-section print-kata-sheet">
              <div className="competition-print-header print-only">
                <div><strong className="ika-brand-wordmark"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{tournament.name}</span></div>
                <h1>{competitions.find((c) => c.id === selectedKataSession.competitionId)?.name || 'Kata'} - {selectedKataSession.category}</h1>
                <div className="competition-print-meta"><span>{tournament.date || '-'}</span><span>{tournament.venue || '-'}</span><span>{selectedKataSession.mat}</span><span>{selectedKataSession.judgeCount} sędziów</span></div>
              </div>
              <div className="kata-admin-list print-screen-only">
                {selectedKataSession.results.slice().sort((a, b) => a.order - b.order).map((result) => { const athlete = athletes.find((item) => item.id === result.athleteId); const club = athlete ? clubs.find((item) => item.id === athlete.clubId) : null; return <article key={result.athleteId} className={`kata-admin-row ${result.status}`}><b>{result.order}</b><div><strong>{athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Nieznany zawodnik'}</strong><span>{club?.shortName || club?.name || ''}</span></div><em>{result.status === 'done' ? `Ocena: ${scoreText(result.finalScore)}` : result.status === 'active' ? 'TERAZ' : 'Oczekuje'}</em></article> })}
              </div>
              <table className="kata-print-table print-only">
                <thead><tr><th>Nr</th><th>Zawodnik</th><th>Klub</th><th>Wykonywane kata</th><th>Wynik</th></tr></thead>
                <tbody>
                  {selectedKataSession.results.slice().sort((a, b) => a.order - b.order).map((result) => {
                    const athlete = athletes.find((item) => item.id === result.athleteId)
                    const club = athlete ? clubs.find((item) => item.id === athlete.clubId) : null
                    return <tr key={`print-${result.athleteId}`}><td>{result.order}</td><td>{athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Nieznany zawodnik'}</td><td>{club?.shortName || club?.name || '-'}</td><td>{result.kataName || '-'}</td><td>{result.status === 'done' ? scoreText(result.finalScore) : '-'}</td></tr>
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : <EmptyState title="Brak listy startowej kata" text="Wybierz kategorię kata i wylosuj kolejność. Następnie otwórz panel sędziego." />}
      </section>

      <section className="panel-section bracket-admin-section">
        <div className="panel-section-head"><div><span className="eyebrow">Kumite</span><h2>Drabinka + automatyczna tablica przy tatami</h2><p>Utwórz drabinkę z zawodników przypisanych do tej samej konkurencji, kategorii i tatami.</p></div></div>
        <form className="bracket-builder" onSubmit={createBracket}>
          <label>Kategoria kumite<select required value={bracketForm.categoryId} onChange={(e) => setBracketForm({ categoryId: e.target.value })}><option value="">Wybierz kategorię</option>{categories.filter((category) => competitions.find((c) => c.id === category.competitionId)?.group === 'Kumite').map((category) => { const competition = competitions.find((c) => c.id === category.competitionId); const slot = schedule.find((item) => item.competitionId === category.competitionId && item.category === category.name); return <option value={category.id} key={category.id}>{competition?.name} - {category.name}{slot?.mat ? ` • ${slot.mat}` : ''}</option> })}</select></label>
          <button className="btn btn-primary">Losuj / losuj ponownie drabinkę</button>
        </form>

        {!!bracketGroups.length && (
          <div className="bracket-tabs">
            {bracketGroups.map((g) => {
              const comp = competitions.find((c) => c.id === g.competitionId)
              return <button type="button" key={g.key} className={`bracket-tab ${(selectedBracket || bracketGroups[0]?.key) === g.key ? 'active' : ''}`} onClick={() => setSelectedBracket(g.key)}>{g.mat}<small>{comp?.name || 'Kumite'} • {g.category}</small></button>
            })}
          </div>
        )}

        {selectedMatches.length ? (
          <>
            <div className="bracket-toolbar">
              <div><strong>{selected.mat}</strong><span>{competitions.find((c) => c.id === selected.competitionId)?.name} • {selected.category}</span></div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => { db.setMatState(selected.mat, { mode: 'bracket', competitionId: selected.competitionId, category: selected.category, currentMatchId: null }); refresh() }}>Pokaż drabinkę na TV</button>
                <button type="button" className="btn btn-outline" onClick={() => printSection('print-kumite-bracket', `${tournament.name} - ${selected.category} - drabinka`)}>Drukuj drabinkę</button>
                <a className="btn btn-outline" href={`/organizator/sedzia/${encodeURIComponent(selected.mat)}?competitionId=${encodeURIComponent(selected.competitionId)}&category=${encodeURIComponent(selected.category)}`} target="_blank" rel="noreferrer">Panel sędziego</a>
                <a className="btn btn-primary" href={`/tatami/${encodeURIComponent(selected.mat)}`} target="_blank" rel="noreferrer">Tablica TV • {selected.mat}</a>
                <button type="button" className="btn btn-ghost" onClick={() => { if (confirm('Usunąć tę drabinkę?')) { db.resetBracket(selected); setSelectedBracket(''); refresh() } }}>Usuń drabinkę</button>
              </div>
            </div>
            <div id="print-kumite-bracket" className="academy-bracket-panel-wrap competition-print-section print-kumite-sheet">
              <div className="competition-print-header print-only">
                <div><strong className="ika-brand-wordmark"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{tournament.name}</span></div>
                <h1>{selectedCompetition?.name || 'Kumite'} - {selected.category}</h1>
                <div className="competition-print-meta"><span>{tournament.date || '-'}</span><span>{tournament.venue || '-'}</span><span>{selected.mat}</span><span>{selectedSideTheme.red.code} / {selectedSideTheme.blue.code}</span></div>
              </div>
              <div className="academy-bracket-panel-head print-screen-only">
                <div>
                  <span>DRABINKA</span>
                  <strong>{selectedCompetition?.name || 'Kumite'} - {selected.category}</strong>
                </div>
                <small>{selectedSideTheme.red.code} / {selectedSideTheme.blue.code}</small>
              </div>
              <KumiteBracket
                matches={selectedMatches}
                athletes={athletes}
                clubs={clubs}
                sideTheme={selectedSideTheme}
                variant="panel"
              />
            </div>

            <div className="alert alert-info competition-control-note">
              Sterowanie walką jest dostępne wyłącznie w Panelu sędziego. W Centrum Zawodów możesz tylko przeglądać drabinkę i otworzyć panel właściwego tatami.
            </div>
          </>
        ) : <EmptyState title="Brak drabinki" text="Po utworzeniu drabinki zobaczysz ją tutaj. Sterowanie walką odbywa się wyłącznie w Panelu sędziego." />}
      </section>

      

      
    </DashboardLayout>
  )
}
