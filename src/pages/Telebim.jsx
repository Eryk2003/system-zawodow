import React, { useEffect, useState } from 'react'
import { getLivePayload } from '../lib/demoStore'

export default function Telebim() {
  const [payload, setPayload] = useState(() => getLivePayload())

  useEffect(() => {
    const refresh = () => setPayload(getLivePayload())
    window.addEventListener('storage', refresh)
    window.addEventListener('ika:live', refresh)
    window.addEventListener('ika:data', refresh)
    const interval = setInterval(refresh, 1500)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ika:live', refresh)
      window.removeEventListener('ika:data', refresh)
      clearInterval(interval)
    }
  }, [])

  if (!payload) {
    return (
      <main className="telebim telebim-idle">
        <div className="telebim-logo">IKA POLAND</div>
        <h1>Za chwilę kolejny start</h1>
        <p>Oczekiwanie na wywołanie zawodnika</p>
      </main>
    )
  }

  const { athlete, club, competition, entry, tournament } = payload
  return (
    <main className="telebim">
      <div className="telebim-top">
        <div><strong>IKA POLAND</strong><span>{tournament.name}</span></div>
        <div className="telebim-now"><span /> TERAZ STARTUJE</div>
      </div>
      <div className="telebim-body">
        <div className="telebim-photo-wrap">
          {athlete.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div className="telebim-photo-fallback">{athlete.firstName?.[0]}{athlete.lastName?.[0]}</div>}
        </div>
        <div className="telebim-info">
          <span className="telebim-label">ZAWODNIK</span>
          <h1>{athlete.firstName}<br />{athlete.lastName}</h1>
          <p className="telebim-club">{club?.name || 'Klub IKA Poland'}</p>
          <div className="telebim-grid">
            <div><span>Konkurencja</span><strong>{competition?.name || '—'}</strong></div>
            <div><span>Kategoria</span><strong>{entry.category || '—'}</strong></div>
            <div><span>Stanowisko</span><strong>{entry.mat || '—'}</strong></div>
            <div><span>Planowana godzina</span><strong>{entry.estimatedStart || '—'}</strong></div>
          </div>
        </div>
      </div>
      <div className="telebim-footer">International Karate Association Poland</div>
    </main>
  )
}
