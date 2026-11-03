import React from 'react'
import { db } from '../lib/demoStore'
import './AthleteIdentifierModern.css'

const padNumber = (value) => String(Number(value || 0)).padStart(3, '0')
const safeText = (value, fallback = '-') => String(value || '').trim() || fallback

const eventDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

// Dane zawodów pochodzą z istniejącej konfiguracji. QR i numery nie są modyfikowane.
export default function AthleteIdentifierModern({ row, onPrintOne }) {
  const tournament = db.getTournament()
  const athlete = row.athlete || {}
  const athleteName = `${safeText(athlete.firstName, '')} ${safeText(athlete.lastName, '')}`.trim()
  const club = row.club?.name || row.club?.shortName || 'Klub niepodany'
  const country = row.club?.country || 'Polska'
  const lookupUrl = `${window.location.origin}/zawodnik?athlete=${encodeURIComponent(athlete.id)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=8&format=png&data=${encodeURIComponent(lookupUrl)}`
  const initials = `${athlete.firstName?.[0] || ''}${athlete.lastName?.[0] || ''}`.toUpperCase()
  const categories = row.categories || []
  const list = categories.slice(0, 2)
  const extraCategories = Math.max(0, categories.length - list.length)
  const date = eventDate(tournament?.date)
  const start = String(tournament?.startTime || '').trim()
  const venue = String(tournament?.venue || '').trim()
  const eventName = String(tournament?.name || 'Zawody karate').trim()
  const scheduleInfo = [date, start ? `godz. ${start}` : ''].filter(Boolean).join(' • ')

  return (
    <div className="athlete-id-card-wrap" data-athlete-id={athlete.id}>
      <article className="athlete-id-card athlete-id-card-art ika-badge-modern ika-badge-event" aria-label={`Identyfikator zawodnika ${athleteName}`}>
        <div className="ika-badge-top">
          <div className="ika-badge-brand ika-badge-event-name">
            <strong>{eventName}</strong>
          </div>
          <div className="ika-badge-tag">ZAWODNIK</div>
        </div>

        <div className="ika-badge-event-details">
          {scheduleInfo && <span><b>DATA I START</b>{scheduleInfo}</span>}
          {venue && <span><b>MIEJSCE</b>{venue}</span>}
        </div>

        <div className="ika-badge-hero">
          <div className="ika-badge-photo">
            {athlete.photo ? <img src={athlete.photo} alt={athleteName} /> : <span>{initials}</span>}
          </div>
          <div className="ika-badge-number-wrap">
            <span>NUMER STARTOWY</span>
            <strong>{padNumber(row.startNumber)}</strong>
            <div className="ika-badge-stripe" />
          </div>
        </div>

        <div className="ika-badge-name">
          <small>IMIĘ I NAZWISKO</small>
          <strong>{athleteName}</strong>
        </div>

        <div className="ika-badge-meta">
          <div><small>KLUB</small><strong>{club}</strong></div>
          <div><small>KRAJ</small><strong>{country}</strong></div>
        </div>

        <div className="ika-badge-bottom">
          <div className="ika-badge-categories">
            <small>{categories.length > 1 ? 'KONKURENCJE I KATEGORIE' : 'KONKURENCJA I KATEGORIA'}</small>
            {list.length ? list.map((c, i) => <strong key={i}>{c}</strong>) : <strong>Brak kategorii</strong>}
            {extraCategories > 0 && <em>+ {extraCategories} kolejne {extraCategories === 1 ? 'kategoria' : 'kategorie'}</em>}
          </div>
          <div className="ika-badge-qr">
            <img src={qrUrl} alt={`Kod QR - starty zawodnika ${athleteName}`} referrerPolicy="no-referrer" />
            <span>SKANUJ QR</span>
          </div>
        </div>
        <div className="ika-badge-footer">GODZINY STARTÓW I TATAMI — ZESKANUJ QR</div>
      </article>
      <button className="btn btn-outline athlete-id-print-one print-screen-only" type="button" onClick={() => onPrintOne(athlete.id)}>
        Drukuj ten identyfikator
      </button>
    </div>
  )
}
