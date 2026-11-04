import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import { db } from '../lib/demoStore'
import AthleteLiveSearch from '../components/AthleteLiveSearch.jsx'
import './PublicTournamentPage.css'

const readTournamentData = () => ({
  tournament: db.getVisibleTournamentForClubs(),
  competitions: db.getCompetitions(),
  categories: db.getTournamentCategories(),
  entries: db.getEntries(),
  matches: db.getMatches(),
  sessions: db.getKataSessions(),
  athletes: db.getAthletes(),
  clubs: db.getClubs(),
})

const choiceKey = (item) => item.categoryId
  ? `id:${item.categoryId}`
  : `cat:${item.competitionId}|${item.category}|${item.mat || ''}`

const formatDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || 'Data nieustalona'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pl-PL', {day:'numeric',month:'long',year:'numeric'})
}

export default function PublicTournamentPage() {
  const { tournamentId } = useParams()
  const [data, setData] = useState(readTournamentData)
  useEffect(() => {
    const refresh = () => setData(readTournamentData())
    window.addEventListener('ika:data', refresh)
    window.addEventListener('ika:live', refresh)
    window.addEventListener('storage', refresh)
    const timer = window.setInterval(refresh, 2000)
    return () => {
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('ika:live', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(timer)
    }
  }, [])

  const tournament = data.tournament
  const choices = useMemo(() => {
    const mapped = new Map()
    const include = (row) => {
      if (!row?.competitionId || !row?.category) return
      const key = choiceKey(row)
      if (!mapped.has(key)) mapped.set(key, {
        key, competitionId: row.competitionId, category: row.category,
        categoryId: row.categoryId || null, mat: row.mat || '',
      })
      else if (row.mat) mapped.get(key).mat = row.mat
    }
    data.matches.forEach(include)
    data.sessions.forEach(include)
    return [...mapped.values()]
  }, [data.matches, data.sessions])

  const openCategory = (key) => {
    window.location.assign(`/wyniki-live?category=${encodeURIComponent(key)}`)
  }
  const validTournament = tournament && (!tournamentId || String(tournamentId) === String(tournament.id))

  return <div className="ika-public-tournament-page">
    <PublicHeader />
    <main className="ika-public-tournament-main">
      <div className="ika-public-tournament-crumb"><Link to="/">Strona główna</Link><span>/</span><Link to="/zawody">Zawody</Link>{tournamentId && <><span>/</span><span>Szczegóły</span></>}</div>
      {!validTournament ? <section className="ika-public-tournament-empty"><h1>Brak opublikowanych zawodów</h1><p>Nie ma teraz turnieju dostępnego publicznie lub podany adres jest nieaktualny.</p></section> : !tournamentId ? <>
        <div className="ika-public-tournament-heading"><span>IKA POLAND · ZAWODY</span><h1>Wybierz zawody</h1><p>Otwórz turniej, aby wyszukać zawodnika, sprawdzić konkurencje, starty i wyniki.</p></div>
        <Link to={`/zawody/${encodeURIComponent(tournament.id)}`} className="ika-public-tournament-event">
          {tournament.poster && <img src={tournament.poster} alt="Plakat zawodów" />}
          <div><span>AKTUALNE ZAWODY</span><h2>{tournament.name}</h2><p>{formatDate(tournament.date)} · {tournament.startTime || 'Godzina do ustalenia'}</p><p>{tournament.venue || 'Miejsce do ustalenia'}</p><strong>Otwórz szczegóły zawodów i wyszukiwarkę zawodników</strong></div>
        </Link>
      </> : <>
        <section className="ika-public-tournament-head">
          <span>IKA POLAND · INFORMACJE O ZAWODACH</span>
          <h1>{tournament.name}</h1>
          <div className="ika-public-tournament-facts">
            <div><small>Data</small><strong>{formatDate(tournament.date)}</strong></div>
            <div><small>Godzina rozpoczęcia</small><strong>{tournament.startTime || 'Nie ustalono'}</strong></div>
            <div><small>Miejsce</small><strong>{tournament.venue || 'Nie ustalono'}</strong></div>
          </div>
          <div className="ika-public-tournament-links"><Link to="/wyniki-live">Wszystkie drabinki i listy kata</Link><Link to="/klasyfikacja">Klasyfikacja zawodów</Link></div>
        </section>
        <AthleteLiveSearch data={data} choices={choices} onOpenCategory={openCategory} />
      </>}
    </main>
  </div>
}
