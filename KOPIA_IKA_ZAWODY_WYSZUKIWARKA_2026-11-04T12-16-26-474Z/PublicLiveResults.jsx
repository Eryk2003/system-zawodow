import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicHeader } from '../components/Layout'
import KumiteBracket from '../components/KumiteBracket'
import { db, resolveMatch, getKataCombinedResults } from '../lib/demoStore'

const textScore = (v) => v == null || !Number.isFinite(Number(v)) ? '—' : String(Math.round(Number(v) * 100) / 100).replace('.', ',')
const categoryKey = (row) => row.categoryId ? `id:${row.categoryId}` : `cat:${row.competitionId}|${row.category}|${row.mat || ''}`

function readLive() {
  return {
    tournament: db.getTournament(),
    competitions: db.getCompetitions(),
    categories: db.getTournamentCategories(),
    matches: db.getMatches(),
    sessions: db.getKataSessions(),
    athletes: db.getAthletes(),
    clubs: db.getClubs(),
  }
}

export default function PublicLiveResults() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(readLive)
  const selectedParam = params.get('category') || ''
  const athleteParam = params.get('athlete') || ''
  const [kind, setKind] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const refresh = () => setData(readLive())
    window.addEventListener('ika:data', refresh)
    window.addEventListener('ika:live', refresh)
    window.addEventListener('storage', refresh)
    const interval = window.setInterval(refresh, 2000)
    return () => {
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('ika:live', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(interval)
    }
  }, [])

  const competitionMap = useMemo(() => new Map(data.competitions.map(c => [c.id, c])), [data.competitions])
  const athletesById = useMemo(() => new Map(data.athletes.map(a => [a.id, a])), [data.athletes])
  const clubsById = useMemo(() => new Map(data.clubs.map(c => [c.id, c])), [data.clubs])
  const person = (id) => {
    const a = athletesById.get(id)
    if (!a) return 'Oczekiwanie na zawodnika'
    return `${a.firstName || ''} ${a.lastName || ''}`.trim()
  }
  const club = (id) => {
    const a = athletesById.get(id)
    const c = a && clubsById.get(a.clubId)
    return c?.shortName || c?.name || ''
  }

  const choices = useMemo(() => {
    const map = new Map()
    const add = (row, group) => {
      if (!row?.competitionId || !row?.category) return
      const key = categoryKey(row)
      if (!map.has(key)) map.set(key, { key, competitionId: row.competitionId, category: row.category, categoryId: row.categoryId || null, mat: row.mat || '', group, hasMatches: false, hasKata: false })
      const item = map.get(key)
      if (row.mat) item.mat = row.mat
      if (group === 'kata') item.hasKata = true
      if (group === 'kumite') item.hasMatches = true
    }
    data.matches.forEach(m => add(m, 'kumite'))
    data.sessions.forEach(s => add(s, 'kata'))
    return [...map.values()].sort((a,b) => `${a.mat} ${a.category}`.localeCompare(`${b.mat} ${b.category}`, 'pl'))
  }, [data.matches, data.sessions])

  const matching = useMemo(() => choices.filter(c => {
    if (kind !== 'all' && (kind === 'kata' ? !c.hasKata : !c.hasMatches)) return false
    const competition = competitionMap.get(c.competitionId)?.name || ''
    return `${c.category} ${c.mat} ${competition}`.toLocaleLowerCase('pl').includes(search.toLocaleLowerCase('pl'))
  }), [choices, kind, search, competitionMap])
  const chosen = choices.find(c => c.key === selectedParam) || (selectedParam ? null : matching[0]) || null

  const currentMatches = chosen ? data.matches.filter(m => categoryKey(m) === chosen.key).map(m => resolveMatch(m, data.matches)) : []
  const session = chosen ? data.sessions.find(s => categoryKey(s) === chosen.key) : null
  const compete = chosen ? competitionMap.get(chosen.competitionId) : null
  const isKata = Boolean(session && (compete?.group === 'Kata' || !currentMatches.length))
  const completedMatches = currentMatches.filter(m => m.status === 'done')
  const firstActive = currentMatches.find(m => m.status === 'active') || currentMatches.find(m => m.status !== 'done' && m.redResolvedId && m.blueResolvedId)
  const matchesByRound = [...new Set(currentMatches.map(m => Number(m.roundIndex || 0)))].sort((a,b)=>a-b)
  const lastRoundIndex = matchesByRound.length ? matchesByRound[matchesByRound.length - 1] : -1
  const doneFinal = currentMatches.find(m => Number(m.roundIndex || 0) === lastRoundIndex && m.status === 'done' && m.winnerId)
  const prelim = session?.preliminaryResults || []
  const twoRounds = Number(session?.totalRounds || 1) === 2 && prelim.length > 0
  const roundScores = session?.results || []
  const byFirst = new Map(prelim.map(r => [r.athleteId, r]))
  const combined = session ? getKataCombinedResults(session) : []
  const hasFinalScore = twoRounds && combined.length > 0
  const participants = isKata
    ? (twoRounds ? [...prelim, ...roundScores.filter(r => !byFirst.has(r.athleteId))] : roundScores)
    : []
  const dedupParticipants = [...new Map(participants.map(r => [r.athleteId, r])).values()]
  const preliminaryRanking = prelim.filter(r => r.status === 'done').slice().sort((a,b) => Number(b.finalScore || 0) - Number(a.finalScore || 0))

  const setChosen = (key) => {
    const next = new URLSearchParams(params)
    next.set('category', key)
    setParams(next)
  }

  return (
    <div className="ika-public-live">
      <PublicHeader />
      <main className="ika-live-page">
        <div className="ika-live-heading">
          <div><span className="eyebrow">IKA POLAND · WYNIKI LIVE</span><h1>Przebieg zawodów</h1><p>Drabinki kumite, wyniki walk, listy kata i noty zapisane przez sędziów. Widok tylko do odczytu.</p></div>
          <span className="ika-live-badge">● Aktualizacja automatyczna</span>
        </div>
        <div className="ika-live-layout">
          <aside className="ika-live-choices">
            <h2>Konkurencje</h2>
            <input aria-label="Szukaj kategorii" placeholder="Szukaj kategorii lub tatami" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="ika-live-types">
              {['all','kumite','kata'].map(type => <button type="button" className={kind===type ? 'active' : ''} onClick={() => setKind(type)} key={type}>{type==='all'?'Wszystkie':type==='kumite'?'Kumite':'Kata'}</button>)}
            </div>
            <div className="ika-live-choices-list">
              {matching.map(c => <button type="button" key={c.key} className={chosen?.key===c.key?'selected':''} onClick={()=>setChosen(c.key)}>
                <strong>{competitionMap.get(c.competitionId)?.name || (c.hasKata?'Kata':'Kumite')}</strong><span>{c.category}</span><small>{c.mat}</small>
              </button>)}
              {!matching.length && <p>Nie ma jeszcze przygotowanych list ani drabinek.</p>}
            </div>
          </aside>
          <section className="ika-live-details">
            {!chosen ? <div className="ika-live-empty">Wybierz przygotowaną kategorię. Wyniki pojawią się po losowaniu list lub drabinek.</div> : <>
              <header className="ika-live-category-head"><div><span className="eyebrow">{chosen.mat}</span><h2>{chosen.category}</h2><p>{compete?.name || (isKata ? 'Kata' : 'Kumite')}</p></div><span className="ika-live-badge">{isKata ? 'KATA' : 'KUMITE'}</span></header>
              {isKata ? <>
                <h3>Lista startowa i oceny kata</h3>
                <p>Noty pojawiają się po zatwierdzeniu występu. W finale wynik łączny jest widoczny na stronie po zapisaniu oceny drugiej rundy.</p>
                {hasFinalScore && <div className="ika-live-card"><h3>Finał · suma dwóch rund</h3><div className="ika-live-score-list">
                  {combined.map((r,i)=><div className="ika-live-result-row" key={r.athleteId}><b>{i+1}.</b><div><strong>{person(r.athleteId)}</strong><small>{club(r.athleteId)}</small></div><strong className="ika-live-score">{textScore(r.totalScore)}</strong></div>)}
                </div></div>}
                {twoRounds && <div className="ika-live-card"><h3>Eliminacje</h3><div className="ika-live-score-list">
                  {preliminaryRanking.map((r,i)=><div className="ika-live-result-row" key={r.athleteId}><b>{i+1}.</b><div><strong>{person(r.athleteId)}</strong><small>{club(r.athleteId)}</small></div><strong className="ika-live-score">{textScore(r.finalScore)}</strong></div>)}
                </div></div>}
                <div className="ika-live-card"><h3>{twoRounds ? 'Finał · aktualne noty' : 'Lista zawodników i oceny'}</h3><div className="ika-live-score-list">
                  {(twoRounds ? roundScores : dedupParticipants).map((r,i)=><div className="ika-live-result-row" key={r.athleteId}><b>{r.order || i+1}.</b><div><strong>{person(r.athleteId)}</strong><small>{club(r.athleteId)}{r.kataName ? ` · ${r.kataName}` : ''}</small></div><strong className="ika-live-score">{r.status === 'done' ? textScore(r.finalScore) : r.status === 'active' ? 'Występuje' : 'Oczekuje'}</strong></div>)}
                  {!roundScores.length && <p>Lista kata nie jest jeszcze przygotowana.</p>}
                </div></div>
              </> : <>
                {doneFinal && <div className="ika-live-winner"><span>Zwycięzca kategorii</span><strong>{person(doneFinal.winnerId)}</strong><small>{club(doneFinal.winnerId)}</small></div>}
                {firstActive && <div className="ika-live-now"><div><small>{firstActive.status === 'active'?'TRWA WALKA':'NASTĘPNA WALKA'} · {firstActive.roundName}</small><strong>{person(firstActive.redResolvedId)} <span>vs</span> {person(firstActive.blueResolvedId)}</strong></div><span>{firstActive.status==='active'?'LIVE':'OCZEKUJE'}</span></div>}
                <h3>Drabinka kumite</h3><div className="ika-live-bracket"><KumiteBracket matches={currentMatches} athletes={data.athletes} clubs={data.clubs} sideTheme={{mode: String(compete?.name || '').toLowerCase().includes('ippon') ? 'red-white' : 'red-blue', red:{code:'AKA'},blue:{code:String(compete?.name || '').toLowerCase().includes('ippon')?'SHIRO':'AO'}}} /></div>
                <div className="ika-live-card"><h3>Wyniki pojedynków</h3>{currentMatches.slice().sort((a,b)=>Number(a.queueOrder||0)-Number(b.queueOrder||0)).map(m=><div className="ika-live-bout" key={m.id}><div><small>{m.roundName} · Walka {m.matchNo}</small><strong>{person(m.redResolvedId)} — {person(m.blueResolvedId)}</strong></div><span className={m.status==='done'?'finished':''}>{m.status === 'done' ? `Wygrał: ${person(m.winnerId)} (${Number(m.redScore||0)}:${Number(m.blueScore||0)})` : m.status==='active'?'Trwa':'Oczekuje'}</span></div>)}</div>
              </>}
            </>}
          </section>
        </div>
        <div className="ika-live-footer"><Link to="/zawodnik">Podgląd startów zawodnika</Link><Link to="/klasyfikacja">Klasyfikacja zawodów</Link>{athleteParam && <Link to={`/zawodnik?athlete=${encodeURIComponent(athleteParam)}`}>Wróć do zawodnika</Link>}</div>
      </main>
    </div>
  )
}
