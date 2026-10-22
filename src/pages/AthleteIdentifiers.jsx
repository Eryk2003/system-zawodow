import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLayout, EmptyState } from '../components/Layout'
import { db } from '../lib/demoStore'
import { countryName } from '../lib/countries.js'

const padNumber = (value) => String(Number(value || 0)).padStart(3, '0')

const isRegistrationClosed = (deadline) => {
  if (!deadline) return false
  const end = new Date(deadline).getTime()
  return Number.isFinite(end) && end <= Date.now()
}

const safeText = (value, fallback = '-') => String(value || '').trim() || fallback

function AthleteIdentifierCard({ row, onPrintOne }) {
  const athleteName = `${safeText(row.athlete.firstName, '')} ${safeText(row.athlete.lastName, '')}`.trim()
  const lookupUrl = `${window.location.origin}/rodzic?athlete=${encodeURIComponent(row.athlete.id)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=8&format=png&data=${encodeURIComponent(lookupUrl)}`
  const categoriesLabel = row.categories.join(' • ') || 'Brak kategorii'

  return (
    <div className="athlete-id-card-wrap" data-athlete-id={row.athlete.id}>
      <article className="athlete-id-card athlete-id-card-art" aria-label={`Identyfikator zawodnika ${athleteName}`}>
        <img className="athlete-id-template-bg" src="/ika-athlete-badge-template.png" alt="" aria-hidden="true" />

        <div className="athlete-id-dynamic-photo">
          {row.athlete.photo ? (
            <img src={row.athlete.photo} alt={athleteName} />
          ) : (
            <div className="athlete-id-dynamic-photo-fallback">
              {`${row.athlete.firstName?.[0] || ''}${row.athlete.lastName?.[0] || ''}`}
            </div>
          )}
        </div>

        <div className="athlete-id-dynamic-number" aria-label={`Numer startowy ${padNumber(row.startNumber)}`}>
          <strong>{padNumber(row.startNumber)}</strong>
        </div>

        <div className="athlete-id-dynamic-fields">
          <div className="athlete-id-dynamic-field athlete-id-dynamic-name">
            <small>Imię i nazwisko:</small>
            <strong>{athleteName}</strong>
          </div>
          <div className="athlete-id-dynamic-field">
            <small>Klub:</small>
            <strong>{row.club?.name || row.club?.shortName || 'Klub niepodany'}</strong>
          </div>
          <div className="athlete-id-dynamic-field">
            <small>Kraj:</small>
            <strong>{countryName(row.athlete.nationality || row.club?.countryCode || row.club?.country || 'PL', 'pl')}</strong>
          </div>
          <div className="athlete-id-dynamic-field athlete-id-dynamic-categories">
            <small>{row.categories.length > 1 ? 'Kategorie:' : 'Kategoria:'}</small>
            <strong>{categoriesLabel}</strong>
          </div>
        </div>

        <div className="athlete-id-dynamic-qr">
          <div className="athlete-id-dynamic-qr-code">
            <img src={qrUrl} alt={`Kod QR – starty zawodnika ${athleteName}`} referrerPolicy="no-referrer" />
          </div>
          <div className="athlete-id-dynamic-qr-caption">
            <span className="athlete-id-dynamic-qr-icon" aria-hidden="true">◷</span>
            <strong>Sprawdź<br />godzinę startu</strong>
          </div>
          <small>Zeskanuj kod QR</small>
        </div>
      </article>

      <button className="btn btn-outline athlete-id-print-one print-screen-only" type="button" onClick={() => onPrintOne(row.athlete.id)}>
        Drukuj ten identyfikator
      </button>
    </div>
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
    document.querySelectorAll('.athlete-id-card-wrap.identifier-print-selected').forEach((node) => node.classList.remove('identifier-print-selected'))
    window.print()
  }

  const printOne = (athleteId) => {
    const target = document.querySelector(`.athlete-id-card-wrap[data-athlete-id="${CSS.escape(athleteId)}"]`)
    if (!target) return
    document.querySelectorAll('.athlete-id-card-wrap.identifier-print-selected').forEach((node) => node.classList.remove('identifier-print-selected'))
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
          <p>Identyfikatory są dostępne wyłącznie po zamknięciu zgłoszeń. Każdy badge ma stały numer startowy i indywidualny QR otwierający podgląd startów LIVE konkretnego zawodnika.</p>
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
            <AthleteIdentifierCard key={row.athlete.id} row={row} onPrintOne={printOne} />
          ))}
        </section>
      )}
    </DashboardLayout>
  )
}
