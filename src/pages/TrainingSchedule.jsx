import React, { useEffect, useState } from 'react'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'

export default function TrainingSchedule() {
  const [groups, setGroups] = useState(() => db.getTrainingGroups())
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const refresh = () => setGroups(db.getTrainingGroups())
    window.addEventListener('storage', refresh)
    window.addEventListener('ika:data', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ika:data', refresh)
    }
  }, [])

  return (
    <div>
      <PublicHeader />
      <main className="public-page schedule-page">
        <section className="lookup-hero">
          <span className="eyebrow">Grafik IKA Poland</span>
          <h1>Treningi i grupy</h1>
          <p>Kliknij grupę albo najedź na nią kursorem, aby zobaczyć pełne informacje o treningach.</p>
        </section>

        {!groups.length ? (
          <div className="empty-state"><div className="empty-icon">⌁</div><h3>Grafik nie został jeszcze opublikowany</h3><p>Po dodaniu grup przez organizatora pojawią się tutaj dni, godziny, miejsce i prowadzący.</p></div>
        ) : (
          <section className="training-grid">
            {groups.map((group) => {
              const open = openId === group.id
              return (
                <article
                  className={`training-card ${open ? 'training-card-open' : ''}`}
                  key={group.id}
                  tabIndex="0"
                  onClick={() => setOpenId(open ? null : group.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenId(open ? null : group.id) }}
                >
                  <div className="training-card-top">
                    <div><span className="eyebrow">Grupa</span><h2>{group.name}</h2></div>
                    <span className="training-toggle">{open ? '−' : '+'}</span>
                  </div>
                  <div className="training-summary"><strong>{group.days || 'Dni do ustalenia'}</strong><span>{group.time || 'Godzina do ustalenia'}</span></div>
                  <div className="training-details">
                    <div><small>Miejsce</small><strong>{group.venue || '—'}</strong></div>
                    <div><small>Prowadzący</small><strong>{group.instructor || '—'}</strong></div>
                    {group.notes && <p>{group.notes}</p>}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}
