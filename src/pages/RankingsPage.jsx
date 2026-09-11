import React, { useEffect, useState } from 'react'
import { PublicHeader, EmptyState } from '../components/Layout'
import { db } from '../lib/demoStore'

function MedalSummary({ row }) {
  return <span className="ranking-medals"><b>🥇 {row.gold}</b><b>🥈 {row.silver}</b><b>🥉 {row.bronze}</b></span>
}

function RankingTable({ type, rows }) {
  const isClub = type === 'clubs'
  if (!rows.length) {
    return <EmptyState title="Klasyfikacja jeszcze pusta" text="Wyniki pojawią się automatycznie po zakończeniu pierwszej kategorii i ustaleniu podium." />
  }
  return (
    <div className="table-wrap ranking-table-wrap">
      <table className="ranking-table">
        <thead><tr><th>Miejsce</th><th>{isClub ? 'Klub' : 'Zawodnik'}</th>{!isClub && <th>Klub</th>}<th>Medale</th><th>{isClub ? 'Punkty klubowe' : 'Punkty'}</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={isClub ? (row.clubId || row.clubName) : row.athleteId} className={row.place <= 3 ? `ranking-top ranking-top-${row.place}` : ''}>
              <td><strong className="ranking-place">{row.place}</strong></td>
              <td><strong>{isClub ? row.clubName : row.athleteName}</strong></td>
              {!isClub && <td>{row.clubName}</td>}
              <td><MedalSummary row={row} /></td>
              <td><strong className="ranking-points">{row.points} pkt</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState(() => db.getLiveRankings())
  const [tab, setTab] = useState('clubs')
  const tournament = db.getTournament()

  useEffect(() => {
    const refresh = () => setRankings(db.getLiveRankings())
    const interval = setInterval(refresh, 1000)
    window.addEventListener('ika:data', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return (
    <div>
      <PublicHeader />
      <main className="ranking-page section-wrap">
        <div className="ranking-hero">
          <div><span className="eyebrow">Klasyfikacja LIVE</span><h1>Kluby i zawodnicy</h1><p>{tournament.created ? tournament.name : 'Aktualne zawody IKA Poland'} — wyniki aktualizują się automatycznie po zakończeniu kategorii.</p></div>
          {tab === 'clubs' ? (
            <div className="ranking-points-legend"><strong>Klasyfikacja klubowa</strong><span>🥇 = 6 pkt</span><span>🥈 = 4 pkt</span><span>🥉 = 2 pkt</span><span style={{gridColumn:'1 / -1'}}>O kolejności decydują najpierw złote, potem srebrne i brązowe medale.</span></div>
          ) : (
            <div className="ranking-points-legend"><strong>Klasyfikacja zawodników</strong><span>🥇 = 6 pkt</span><span>🥈 = 4 pkt</span><span>🥉 = 2 pkt</span><span style={{gridColumn:'1 / -1'}}>O kolejności decydują najpierw złote, potem srebrne i brązowe medale.</span></div>
          )}
        </div>

        <div className="ranking-tabs">
          <button className={tab === 'clubs' ? 'active' : ''} onClick={() => setTab('clubs')}>Klasyfikacja klubów</button>
          <button className={tab === 'athletes' ? 'active' : ''} onClick={() => setTab('athletes')}>Klasyfikacja zawodników</button>
        </div>

        <RankingTable type={tab} rows={tab === 'clubs' ? rankings.clubs : rankings.athletes} />

        {!!rankings.podiums.length && (
          <section className="ranking-results-feed">
            <div className="section-title"><span className="eyebrow">Zakończone kategorie</span><h2>Podia naliczone do klasyfikacji</h2></div>
            <div className="ranking-result-grid">
              {rankings.podiums.slice().reverse().map((podium) => (
                <article key={podium.key}>
                  <small>{podium.competitionName}</small>
                  <h3>{podium.categoryName}</h3>
                  {podium.placements.map((result, index) => (
                    <div key={`${result.athleteId}-${index}`}>
                      <b>{result.place}. {result.athleteName}</b>
                      <span>{result.clubName} • zawodnik +{result.points} pkt • klub +{result.clubPoints ?? (result.place === 1 ? 6 : result.place === 2 ? 4 : 2)} pkt</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
