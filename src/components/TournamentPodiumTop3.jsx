import React from 'react'
import { tvCategory, tvCompetition } from '../lib/tvEnglish.js'

const podiumSlots = [
  { place: 2, title: '2ND PLACE', color: 'silver' },
  { place: 1, title: '1ST PLACE', color: 'gold' },
  { place: 3, title: '3RD PLACE', color: 'bronze' },
]

function MedalPerson({ placement, getAthlete }) {
  const info = getAthlete(placement.athleteId)
  const name = placement.athleteName || info?.name || 'Competitor'
  const club = placement.clubName || info?.club || ''
  const photo = info?.photo || ''
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  return (
    <article className="ika106-podium-person">
      <div className="ika106-podium-photo">
        {photo ? <img src={photo} alt={name} /> : <span>{initials || '—'}</span>}
      </div>
      <h2 title={name}>{name}</h2>
      <p title={club}>{club}</p>
      {placement.finalScore != null && <small>{Number(placement.finalScore).toFixed(2)}</small>}
    </article>
  )
}

export default function TournamentPodiumTop3({ podium, matName, tournamentName, getAthlete, fullscreenControl }) {
  const placements = podium?.placements || []
  return (
    <main className="tatami-screen ika106-podium-screen">
      {fullscreenControl}
      <header className="ika106-podium-header">
        <div><strong><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{tournamentName || ''}</span></div>
        <div><b>FINAL PODIUM</b><span>{matName}</span></div>
      </header>
      <section className="ika106-podium-stage">
        <div className="ika106-podium-heading">
          <span>TOP 3 • FINAL RESULTS</span>
          <h1>{tvCategory(podium?.categoryName || '')}</h1>
          <p>{tvCompetition(podium?.competitionName || '')}</p>
        </div>
        <div className="ika106-podium-grid">
          {podiumSlots.map((slot) => {
            const medalists = placements.filter((item) => item.place === slot.place).slice(0, slot.place === 3 ? 2 : 1)
            return (
              <div className={`ika106-podium-slot place-${slot.place}`} key={slot.place}>
                <div className="ika106-medal-label"><span>{slot.place === 1 ? '🥇' : slot.place === 2 ? '🥈' : '🥉'}</span>{slot.title}</div>
                <div className={`ika106-podium-people ${medalists.length > 1 ? 'has-two' : ''}`}>
                  {medalists.length
                    ? medalists.map((person) => <MedalPerson key={person.athleteId} placement={person} getAthlete={getAthlete} />)
                    : <div className="ika106-podium-empty">—</div>}
                </div>
                <div className={`ika106-podium-step ${slot.color}`}><strong>{slot.place}</strong></div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
