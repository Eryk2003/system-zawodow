import React from 'react'
import { tvCategory, tvCompetition } from '../lib/tvEnglish.js'

/* POPRAWKA: liczby miejsc nie mogą być ucięte.
   Zostawiamy ten sam układ, ale wymuszamy bezpieczne wymiary i line-height
   bez zależności od globalnych styli. */
export default function TournamentPodiumTop3({ podium, matName, tournamentName, getAthlete, fullscreenControl }) {
  const placements = (podium?.placements || [])
    .filter((item) => [1, 2, 3].includes(Number(item.place)) && item.athleteId)
    .sort((a, b) => Number(a.place) - Number(b.place))
    .filter((item, index, all) => all.findIndex((row) => row.athleteId === item.athleteId) === index)

  const badgeStyle = (place) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '116px',
    minWidth: '116px',
    height: '116px',
    flex: '0 0 116px',
    borderRadius: '18px',
    fontSize: '84px',
    fontWeight: 900,
    lineHeight: '0.9',
    letterSpacing: '-0.04em',
    overflow: 'visible',
    padding: 0,
    margin: 0,
    boxSizing: 'border-box',
    color: place === 1 ? '#0d0f14' : '#f3f5fa',
    background: place === 1 ? '#d4b24d' : place === 2 ? '#9ea6b3' : '#b4733d',
    textShadow: 'none',
  })

  const photoStyle = {
    width: '148px',
    height: '148px',
    minWidth: '148px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  }

  const photoFallbackStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '72px',
    fontWeight: 900,
    lineHeight: 1,
  }

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
              <article
                key={placement.athleteId}
                className={`final-result-row place-${placement.place}`}
                style={{ '--result-delay': `${index * 110}ms` }}
              >
                <div className="final-result-place" style={badgeStyle(Number(placement.place))}>{placement.place}</div>
                <div className="final-result-photo" style={photoStyle}>
                  {photo ? <img src={photo} alt={athleteName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={photoFallbackStyle}>{initials || '—'}</div>}
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
