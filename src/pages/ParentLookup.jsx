import React, { useEffect, useMemo, useState } from 'react'
import { PublicHeader, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { db } from '../lib/demoStore'

const etaText = (entry) => {
  if (entry.liveStatus === 'active') return 'start teraz'
  if (!Number.isFinite(entry.etaMinutes)) return ''
  if (entry.etaMinutes <= 0) return 'za chwilę'
  if (entry.etaMinutes === 1) return 'za około 1 minutę'
  return `za około ${entry.etaMinutes} min`
}

export default function ParentLookup() {
  const [name, setName] = useState('')
  const [activeName, setActiveName] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [selectedMat, setSelectedMat] = useState('')
  const [matRows, setMatRows] = useState([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const tournament = db.getTournament()
  const matOptions = useMemo(
    () => Array.from({ length: Math.max(1, Number(tournament.matCount) || 1) }, (_, index) => `Tatami ${index + 1}`),
    [tournament.matCount],
  )

  useEffect(() => {
    if (matOptions.length > 1 && !selectedMat) setSelectedMat(matOptions[0])
    if (selectedMat && !matOptions.includes(selectedMat)) setSelectedMat(matOptions[0] || '')
  }, [matOptions, selectedMat])

  useEffect(() => {
    const refresh = () => {
      if (activeName) setResults(db.parentLookup(activeName))
      if (selectedMat) setMatRows(db.publicTatamiLookup(selectedMat))
      else setMatRows([])
      setLastUpdate(new Date())
    }

    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('ika:data', refresh)
    window.addEventListener('ika:live', refresh)
    const interval = setInterval(refresh, 1500)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('ika:live', refresh)
      clearInterval(interval)
    }
  }, [activeName, selectedMat])

  const submit = (e) => {
    e.preventDefault()
    const next = name.trim()
    setActiveName(next)
    setResults(db.parentLookup(next))
    setSearched(true)
    setLastUpdate(new Date())
  }

  return (
    <div>
      <PublicHeader />
      <main className="public-page">
        <section className="lookup-hero">
          <span className="eyebrow">Informacja na żywo</span>
          <h1>Sprawdź start zawodnika</h1>
          <p>Wpisz imię, nazwisko albo ich fragment. System pokaże tatami, przewidywaną godzinę oraz ile minut zostało do szacowanego startu.</p>
          <form className="lookup-form" onSubmit={submit}>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Imię lub nazwisko zawodnika" />
            <button className="btn btn-primary">Sprawdź na żywo</button>
          </form>
          <small className="privacy-note">Widok aktualizuje się automatycznie wraz z przebiegiem zawodów. Podany czas jest szacunkowy i może zmienić się w trakcie turnieju.</small>
        </section>

        {matOptions.length > 1 && (
          <section className="tatami-public-picker">
            <div>
              <span className="eyebrow">Kilka tatami</span>
              <h2>Sprawdź najbliższe starty na wybranym tatami</h2>
              <p>Wybierz tatami, aby zobaczyć zawodników oczekujących na start oraz aktualne szacunki czasu.</p>
            </div>
            <label>
              Tatami
              <select value={selectedMat} onChange={(e) => setSelectedMat(e.target.value)}>
                {matOptions.map((mat) => <option value={mat} key={mat}>{mat}</option>)}
              </select>
            </label>
          </section>
        )}

        {selectedMat && matOptions.length > 1 && (
          <section className="tatami-public-list">
            <div className="tatami-public-title">
              <div><span className="eyebrow">LIVE</span><h2>{selectedMat}</h2></div>
              <small>Aktualizacja {lastUpdate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small>
            </div>
            {!matRows.length ? (
              <div className="empty-state"><div className="empty-icon">-</div><h3>Brak zaplanowanych startów</h3><p>Na tym tatami nie ma obecnie zawodników oczekujących na start.</p></div>
            ) : (
              <div className="tatami-public-rows">
                {matRows.map(({ athlete, entry }) => (
                  <article className={`tatami-public-row parent-entry-${entry.liveStatus}`} key={entry.id}>
                    <AthleteAvatar athlete={athlete} />
                    <div className="tatami-public-athlete">
                      <strong>{athlete.name}</strong>
                      <span>{entry.competitionName} • {entry.category || 'Kategoria w przygotowaniu'}</span>
                    </div>
                    <div className="tatami-public-time">
                      <small>Szacowany start</small>
                      <strong>{entry.dynamicEstimate || entry.estimatedStart || '-'}</strong>
                      {etaText(entry) && <b>{etaText(entry)}</b>}
                    </div>
                    <StatusBadge status={entry.liveStatus} label={entry.liveLabel} />
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="lookup-results">
          {searched && !results.length && <div className="empty-state"><div className="empty-icon">?</div><h3>Nie znaleziono zawodnika</h3><p>Sprawdź pisownię imienia lub nazwiska albo poproś klub o potwierdzenie zgłoszenia.</p></div>}
          {results.map(({ athlete, entries }) => (
            <article className="parent-athlete-card" key={athlete.id}>
              <div className="parent-athlete-head">
                <AthleteAvatar athlete={athlete} large />
                <div><span className="eyebrow">{tournament.name}</span><h2>{athlete.name}</h2><p>{athlete.club || 'Klub niepodany'}</p></div>
                <div className="live-refresh"><span className="live-dot active" />LIVE<small>{lastUpdate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small></div>
              </div>
              {!entries.length ? <div className="alert alert-info">Zawodnik jest w systemie, ale nie ma jeszcze przypisanych konkurencji.</div> : (
                <div className="parent-entry-list">
                  {entries.map((entry) => (
                    <div className={`parent-entry parent-entry-${entry.liveStatus}`} key={entry.id}>
                      <div className="parent-main-info">
                        <strong>{entry.competitionName}</strong>
                        <span>{entry.category || 'Kategoria w przygotowaniu'} • {entry.mat || 'Tatami w przygotowaniu'}</span>
                        <small>Na tatami teraz: <b>{entry.currentOnMat}</b></small>
                      </div>
                      <div className="fights-counter">
                        <small>Do startu</small>
                        {entry.liveStatus === 'done' ? <strong>-</strong> : entry.liveStatus === 'active' ? <strong>TERAZ</strong> : Number.isInteger(entry.fightsRemaining) ? <strong>{entry.fightsRemaining}</strong> : <strong>-</strong>}
                        <span>{entry.liveStatus === 'active' ? 'walka trwa' : entry.liveStatus === 'done' ? 'zakończono' : entry.fightsRemaining === 1 ? 'walka' : 'walk'}</span>
                      </div>
                      <div className="parent-time">
                        <small>Szacowany start</small>
                        <strong>{entry.dynamicEstimate || entry.estimatedStart || '-'}</strong>
                        {etaText(entry) && <b className="eta-minutes">{etaText(entry)}</b>}
                      </div>
                      <StatusBadge status={entry.liveStatus} label={entry.liveLabel} />
                    </div>
                  ))}
                </div>
              )}
              <div className="time-warning">Szacunek jest liczony z aktualnej kolejki walk, pozostałego czasu aktywnej walki i czasu pojedynku ustawionego dla kategorii. Przerwy sędziowskie i zmiany organizacyjne mogą go przesunąć.</div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
