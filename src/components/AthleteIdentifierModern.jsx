import React from 'react'
import './AthleteIdentifierModern.css'

const padNumber = (value) => String(Number(value || 0)).padStart(3, '0')
const safeText = (value, fallback = '-') => String(value || '').trim() || fallback

/** IKA Poland - wizualizacja identyfikatora. Bez zmiany QR, numerow i logiki wydruku. */
export default function AthleteIdentifierModern({ row, onPrintOne }) {
  const athlete = row.athlete || {}
  const athleteName = `${safeText(athlete.firstName, '')} ${safeText(athlete.lastName, '')}`.trim()
  const club = row.club?.name || row.club?.shortName || 'Klub niepodany'
  const country = row.club?.country || 'Polska'
  // DOKLADNIE ten sam adres i te same parametry QR co w poprzednim identyfikatorze.
  const lookupUrl = `${window.location.origin}/zawodnik?athlete=${encodeURIComponent(athlete.id)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=8&format=png&data=${encodeURIComponent(lookupUrl)}`
  const initials = `${athlete.firstName?.[0] || ''}${athlete.lastName?.[0] || ''}`.toUpperCase()
  const categories = row.categories || []
  const list = categories.slice(0, 2)
  const extraCategories = Math.max(0, categories.length - list.length)
  return (
    <div className="athlete-id-card-wrap" data-athlete-id={athlete.id}>
      <article className="athlete-id-card athlete-id-card-art ika-badge-modern" aria-label={`Identyfikator zawodnika ${athleteName}`}>
        <div className="ika-badge-top">
          <div className="ika-badge-brand">
            <img src="/ika-poland-logo.jpg" alt="IKA Poland" />
            <div><strong>IKA <span>POLAND</span></strong><small>SYSTEM ZAWODÓW</small></div>
          </div>
          <div className="ika-badge-tag">ZAWODNIK</div>
        </div>

        <div className="ika-badge-hero">
          <div className="ika-badge-photo">
            {athlete.photo ? <img src={athlete.photo} alt={athleteName} /> : <span>{initials}</span>}
          </div>
          <div className="ika-badge-number-wrap">
            <span>NUMER STARTOWY</span>
            <strong>{padNumber(row.startNumber)}</strong>
            <div className="ika-badge-stripe" />
            <small>OFFICIAL COMPETITOR</small>
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
        <div className="ika-badge-footer">SPRAWDŹ GODZINY STARTÓW I STATUS ZAWODNIKA</div>
      </article>
      <button className="btn btn-outline athlete-id-print-one print-screen-only" type="button" onClick={() => onPrintOne(athlete.id)}>
        Drukuj ten identyfikator
      </button>
    </div>
  )
}
