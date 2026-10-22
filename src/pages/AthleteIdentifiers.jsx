import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout, EmptyState } from '../components/Layout'
import { db } from '../lib/demoStore'

const padNumber = (value) => String(Number(value || 0)).padStart(3, '0')

const isRegistrationClosed = (deadline) => {
  if (!deadline) return false
  const end = new Date(deadline).getTime()
  return Number.isFinite(end) && end <= Date.now()
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function AthleteIdentifierCard({ row, tournament, onPrintOne }) {
  const lookupUrl = `${window.location.origin}/rodzic?athlete=${encodeURIComponent(row.athlete.id)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(lookupUrl)}`

  return (
    <article className="athlete-id-card" data-athlete-id={row.athlete.id}>
      <div className="athlete-id-top">
        <div className="athlete-id-brand">
          <strong><span>IKA</span> POLAND</strong>
          <small>IDENTYFIKATOR ZAWODNIKA</small>
        </div>
        <img src="/ika-poland-logo.jpg" alt="IKA Poland" />
      </div>

      <div className="athlete-id-event">
        <span>{tournament.name}</span>
        <small>{formatDate(tournament.date)}{tournament.venue ? ` • ${tournament.venue}` : ''}</small>
      </div>

      <div className="athlete-id-main">
        <div className="athlete-id-photo">
          {row.athlete.photo ? (
            <img src={row.athlete.photo} alt={`${row.athlete.firstName} ${row.athlete.lastName}`} />
          ) : (
            <div className="athlete-id-photo-fallback">{`${row.athlete.firstName?.[0] || ''}${row.athlete.lastName?.[0] || ''}`}</div>
          )}
        </div>
        <div className="athlete-id-number">
          <span>NUMER STARTOWY</span>
          <strong>{padNumber(row.startNumber)}</strong>
        </div>
      </div>

      <div className="athlete-id-info">
        <div className="athlete-id-field athlete-id-name">
          <small>IMIĘ I NAZWISKO</small>
          <strong>{row.athlete.firstName} {row.athlete.lastName}</strong>
        </div>
        <div className="athlete-id-field">
          <small>KLUB</small>
          <strong>{row.club?.name || row.club?.shortName || 'Klub niepodany'}</strong>
        </div>
        <div className="athlete-id-field athlete-id-country">
          <small>KRAJ</small>
          <strong>{row.club?.country || 'Polska'}</strong>
        </div>
        <div className="athlete-id-field athlete-id-categories">
          <small>{row.categories.length > 1 ? 'KATEGORIE' : 'KATEGORIA'}</small>
          <strong>{row.categories.join(' • ') || 'Brak kategorii'}</strong>
        </div>
      </div>

      <div className="athlete-id-qr-row">
        <div className="athlete-id-qr-copy">
          <span>SPRAWDŹ GODZINĘ STARTU</span>
          <strong>Zeskanuj kod QR</strong>
          <small>Aktualne tatami, konkurencje i przewidywane godziny startów.</small>
        </div>
        <div className="athlete-id-qr">
          <img src={qrUrl} alt={`Kod QR zawodnika ${row.athlete.firstName} ${row.athlete.lastName}`} referrerPolicy="no-referrer" />
        </div>
      </div>

      <div className="athlete-id-footer">
        <span>INTERNATIONAL KARATE ASSOCIATION</span>
        <strong>POLAND</strong>
      </div>

      <button className="btn btn-outline athlete-id-print-one print-screen-only" type="button" onClick={() => onPrintOne(row.athlete.id)}>
        Drukuj ten identyfikator
      </button>
    </article>
  )
}

export default function AthleteIdentifiers() {
  const [tick, setTick] = useState(0)
  const [error, setError] = useState('')
  const tournament = db.getTournament()
  const closed = isRegistrationClosed(tournament.registrationDeadline)
  const entries = db.getEntries()
  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const competitions = db.getCompetitions()

  useEffect(() => {
    if (!closed) return
    try {
      db.ensureAthleteStartNumbers()
      setTick((value) => value + 1)
    } catch (err) {
      setError(err.message || 'Nie udało się przygotować numerów startowych.')
    }
  }, [closed])

  const rows = useMemo(() => {
    if (!closed) return []
    const startNumbers = db.getTournament().athleteStartNumbers || {}
    const athleteIds = [...new Set(entries.map((entry) => entry.athleteId).filter(Boolean))]

    return athleteIds.map((athleteId) => {
      const athlete = athletes.find((item) => item.id === athleteId)
      if (!athlete) return null
      const club = clubs.find((item) => item.id === athlete.clubId) || null
      const athleteEntries = entries.filter((entry) => entry.athleteId === athleteId)
      const categories = [...new Set(athleteEntries.map((entry) => {
        const competition = competitions.find((item) => item.id === entry.competitionId)
        return `${competition?.name || 'Konkurencja'} – ${entry.category || 'Kategoria'}`
      }))]
      return {
        athlete,
        club,
        categories,
        startNumber: startNumbers[athleteId] || 0,
      }
    }).filter(Boolean).sort((a, b) => Number(a.startNumber || 0) - Number(b.startNumber || 0))
  }, [closed, entries, athletes, clubs, competitions, tick])

  const printAll = () => {
    document.body.classList.remove('print-single-identifier')
    document.querySelectorAll('.athlete-id-card.identifier-print-selected').forEach((node) => node.classList.remove('identifier-print-selected'))
    window.print()
  }

  const printOne = (athleteId) => {
    const target = document.querySelector(`.athlete-id-card[data-athlete-id="${CSS.escape(athleteId)}"]`)
    if (!target) return
    document.querySelectorAll('.athlete-id-card.identifier-print-selected').forEach((node) => node.classList.remove('identifier-print-selected'))
    target.classList.add('identifier-print-selected')
    document.body.classList.add('print-single-identifier')
    const cleanup = () => {
      document.body.classList.remove('print-single-identifier')
      target.classList.remove('identifier-print-selected')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return (
    <DashboardLayout title="Identyfikatory zawodników" organizer showHeadingActions={false}>
      <div className="identifier-page-toolbar print-screen-only">
        <div>
          <span className="eyebrow">Akredytacje zawodników</span>
          <h2>{tournament.name}</h2>
          <p>Identyfikatory są dostępne wyłącznie po zamknięciu zgłoszeń. Kod QR otwiera bezpośrednio aktualny podgląd startów konkretnego zawodnika.</p>
        </div>
        <div className="identifier-toolbar-actions">
          <a className="btn btn-outline" href="/organizator/zawody">Wróć do Centrum Zawodów</a>
          {closed && rows.length > 0 && <button className="btn btn-primary" type="button" onClick={printAll}>Drukuj wszystkie</button>}
        </div>
      </div>

      {error && <div className="alert alert-error print-screen-only">{error}</div>}

      {!closed ? (
        <section className="panel-section print-screen-only">
          <EmptyState title="Identyfikatory są jeszcze zablokowane" text="Organizator uzyska do nich dostęp automatycznie dopiero po upływie terminu zgłoszeń." />
        </section>
      ) : !rows.length ? (
        <section className="panel-section print-screen-only">
          <EmptyState title="Brak zawodników do identyfikatorów" text="Po zamknięciu zgłoszeń identyfikatory pojawią się tutaj dla wszystkich zgłoszonych zawodników." />
        </section>
      ) : (
        <section className="athlete-identifiers-grid">
          {rows.map((row) => (
            <AthleteIdentifierCard key={row.athlete.id} row={row} tournament={tournament} onPrintOne={printOne} />
          ))}
        </section>
      )}
    </DashboardLayout>
  )
}
