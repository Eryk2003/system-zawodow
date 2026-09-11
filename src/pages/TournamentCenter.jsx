import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout, EmptyState, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { db, getComputedRemaining, resolveMatch } from '../lib/demoStore'
import { getKumiteSideTheme } from '../lib/kumiteRules'

const emptyEntry = { athleteId: '', categoryId: '', status: 'scheduled' }
const emptyNews = { title: '', body: '', date: new Date().toISOString().slice(0, 10), important: false }
const bracketKey = (competitionId, category, mat) => `${competitionId}|||${category}|||${mat}`
const parseBracketKey = (key) => {
  const [competitionId = '', category = '', mat = ''] = (key || '').split('|||')
  return { competitionId, category, mat }
}
const clock = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`
const scoreText = (value) => String(Number(value || 0)).replace('.', ',')

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (db.getMatches().some((m) => m.status === 'active' && m.timerRunning)) setRefreshKey((v) => v + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  const athleteName = (id) => {
    const a = athletes.find((x) => x.id === id)
    return a ? `${a.firstName} ${a.lastName}` : 'Oczekiwanie'
  }

  const decorated = useMemo(() => entries.map((entry) => ({
    ...entry,
    athlete: athletes.find((a) => a.id === entry.athleteId),
    competition: competitions.find((c) => c.id === entry.competitionId),
  })).sort((a, b) => (a.estimatedStart || '').localeCompare(b.estimatedStart || '')), [entries, athletes, competitions, refreshKey])

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

  const saveTournamentField = (field, value) => {
    db.saveTournament({ ...db.getTournament(), [field]: value })
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

  const startMatch = (match) => {
    setError('')
    try {
      db.startMatch(match.id)
      setSelectedBracket(bracketKey(match.competitionId, match.category, match.mat))
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const finishMatch = (match, winnerId) => {
    setError('')
    try {
      db.finishMatch(match.id, winnerId)
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
      <div className="organizer-banner">
        <div><span className="eyebrow">Turniej</span><h2>{tournament.name}</h2><p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p></div>
        <div className="live-control"><span className={liveId ? 'live-dot active' : 'live-dot'} />{liveId ? 'Telebim pokazuje zawodnika' : 'Telebim oczekuje'}</div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Ustawienia</span><h2>Dane zawodów</h2></div></div>
        <div className="form-grid compact-form">
          <label className="span-2">Nazwa zawodów<input value={tournament.name} onChange={(e) => saveTournamentField('name', e.target.value)} /></label>
          <label>Data<input type="date" value={tournament.date} onChange={(e) => saveTournamentField('date', e.target.value)} /></label>
          <label>Godzina rozpoczęcia<input type="time" value={tournament.startTime || ''} onChange={(e) => saveTournamentField('startTime', e.target.value)} /></label>
          <label>Miejsce<input value={tournament.venue} onChange={(e) => saveTournamentField('venue', e.target.value)} /></label>
          <label>Średni czas jednej walki (min)<input className="numeric-input" inputMode="decimal" value={tournament.avgBoutMinutes ?? ''} onChange={(e) => { const value = e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''); saveTournamentField('avgBoutMinutes', value === '' ? '' : Number(value)) }} /></label>
          <label>Czas walki na tablicy (sek.)<input className="numeric-input" inputMode="numeric" value={tournament.boutSeconds ?? ''} onChange={(e) => { const value = e.target.value.replace(/\D/g, ''); saveTournamentField('boutSeconds', value === '' ? '' : Number(value)) }} /></label>
        </div>
      </section>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Harmonogram</span><h2>Automatyczny harmonogram zawodów</h2><p>Nie wpisujesz godziny przy zawodniku. System sam rozkłada kategorie od godziny rozpoczęcia zawodów na dostępne tatami. Harmonogram możesz później poprawić ręcznie.</p></div></div>
        {!athletes.length && <div className="alert alert-info">Najpierw co najmniej jeden klub musi dodać zawodnika.</div>}
        <form className="entry-builder auto-entry-builder" onSubmit={addEntry}>
          <label>Zawodnik<select required value={entryForm.athleteId} onChange={(e) => setEntryForm({ ...entryForm, athleteId: e.target.value, categoryId: '' })}><option value="">Wybierz zawodnika</option>{athletes.map((a) => { const club = clubs.find((c) => c.id === a.clubId); return <option value={a.id} key={a.id}>{a.firstName} {a.lastName} — {club?.shortName || club?.name || 'klub'}</option> })}</select></label>
          <label>Kategoria<select required value={entryForm.categoryId} onChange={(e) => setEntryForm({ ...entryForm, categoryId: e.target.value })}><option value="">Wybierz utworzoną kategorię</option>{entryCategories.map((category) => { const competition = competitions.find((c) => c.id === category.competitionId); return <option value={category.id} key={category.id}>{competition?.name || 'Konkurencja'} — {category.name}</option> })}</select>{entryForm.athleteId && <small>{selectedAthleteAge == null ? 'Nie udało się obliczyć wieku zawodnika.' : `Wiek zawodnika w dniu zawodów: ${selectedAthleteAge} lat`}</small>}</label>
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
                  <div className="schedule-editor-info"><strong>{competition?.name || 'Konkurencja'}</strong><span>{slot.category}</span><small>{slot.athleteCount} zawodników • ok. {slot.durationMinutes} min{slot.manual ? ' • ustawione ręcznie' : ' • automat'}</small></div>
                  <label>Start<input type="time" value={slot.startTime} onChange={(e) => updateScheduleSlot(slot.id, { startTime: e.target.value })} /></label>
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
              <div className="schedule-time"><strong>{entry.estimatedStart || '—'}</strong><small>{entry.mat || '—'}</small></div>
              <AthleteAvatar athlete={entry.athlete} />
              <div className="schedule-person"><strong>{entry.athlete ? `${entry.athlete.firstName} ${entry.athlete.lastName}` : 'Nieznany zawodnik'}</strong><span>{entry.competition?.name || '—'} • {entry.category || '—'}</span></div>
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
          <label>Kategoria kata<select required value={kataForm.categoryId} onChange={(e) => setKataForm({ ...kataForm, categoryId: e.target.value })}><option value="">Wybierz kategorię</option>{categories.filter((category) => competitions.find((c) => c.id === category.competitionId)?.group === 'Kata').map((category) => { const competition = competitions.find((c) => c.id === category.competitionId); const slot = schedule.find((item) => item.competitionId === category.competitionId && item.category === category.name); return <option value={category.id} key={category.id}>{competition?.name} — {category.name}{slot?.mat ? ` • ${slot.mat}` : ''}</option> })}</select></label>
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
                <a className="btn btn-outline" href={`/organizator/kata-sedzia/${encodeURIComponent(selectedKataSession.mat)}?sessionId=${encodeURIComponent(selectedKataSession.id)}`} target="_blank" rel="noreferrer">Panel sędziego kata</a>
                <a className="btn btn-primary" href={`/tatami/${encodeURIComponent(selectedKataSession.mat)}`} target="_blank" rel="noreferrer">Tablica TV • {selectedKataSession.mat}</a>
                <button type="button" className="btn btn-ghost" onClick={() => { if (confirm('Usunąć listę startową i wszystkie zapisane oceny tej kategorii?')) { db.resetKataSession(selectedKataSession.id); setSelectedKataSessionId(''); refresh() } }}>Usuń listę</button>
              </div>
            </div>
            <div className="kata-admin-list">
              {selectedKataSession.results.slice().sort((a, b) => a.order - b.order).map((result) => { const athlete = athletes.find((item) => item.id === result.athleteId); const club = athlete ? clubs.find((item) => item.id === athlete.clubId) : null; return <article key={result.athleteId} className={`kata-admin-row ${result.status}`}><b>{result.order}</b><div><strong>{athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Nieznany zawodnik'}</strong><span>{club?.shortName || club?.name || ''}</span></div><em>{result.status === 'done' ? `Ocena: ${scoreText(result.finalScore)}` : result.status === 'active' ? 'TERAZ' : 'Oczekuje'}</em></article> })}
            </div>
          </>
        ) : <EmptyState title="Brak listy startowej kata" text="Wybierz kategorię kata i wylosuj kolejność. Następnie otwórz panel sędziego." />}
      </section>

      <section className="panel-section bracket-admin-section">
        <div className="panel-section-head"><div><span className="eyebrow">Kumite</span><h2>Drabinka + automatyczna tablica przy tatami</h2><p>Utwórz drabinkę z zawodników przypisanych do tej samej konkurencji, kategorii i tatami.</p></div></div>
        <form className="bracket-builder" onSubmit={createBracket}>
          <label>Kategoria kumite<select required value={bracketForm.categoryId} onChange={(e) => setBracketForm({ categoryId: e.target.value })}><option value="">Wybierz kategorię</option>{categories.filter((category) => competitions.find((c) => c.id === category.competitionId)?.group === 'Kumite').map((category) => { const competition = competitions.find((c) => c.id === category.competitionId); const slot = schedule.find((item) => item.competitionId === category.competitionId && item.category === category.name); return <option value={category.id} key={category.id}>{competition?.name} — {category.name}{slot?.mat ? ` • ${slot.mat}` : ''}</option> })}</select></label>
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
                <a className="btn btn-outline" href={`/organizator/sedzia/${encodeURIComponent(selected.mat)}?competitionId=${encodeURIComponent(selected.competitionId)}&category=${encodeURIComponent(selected.category)}`} target="_blank" rel="noreferrer">Panel sędziego</a>
                <a className="btn btn-primary" href={`/tatami/${encodeURIComponent(selected.mat)}`} target="_blank" rel="noreferrer">Tablica TV • {selected.mat}</a>
                <button type="button" className="btn btn-ghost" onClick={() => { if (confirm('Usunąć tę drabinkę?')) { db.resetBracket(selected); setSelectedBracket(''); refresh() } }}>Usuń drabinkę</button>
              </div>
            </div>
            <div className="match-control-list">
              {selectedMatches.map((raw) => {
                const match = resolveMatch(raw, matches)
                const ready = match.redResolvedId && match.blueResolvedId
                const remaining = getComputedRemaining(raw)
                return (
                  <article className={`match-control ${raw.status === 'active' ? 'match-control-active' : ''}`} key={raw.id}>
                    <div className="match-control-head"><span>{raw.roundName} • walka {raw.matchNo}</span><StatusBadge status={raw.status} /></div>
                    <div className="match-versus">
                      <div className={`match-side-red ${raw.winnerId === match.redResolvedId ? 'winner-side' : ''}`}><small>{selectedSideTheme.red.code}</small><strong>{athleteName(match.redResolvedId)}</strong><b>{scoreText(raw.redScore)}</b></div>
                      <span>VS</span>
                      <div className={`${selectedSideTheme.mode === 'red-white' ? 'match-side-white' : 'match-side-blue'} ${raw.winnerId === match.blueResolvedId ? 'winner-side' : ''}`}><small>{selectedSideTheme.blue.code}</small><strong>{athleteName(match.blueResolvedId)}</strong><b>{scoreText(raw.blueScore)}</b></div>
                    </div>
                    {raw.status === 'active' ? (
                      <div className="match-live-controls">
                        <div className="timer-control"><strong>{clock(remaining)}</strong><button type="button" className="btn btn-ghost btn-sm" onClick={() => { raw.timerRunning ? db.pauseMatch(raw.id) : db.resumeMatch(raw.id); refresh() }}>{raw.timerRunning ? 'Pauza' : 'Wznów'}</button></div>
                        <div className="score-controls score-controls-red"><span>{selectedSideTheme.red.code}</span><button type="button" onClick={() => { db.changeScore(raw.id, 'red', 1); refresh() }}>WAZARI +1</button><button type="button" onClick={() => { db.changeScore(raw.id, 'red', 2); refresh() }}>IPPON +2</button><button type="button" onClick={() => { db.changeScore(raw.id, 'red', -1); refresh() }}>COFNIJ −1</button></div>
                        <div className={`score-controls ${selectedSideTheme.mode === 'red-white' ? 'score-controls-white' : 'score-controls-blue'}`}><span>{selectedSideTheme.blue.code}</span><button type="button" onClick={() => { db.changeScore(raw.id, 'blue', 1); refresh() }}>WAZARI +1</button><button type="button" onClick={() => { db.changeScore(raw.id, 'blue', 2); refresh() }}>IPPON +2</button><button type="button" onClick={() => { db.changeScore(raw.id, 'blue', -1); refresh() }}>COFNIJ −1</button></div>
                        <div className="winner-controls"><span>Zakończ walkę — zwycięzca:</span><button type="button" className="btn btn-outline" onClick={() => finishMatch(raw, match.redResolvedId)}>{selectedSideTheme.red.code} — {athleteName(match.redResolvedId)}</button><button type="button" className="btn btn-outline" onClick={() => finishMatch(raw, match.blueResolvedId)}>{selectedSideTheme.blue.code} — {athleteName(match.blueResolvedId)}</button></div>
                      </div>
                    ) : raw.status === 'done' ? (
                      <div className="match-result">Zwycięzca: <strong>{athleteName(raw.winnerId)}</strong> — system przeniósł go do kolejnej rundy.</div>
                    ) : (
                      <div className="match-waiting"><span>{ready ? 'Walka gotowa do rozpoczęcia.' : 'Oczekiwanie na zwycięzcę wcześniejszej walki.'}</span><button type="button" disabled={!ready} className="btn btn-primary btn-sm" onClick={() => startMatch(raw)}>Rozpocznij walkę</button></div>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        ) : <EmptyState title="Brak drabinki" text="Po utworzeniu drabinki tutaj pojawią się walki, sterowanie punktami i automatyczne przejścia zwycięzców." />}
      </section>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Aplikacja</span><h2>Aktualności i komunikaty</h2><p>Publikuj ważne informacje i komunikaty dotyczące zawodów bezpośrednio w systemie.</p></div><a className="btn btn-outline" href="/aktualnosci" target="_blank" rel="noreferrer">Otwórz aktualności</a></div>
        <form className="form-grid" onSubmit={addNews}>
          <label className="span-2">Tytuł<input required value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} /></label>
          <label>Data<input type="date" required value={newsForm.date} onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={newsForm.important} onChange={(e) => setNewsForm({ ...newsForm, important: e.target.checked })} /> Oznacz jako ważne</label>
          <label className="span-2">Treść<textarea required rows="4" value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} /></label>
          <button className="btn btn-primary span-2">Opublikuj</button>
        </form>
        {!!news.length && <div className="simple-admin-list">{news.map((n) => <div key={n.id}><div><strong>{n.important ? 'WAŻNE • ' : ''}{n.title}</strong><span>{n.date}</span></div><button type="button" className="link-btn danger" onClick={() => { db.deleteNewsItem(n.id); refresh() }}>Usuń</button></div>)}</div>}
      </section>

      <section className="panel-section">
        <div className="panel-section-head"><div><span className="eyebrow">Katalog</span><h2>Konkurencje IKA Poland</h2><p>Możesz wyłączyć konkurencję na dany turniej albo dopisać nową.</p></div></div>
        <div className="catalog-list">
          {competitions.map((c) => <div className="catalog-row" key={c.id}><div><strong>{c.name}</strong><small>{c.group}</small></div><label className="switch"><input type="checkbox" checked={c.active} onChange={() => toggleCompetition(c.id)} /><span /></label></div>)}
        </div>
        <form className="add-competition" onSubmit={addCompetition}>
          <input value={newCompetition.name} onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })} placeholder="Nazwa nowej konkurencji" />
          <select value={newCompetition.group} onChange={(e) => setNewCompetition({ ...newCompetition, group: e.target.value })}><option>Kata</option><option>Kumite</option><option>Dzieci</option><option>Para Karate</option><option>Pozostałe</option></select>
          <button className="btn btn-outline">+ Dodaj konkurencję</button>
        </form>
      </section>
    </DashboardLayout>
  )
}
