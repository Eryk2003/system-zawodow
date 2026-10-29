import React, { useEffect, useState } from 'react'
import { getLivePayload } from '../lib/demoStore'
import { tvCategory, tvCompetition } from '../lib/tvEnglish.js'

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
        <div className="telebim-logo"><span className="telebim-logo-ika">IKA</span> <span className="telebim-logo-poland">POLAND</span></div>
        <h1>Next competitor coming up</h1>
        <p>Waiting for the next competitor</p>
      </main>
    )
  }

  const { athlete, club, competition, entry, tournament } = payload
  return (
    <main className="telebim">
      <div className="telebim-top">
        <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{tournament.name}</span></div>
        <div className="telebim-now"><span /> NOW COMPETING</div>
      </div>
      <div className="telebim-body">
        <div className="telebim-photo-wrap">
          {athlete.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div className="telebim-photo-fallback">{athlete.firstName?.[0]}{athlete.lastName?.[0]}</div>}
        </div>
        <div className="telebim-info">
          <span className="telebim-label">COMPETITOR</span>
          <h1>{athlete.firstName}<br />{athlete.lastName}</h1>
          <p className="telebim-club">{club?.name || 'IKA Poland Club'}</p>
          <div className="telebim-grid">
            <div><span>Competition</span><strong>{tvCompetition(competition?.name || '-')}</strong></div>
            <div><span>Category</span><strong>{tvCategory(entry.category || '-')}</strong></div>
            <div><span>Tatami</span><strong>{entry.mat || '-'}</strong></div>
            <div><span>Scheduled start</span><strong>{entry.estimatedStart || '-'}</strong></div>
          </div>
        </div>
      </div>
      <div className="telebim-footer">International Karate Association Poland</div>
    </main>
  )
}
