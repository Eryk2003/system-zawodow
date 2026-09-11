import React, { useEffect, useState } from 'react'
import { PublicHeader, StatusBadge } from '../components/Layout'
import AthleteAvatar from '../components/AthleteAvatar'
import { db } from '../lib/demoStore'

export default function ParentLookup() {
  const [name, setName] = useState('')
  const [activeName, setActiveName] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const tournament = db.getTournament()

  useEffect(() => {
    if (!activeName) return undefined
    const refresh = () => {
      setResults(db.parentLookup(activeName))
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
  }, [activeName])

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
          <p>Wpisz pełne imię i nazwisko. System pokazuje przewidywaną godzinę, tatami, aktualną konkurencję oraz liczbę walk pozostałych do startu.</p>
          <form className="lookup-form" onSubmit={submit}>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Imię i nazwisko zawodnika" />
            <button className="btn btn-primary">Sprawdź na żywo</button>
          </form>
          <small className="privacy-note">Widok aktualizuje się automatycznie wraz z przebiegiem zawodów. Godziny pozostają orientacyjne.</small>
        </section>

        <section className="lookup-results">
          {searched && !results.length && <div className="empty-state"><div className="empty-icon">?</div><h3>Nie znaleziono zawodnika</h3><p>Sprawdź pisownię imienia i nazwiska albo poproś klub o potwierdzenie zgłoszenia.</p></div>}
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
                        {entry.liveStatus === 'done' ? <strong>—</strong> : entry.liveStatus === 'active' ? <strong>TERAZ</strong> : Number.isInteger(entry.fightsRemaining) ? <strong>{entry.fightsRemaining}</strong> : <strong>—</strong>}
                        <span>{entry.liveStatus === 'active' ? 'walka trwa' : entry.liveStatus === 'done' ? 'zakończono' : entry.fightsRemaining === 1 ? 'walka' : 'walk'}</span>
                      </div>
                      <div className="parent-time"><small>Przewidywany start</small><strong>{entry.dynamicEstimate || entry.estimatedStart || '—'}</strong></div>
                      <StatusBadge status={entry.liveStatus} label={entry.liveLabel} />
                    </div>
                  ))}
                </div>
              )}
              <div className="time-warning">Przewidywana godzina jest przeliczana na podstawie aktualnego przebiegu tatami. Opóźnienia, przerwy sędziowskie i zmiany organizacyjne mogą ją przesunąć.</div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
