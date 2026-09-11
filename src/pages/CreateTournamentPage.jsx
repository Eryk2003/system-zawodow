import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout, EmptyState } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { db, resolveMatch } from '../lib/demoStore'
import { useAuth } from '../lib/AuthContext'

const today = () => new Date().toISOString().slice(0, 10)

const ageOnDate = (birthDate, eventDate) => {
  if (!birthDate || !eventDate) return null
  const birth = new Date(`${birthDate}T00:00:00`)
  const event = new Date(`${eventDate}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) return null
  let age = event.getFullYear() - birth.getFullYear()
  const beforeBirthday = event.getMonth() < birth.getMonth() || (event.getMonth() === birth.getMonth() && event.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

const emptyCategory = { competitionId: '', name: '', gender: '', minAge: '', maxAge: '' }

export default function CreateTournamentPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const organizerClub = db.getClubForOwner(user.id)
  const [form, setForm] = useState({
    name: '',
    date: today(),
    startTime: '09:00',
    venue: '',
    avgBoutMinutes: '2',
    boutSeconds: '120',
    matCount: '3',
  })
  const [createdTournament, setCreatedTournament] = useState(null)
  const [categories, setCategories] = useState(() => db.getTournamentCategories())
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [selectedByCategory, setSelectedByCategory] = useState({})
  const [openCategoryId, setOpenCategoryId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const competitions = db.getCompetitions().filter((item) => item.active !== false)
  const allAthletes = db.getAthletes()
  const athletes = organizerClub ? db.getAthletesForClub(organizerClub.id) : []
  const entries = db.getEntries()
  const matches = db.getMatches()
  const schedule = db.getSchedule()

  const normalizeNumericInput = (value, { integer = false } = {}) => {
    let next = value.replace(',', '.').replace(/[^0-9.]/g, '')
    const firstDot = next.indexOf('.')
    if (firstDot !== -1) next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '')
    if (integer) next = next.replace(/\./g, '')
    return next
  }

  const updateMatCount = (value) => {
    setForm((current) => ({ ...current, matCount: normalizeNumericInput(value, { integer: true }) }))
  }

  const updateBoutMinutes = (value) => {
    const next = normalizeNumericInput(value)
    const parsed = Number(next)
    setForm((current) => ({
      ...current,
      avgBoutMinutes: next,
      boutSeconds: next === '' || !Number.isFinite(parsed) ? '' : String(Math.round(parsed * 60)),
    }))
  }

  const updateBoutSeconds = (value) => {
    const next = normalizeNumericInput(value, { integer: true })
    const parsed = Number(next)
    setForm((current) => ({
      ...current,
      boutSeconds: next,
      avgBoutMinutes: next === '' || !Number.isFinite(parsed) ? '' : String(Math.round((parsed / 60) * 100) / 100),
    }))
  }

  const createTournament = (event) => {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Wpisz nazwę zawodów.')
    if (!form.date) return setError('Wybierz datę zawodów.')
    if (!form.startTime) return setError('Wpisz godzinę rozpoczęcia zawodów.')
    if (!form.venue.trim()) return setError('Wpisz miejsce zawodów.')
    const matCount = Number(form.matCount)
    const avgBoutMinutes = Number(form.avgBoutMinutes)
    const boutSeconds = Number(form.boutSeconds)
    if (!Number.isInteger(matCount) || matCount < 1) return setError('Wpisz prawidłową liczbę tatami / stanowisk.')
    if (!Number.isFinite(avgBoutMinutes) || avgBoutMinutes <= 0) return setError('Wpisz prawidłowy czas walki w minutach.')
    if (!Number.isInteger(boutSeconds) || boutSeconds < 1) return setError('Wpisz prawidłowy czas walki w sekundach.')

    const created = db.createTournament({
      ...form,
      matCount,
      avgBoutMinutes,
      boutSeconds,
      name: form.name.trim(),
      venue: form.venue.trim(),
      competitionIds: [],
      createdByAccountId: user.id,
      organizerClubId: organizerClub?.id || null,
    })
    setCreatedTournament(created)
    setCategories([])
    setSelectedByCategory({})
    setMessage('Zawody zostały utworzone. Teraz dodaj kategorie.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addCategory = (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const competition = competitions.find((item) => item.id === categoryForm.competitionId)
    if (!competition) return setError('Wybierz konkurencję dla kategorii.')
    if (!categoryForm.name.trim()) return setError('Wpisz nazwę kategorii.')
    if (!['K', 'M'].includes(categoryForm.gender)) return setError('Wybierz płeć kategorii: Kobieta albo Mężczyzna.')
    const duplicate = categories.some((item) => item.competitionId === categoryForm.competitionId && item.name.toLocaleLowerCase('pl') === categoryForm.name.trim().toLocaleLowerCase('pl'))
    if (duplicate) return setError('Taka kategoria w tej konkurencji już istnieje.')

    const competitionMaxAge = competition.maxAge == null ? null : Number(competition.maxAge)
    const requestedMaxAge = categoryForm.maxAge === '' ? null : Number(categoryForm.maxAge)
    const saved = db.saveTournamentCategory({
      ...categoryForm,
      name: categoryForm.name.trim(),
      maxAge: competitionMaxAge == null ? requestedMaxAge : (requestedMaxAge == null ? competitionMaxAge : Math.min(competitionMaxAge, requestedMaxAge)),
    })
    setCategories(db.getTournamentCategories())
    setCategoryForm(emptyCategory)
    setOpenCategoryId(saved.id)
    setSelectedByCategory((current) => ({ ...current, [saved.id]: new Set() }))
    setMessage(`Kategoria „${saved.name}” została dodana. Teraz wybierz zawodników.`)
  }

  const categoryEntries = (category) => entries.filter((entry) => entry.categoryId === category.id || (entry.competitionId === category.competitionId && entry.category === category.name))

  const getSelectedSet = (category) => {
    if (selectedByCategory[category.id]) return selectedByCategory[category.id]
    const ownIds = new Set(athletes.map((athlete) => athlete.id))
    return new Set(categoryEntries(category).filter((entry) => ownIds.has(entry.athleteId)).map((entry) => entry.athleteId))
  }

  const eligibleAthletes = (category) => {
    const competition = competitions.find((item) => item.id === category.competitionId)
    const maxAge = category.maxAge ?? competition?.maxAge ?? null
    return athletes.filter((athlete) => {
      const age = ageOnDate(athlete.birthDate, createdTournament?.date)
      if (['K', 'M'].includes(category.gender) && athlete.gender !== category.gender) return false
      if (category.minAge != null && age != null && age < Number(category.minAge)) return false
      if (maxAge != null && age != null && age > Number(maxAge)) return false
      return true
    })
  }

  const toggleAthlete = (category, athleteId) => {
    const current = new Set(getSelectedSet(category))
    if (current.has(athleteId)) current.delete(athleteId)
    else current.add(athleteId)
    setSelectedByCategory((previous) => ({ ...previous, [category.id]: current }))
  }

  const saveCategoryAthletes = (category) => {
    setError('')
    const selected = [...getSelectedSet(category)]
    db.setCategoryAthletesForClub(category.id, organizerClub.id, selected)
    setSelectedByCategory((previous) => ({ ...previous, [category.id]: new Set(selected) }))
    setMessage(`Zapisano ${selected.length} zawodników w kategorii „${category.name}”. Harmonogram został przeliczony automatycznie.`)
    setRefreshKey((value) => value + 1)
  }

  const drawBracket = (category) => {
    setError('')
    setMessage('')
    try {
      const currentEntries = db.getEntries().filter((entry) => entry.categoryId === category.id || (entry.competitionId === category.competitionId && entry.category === category.name))
      if (currentEntries.length < 2) throw new Error('Do losowania drabinki potrzeba co najmniej 2 zapisanych zawodników.')
      const slot = db.getSchedule().find((item) => item.competitionId === category.competitionId && item.category === category.name)
      if (!slot?.mat) throw new Error('Najpierw zapisz zawodników, aby system przydzielił kategorię do tatami.')
      db.generateBracket({ competitionId: category.competitionId, category: category.name, categoryId: category.id, mat: slot.mat, shuffle: true })
      setMessage(`Drabinka kategorii „${category.name}” została wylosowana losowo. Możesz losować ponownie albo przejść do obsługi zawodów.`)
      setRefreshKey((value) => value + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteCategory = (category) => {
    if (!confirm(`Usunąć kategorię „${category.name}” wraz ze zgłoszeniami i drabinką?`)) return
    db.deleteTournamentCategory(category.id)
    setCategories(db.getTournamentCategories())
    setSelectedByCategory((previous) => {
      const next = { ...previous }
      delete next[category.id]
      return next
    })
    setMessage('Kategoria została usunięta.')
    setRefreshKey((value) => value + 1)
  }

  const athleteName = (id) => {
    const athlete = allAthletes.find((item) => item.id === id)
    return athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Oczekiwanie'
  }

  const categoryCards = useMemo(() => categories.map((category) => {
    const competition = competitions.find((item) => item.id === category.competitionId)
    const slot = schedule.find((item) => item.competitionId === category.competitionId && item.category === category.name)
    const categoryMatches = matches.filter((match) => match.categoryId === category.id || (match.competitionId === category.competitionId && match.category === category.name))
    return { category, competition, slot, categoryMatches }
  }), [categories, competitions, schedule, matches, refreshKey])

  if (!organizerClub) {
    return (
      <DashboardLayout title="Stwórz zawody" organizer showHeadingActions={false}>
        <EmptyState
          title="Najpierw utwórz swój klub"
          text="Konto organizatora działa jednocześnie jako konto klubu. Utwórz profil swojego klubu i dodaj zawodników. Podczas zgłaszania do zawodów zobaczysz wyłącznie swoich zawodników."
          action={<Link className="btn btn-primary" to="/organizator/klub">Utwórz mój klub i dodaj zawodników</Link>}
        />
      </DashboardLayout>
    )
  }

  if (createdTournament) {
    return (
      <DashboardLayout title={createdTournament.name} organizer showHeadingActions={false}>
        <div className="organizer-banner tournament-created-banner">
          <div>
            <span className="eyebrow">Zawody utworzone</span>
            <h2>{createdTournament.name}</h2>
            <p>{createdTournament.date} • {createdTournament.startTime} • {createdTournament.venue}</p>
          </div>
          <div className="live-control">{createdTournament.matCount} tatami • {createdTournament.boutSeconds} sek. walki</div>
        </div>

        <div className="tournament-flow-steps">
          <div className="flow-step done"><b>1</b><span>Zawody</span></div>
          <div className="flow-step active"><b>2</b><span>Kategorie</span></div>
          <div className="flow-step"><b>3</b><span>Zawodnicy</span></div>
          <div className="flow-step"><b>4</b><span>Losowanie drabinki</span></div>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <section className="panel-section category-create-section">
          <div className="panel-section-head">
            <div><span className="eyebrow">Krok 2</span><h2>Dodaj kategorie do zawodów</h2><p>Najpierw tworzysz kategorię, a dopiero później wybierasz zawodników, którzy mają w niej wystartować.</p></div>
          </div>
          <form className="category-builder" onSubmit={addCategory}>
            <label>Konkurencja<select required value={categoryForm.competitionId} onChange={(event) => setCategoryForm({ ...categoryForm, competitionId: event.target.value })}><option value="">Wybierz konkurencję</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></label>
            <label className="category-name-field">Nazwa kategorii<input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="np. Chłopcy 10–11 lat, 6–5 kyu" /></label>
            <label>Płeć<select required value={categoryForm.gender} onChange={(event) => setCategoryForm({ ...categoryForm, gender: event.target.value })}><option value="">Wybierz</option><option value="K">Kobieta</option><option value="M">Mężczyzna</option></select></label>
            <label>Wiek od<input className="numeric-input" inputMode="numeric" value={categoryForm.minAge} onChange={(event) => setCategoryForm({ ...categoryForm, minAge: event.target.value.replace(/\D/g, '') })} placeholder="np. 10" /></label>
            <label>Wiek do<input className="numeric-input" inputMode="numeric" value={categoryForm.maxAge} onChange={(event) => setCategoryForm({ ...categoryForm, maxAge: event.target.value.replace(/\D/g, '') })} placeholder="np. 11" /></label>
            <button className="btn btn-primary">+ Dodaj kategorię</button>
          </form>
        </section>

        {!categories.length ? (
          <EmptyState title="Nie ma jeszcze kategorii" text="Dodaj pierwszą kategorię. Następnie system pokaże listę zawodników do wyboru i przycisk losowania drabinki." />
        ) : (
          <div className="tournament-category-stack">
            {categoryCards.map(({ category, competition, slot, categoryMatches }) => {
              const selectedSet = getSelectedSet(category)
              const candidates = eligibleAthletes(category)
              const isOpen = openCategoryId === category.id
              const isKumite = competition?.group === 'Kumite'
              const firstRound = categoryMatches.filter((match) => match.roundIndex === Math.min(...categoryMatches.map((item) => item.roundIndex)))
              const allMatches = db.getMatches()
              return (
                <section className="panel-section tournament-category-card" key={category.id}>
                  <div className="category-card-head">
                    <div>
                      <span className="eyebrow">{competition?.name || 'Konkurencja'}</span>
                      <h2>{category.name}</h2>
                      <p>{slot ? `${slot.startTime} • ${slot.mat} • ${slot.athleteCount} zawodników` : 'Brak zawodników — harmonogram pojawi się po zapisaniu składu.'}</p>
                    </div>
                    <div className="category-card-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setOpenCategoryId(isOpen ? null : category.id)}>{isOpen ? 'Zwiń zawodników' : 'Wybierz zawodników'}</button>
                      <button type="button" className="link-btn danger" onClick={() => deleteCategory(category)}>Usuń kategorię</button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="category-athlete-picker">
                      <div className="category-subhead"><div><span className="eyebrow">Krok 3 • {organizerClub?.shortName || organizerClub?.name}</span><h3>Zgłoś swoich zawodników</h3><p>Widzisz tylko zawodników należących do Twojego klubu.</p></div><strong>{selectedSet.size} wybranych</strong></div>
                      {!candidates.length ? (
                        <div className="alert alert-info">Brak zawodników z Twojego klubu spełniających kryteria tej kategorii. <Link to="/organizator/klub">Dodaj zawodnika w swoim klubie</Link>.</div>
                      ) : (
                        <div className="athlete-checkbox-grid">
                          {candidates.map((athlete) => {
                            const checked = selectedSet.has(athlete.id)
                            return (
                              <label className={`athlete-checkbox-card ${checked ? 'selected' : ''}`} key={athlete.id}>
                                <input type="checkbox" checked={checked} onChange={() => toggleAthlete(category, athlete.id)} />
                                <AthleteAvatar athlete={athlete} />
                                <span><strong>{athlete.firstName} {athlete.lastName}</strong><small>{organizerClub?.shortName || organizerClub?.name || 'Twój klub'} • {ageOnDate(athlete.birthDate, createdTournament.date) ?? '—'} lat</small></span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                      <div className="category-selection-actions">
                        <button type="button" className="btn btn-primary" onClick={() => saveCategoryAthletes(category)}>Zapisz zawodników</button>
                        <small>Po zapisaniu system automatycznie ustawi kategorię w harmonogramie i przydzieli tatami.</small>
                      </div>
                    </div>
                  )}

                  <div className="category-draw-zone">
                    <div>
                      <span className="eyebrow">Krok 4</span>
                      <h3>{isKumite ? 'Losowanie drabinki' : 'Lista startowa'}</h3>
                      <p>{isKumite ? 'Po zapisaniu zawodników kliknij losowanie. Kolejność zawodników w drabince zostanie ustalona losowo.' : 'Ta konkurencja nie korzysta z drabinki kumite. Zawodnicy są już przypisani do kategorii.'}</p>
                    </div>
                    {isKumite && <button type="button" className="btn btn-primary" disabled={categoryEntries(category).length < 2} onClick={() => drawBracket(category)}>{categoryMatches.length ? 'Losuj drabinkę ponownie' : 'Losuj drabinkę'}</button>}
                  </div>

                  {isKumite && categoryMatches.length > 0 && (
                    <div className="draw-preview">
                      <div className="draw-preview-head"><strong>Wylosowana drabinka</strong><span>{slot?.mat || 'Tatami'} • {categoryMatches.length} walk</span></div>
                      <div className="draw-pairs">
                        {firstRound.map((raw) => {
                          const match = resolveMatch(raw, allMatches)
                          return <div className="draw-pair" key={raw.id}><small>{raw.roundName} • walka {raw.matchNo}</small><strong>{athleteName(match.redResolvedId)}</strong><span>vs</span><strong>{athleteName(match.blueResolvedId)}</strong></div>
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        <div className="create-tournament-actions post-create-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/organizator')}>Wróć</button>
          <button type="button" className="btn btn-primary" disabled={!categories.length} onClick={() => navigate('/organizator/zawody')}>Przejdź do harmonogramu, sędziego i TV →</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Stwórz zawody" organizer showHeadingActions={false}>
      <form className="create-tournament-shell" onSubmit={createTournament}>
        <section className="create-tournament-section">
          <div className="create-section-head">
            <span className="create-step">1</span>
            <div><h2>Utwórz zawody</h2><p>Na tym etapie wpisujesz tylko dane wydarzenia. Kategorie dodasz dopiero po utworzeniu zawodów.</p></div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid tournament-create-grid">
            <label className="span-2">Nazwa zawodów<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="np. IKA Poland Open 2027" /></label>
            <label>Data zawodów<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
            <label>Godzina rozpoczęcia<input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label className="span-2">Miejsce zawodów<input required value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} placeholder="np. Hala Sportowa, Raszyn" /></label>
            <label>Liczba tatami / stanowisk<input className="numeric-input" inputMode="numeric" value={form.matCount} onChange={(event) => updateMatCount(event.target.value)} placeholder="np. 5" /></label>
            <label>Czas walki (min)<input className="numeric-input" inputMode="decimal" value={form.avgBoutMinutes} onChange={(event) => updateBoutMinutes(event.target.value)} placeholder="np. 1" /></label>
            <label>Czas walki (sek.)<input className="numeric-input" inputMode="numeric" value={form.boutSeconds} onChange={(event) => updateBoutSeconds(event.target.value)} placeholder="np. 60" /><small className="field-hint">Sekundy przeliczają się automatycznie z minut, np. 1 min = 60 sek.</small></label>
          </div>
        </section>

        <div className="create-tournament-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/organizator')}>Anuluj</button>
          <button className="btn btn-primary">Utwórz zawody →</button>
        </div>
      </form>
    </DashboardLayout>
  )
}
