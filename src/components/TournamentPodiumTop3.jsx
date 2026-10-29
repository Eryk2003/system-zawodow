import React from 'react'
import { tvCategory, tvCompetition } from '../lib/tvEnglish.js'

/* ETAP 107 - lista pierwszych trzech miejsc zamiast podium na stopniach.
   W kumite dwa trzecie miejsca sa wyswietlane jako dwa osobne wiersze. */
export default function TournamentPodiumTop3({ podium, matName, tournamentName, getAthlete, fullscreenControl }) {
  const placements = (podium?.placements || [])
    .filter((item) => [1, 2, 3].includes(Number(item.place)) && item.athleteId)
    .sort((a, b) => Number(a.place) - Number(b.place))
    .filter((item, index, all) => all.findIndex((row) => row.athleteId === item.athleteId) === index)

  return (
    <main className="tatami-screen final-results-screen ika107-medal-list-screen">
      {fullscreenControl}
      <header className="final-results-header">
        <div>
          <strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong>
          <span>{tournamentName || ''}</span>
        </div>
        <div><b>FINAL RESULTS</b><span>{tvCompetition(podium?.competitionName || '')} • {tvCategory(podium?.categoryName || '')}</span></div>
        <div><b>{matName}</b><span>TOP 3</span></div>
      </header>

      <section className="final-results-stage ika107-medal-stage">
        <div className="final-results-title">
          <span>CATEGORY COMPLETED</span>
          <h1>{tvCategory(podium?.categoryName || '')}</h1>
          <p>{tvCompetition(podium?.competitionName || '')}</p>
        </div>
        <div className={`final-results-grid ika107-medal-list ${placements.length > 3 ? 'has-two-bronzes' : ''}`}>
          {placements.map((placement, index) => {
            const info = getAthlete(placement.athleteId)
            const athleteName = placement.athleteName || info?.name || 'Competitor'
            const clubName = placement.clubName || info?.club || ''
            const photo = info?.photo || ''
            const initials = athleteName.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
            const label = Number(placement.place) === 1 ? '1ST PLACE' : Number(placement.place) === 2 ? '2ND PLACE' : '3RD PLACE'
            return (
              <article key={placement.athleteId} className={`final-result-row place-${placement.place}`}
                style={{ '--result-delay': `${index * 110}ms` }}>
                <div className="final-result-place">{placement.place}</div>
                <div className="final-result-photo">
                  {photo ? <img src={photo} alt={athleteName} /> : <div>{initials || '—'}</div>}
                </div>
                <div className="final-result-person">
                  <strong>{athleteName}</strong>
                  <span>{clubName}</span>
                </div>
                <em>{label}</em>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
