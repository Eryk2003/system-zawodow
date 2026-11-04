import React, { useMemo, useState } from 'react'
import { db, resolveMatch, getKataCombinedResults } from '../lib/demoStore'
import './AthleteLiveSearch.css'
import AthleteCompetitionPreview from './AthleteCompetitionPreview.jsx'

const score = value => value == null || !Number.isFinite(Number(value)) ? '—' : String(Math.round(Number(value) * 100) / 100).replace('.', ',')
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl').trim()
const displayTime = value => /^\d{1,2}:\d{2}/.test(String(value || '')) ? value : (value || '')

export default function AthleteLiveSearch({ data, choices, onOpenCategory, initialAthleteId = '' }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(initialAthleteId)
  const [expanded, setExpanded] = useState('')
  const athleteIdsWithEntries = useMemo(() => new Set(data.entries.map(e => e.athleteId)), [data.entries])
  const athletes = useMemo(() => data.athletes.filter(a => athleteIdsWithEntries.has(a.id)), [data.athletes, athleteIdsWithEntries])
  const found = useMemo(() => {
    const q = norm(query)
    if (q.length < 2) return []
    const words = q.split(/\s+/).filter(Boolean)
    return athletes.filter(a => {
      const full = norm(`${a.firstName || ''} ${a.lastName || ''}`)
      const reversed = norm(`${a.lastName || ''} ${a.firstName || ''}`)
      return words.every(w => full.includes(w) || reversed.includes(w))
    }).slice(0, 12)
  }, [query, athletes])
  const picked = athletes.find(a => a.id === selectedId) || (found.find(a => norm(`${a.firstName || ''} ${a.lastName || ''}`) === norm(query)) || (found.length === 1 ? found[0] : null))
  const info = picked ? db.parentLookupById(picked.id).find(item => item.athlete.id === picked.id) : null
  const club = picked ? data.clubs.find(c => c.id === picked.clubId) : null
  const sessions = data.sessions
  const allMatches = data.matches
  const competitions = new Map(data.competitions.map(c => [c.id, c]))

  const athleteEntries = info?.entries || []
  const choose = athlete => { setSelectedId(athlete.id); setQuery(`${athlete.firstName || ''} ${athlete.lastName || ''}`.trim()); setExpanded('') }
  const openCategory = entry => {
    const c = choices.find(c => entry.categoryId && c.categoryId === entry.categoryId) || choices.find(c => c.competitionId === entry.competitionId && c.category === entry.category)
    if (c) onOpenCategory(c.key)
  }
  const detail = entry => {
    const id = entry.athleteId
    const session = sessions.find(s => (entry.categoryId && s.categoryId === entry.categoryId) || (s.competitionId === entry.competitionId && s.category === entry.category && (!entry.mat || s.mat === entry.mat)))
    const related = allMatches.filter(m => (entry.categoryId && m.categoryId === entry.categoryId) || (m.competitionId === entry.competitionId && m.category === entry.category && (!entry.mat || m.mat === entry.mat)))
      .map(m => resolveMatch(m, allMatches)).filter(m => m.redResolvedId === id || m.blueResolvedId === id)
      .sort((a,b) => Number(a.queueOrder || 0) - Number(b.queueOrder || 0))
    const isKata = Boolean(session) || ['Kata','Para Karate'].includes(competitions.get(entry.competitionId)?.group) && !related.length
    if (isKata) {
      const final = session?.results?.find(r => r.athleteId === id)
      const first = session?.preliminaryResults?.find(r => r.athleteId === id)
      const isFinalist = Number(session?.totalRounds || 1) === 2 && Boolean(first) && Boolean(final)
      const finished = final?.status === 'done' || (!isFinalist && first?.status === 'done')
      const combined = session?.status === 'completed' ? getKataCombinedResults(session).find(r => r.athleteId === id) : null
      return { kind:'kata', session, final, first, finished, combined, isFinalist }
    }
    const completed = related.filter(m => m.status === 'done')
    const lost = completed.some(m => m.winnerId && m.winnerId !== id)
    const next = related.find(m => m.status !== 'done')
    const last = completed[completed.length - 1]
    const categoryMatches = allMatches.filter(m => (entry.categoryId && m.categoryId === entry.categoryId) || (m.competitionId === entry.competitionId && m.category === entry.category))
    const finalRound = Math.max(-1, ...categoryMatches.map(m => Number(m.roundIndex || 0)))
    const wonCategory = completed.some(m => Number(m.roundIndex || 0) === finalRound && m.winnerId === id)
    return { kind:'kumite', related, completed, lost, next, last, wonCategory }
  }

  return <section className="ika-athlete-finder" aria-label="Wyszukaj zawodnika i sprawdź jego starty">
    <div className="ika-athlete-finder-heading"><div><span>WYSZUKIWARKA ZAWODNIKÓW</span><h2>Znajdź zawodnika</h2><p>Sprawdź konkurencje, tatami, szacowany czas do startu i zapisane wyniki.</p></div></div>
    <label htmlFor="ika-athlete-name-search">Imię lub nazwisko zawodnika</label>
    <input id="ika-athlete-name-search" type="search" autoComplete="off" value={query} onChange={e => {setQuery(e.target.value);setSelectedId('');setExpanded('')}} placeholder="Wpisz np. Kowalski albo Jan Kowalski" />
    {query.trim().length >= 2 && !picked && <div className="ika-athlete-finder-suggestions" role="listbox" aria-label="Pasujący zawodnicy">
      {found.map(a => <button type="button" key={a.id} onClick={() => choose(a)}><strong>{a.firstName} {a.lastName}</strong><span>{data.clubs.find(c => c.id === a.clubId)?.name || 'Klub niepodany'}</span></button>)}
      {!found.length && <p>Nie znaleziono zgłoszonego zawodnika.</p>}
    </div>}
    {picked && <div className="ika-athlete-finder-person">
      <div className="ika-athlete-finder-person-head">
        {picked.photo ? <img src={picked.photo} alt="" /> : <div className="ika-athlete-finder-initials">{picked.firstName?.[0]}{picked.lastName?.[0]}</div>}
        <div><h3>{picked.firstName} {picked.lastName}</h3><p>{club?.name || 'Klub niepodany'}</p><small>{athleteEntries.length} {athleteEntries.length === 1 ? 'zgłoszona konkurencja' : 'zgłoszone konkurencje'}</small></div>
      </div>
      <div className="ika-athlete-finder-entries">
        {athleteEntries.map(entry => {
          const d = detail(entry)
          const key = entry.id
          const hasCategory = choices.some(c => (entry.categoryId && c.categoryId === entry.categoryId) || (c.competitionId === entry.competitionId && c.category === entry.category))
          const isDone = d.kind === 'kata' ? (d.session?.status === 'completed' || (d.finished && !d.isFinalist)) : (d.lost || d.wonCategory)
          return <article key={key} className="ika-athlete-finder-entry">
            <div className="ika-athlete-finder-entry-head">
              <div><b>{entry.competitionName}</b><strong>{entry.category}</strong><small>{entry.mat || 'Tatami jeszcze nieprzypisane'}</small></div>
              <span className={isDone ? 'ika-athlete-state done' : entry.liveStatus === 'active' ? 'ika-athlete-state active' : 'ika-athlete-state'}>{isDone ? 'Start zakończony' : entry.liveStatus === 'active' ? 'Trwa teraz' : entry.liveLabel || 'Oczekuje'}</span>
            </div>
            {!isDone && <div className="ika-athlete-finder-time">
              <div><small>Szacowany start</small><strong>{displayTime(entry.dynamicEstimate || entry.estimatedStart) || 'Nie ustalono'}</strong></div>
              <div><small>Do startu</small><strong>{entry.liveStatus === 'active' ? 'TERAZ' : Number.isFinite(entry.etaMinutes) ? entry.etaMinutes === 0 ? 'Za chwilę' : `Około ${entry.etaMinutes} min` : 'W przygotowaniu'}</strong></div>
            </div>}
            {d.kind === 'kata' ? <div className="ika-athlete-finder-results">
              {d.first?.status === 'done' && <div><span>Eliminacje</span><b>{score(d.first.finalScore)}</b></div>}
              {d.final?.status === 'done' && <div><span>{d.isFinalist ? 'Finał' : 'Ocena'}</span><b>{score(d.final.finalScore)}</b></div>}
              {d.combined && <div className="ika-athlete-finder-total"><span>Wynik końcowy</span><b>{score(d.combined.totalScore)}</b></div>}
              {!d.first && d.final?.status !== 'done' && <small>Ocena pojawi się po zatwierdzeniu występu przez sędziów.</small>}
              {d.isFinalist && d.final?.status !== 'done' && <small>Zakwalifikowany do finału — oczekiwanie na ocenę.</small>}
            </div> : <div className="ika-athlete-finder-results">
              {d.wonCategory && <strong className="ika-athlete-success">Zwycięzca konkurencji</strong>}
              {d.lost && <strong>Udział zakończony · {d.last?.roundName || 'kumite'}</strong>}
              {d.next && <small>{d.next.status === 'active' ? 'Aktualnie walczy' : 'Najbliższa walka'} · {d.next.roundName || 'runda w przygotowaniu'}</small>}
              {!d.next && !d.lost && !d.wonCategory && d.completed.length === 0 && <small>Oczekuje na rozpoczęcie walk.</small>}
              {d.completed.length > 0 && <button type="button" className="ika-athlete-finder-expand" onClick={() => setExpanded(expanded === key ? '' : key)}>{expanded === key ? 'Ukryj rozegrane walki' : `Pokaż rozegrane walki (${d.completed.length})`}</button>}
              {expanded === key && d.completed.map(m => <div key={m.id} className="ika-athlete-finder-bout"><small>{m.roundName} · walka {m.matchNo}</small><b>{m.winnerId === picked.id ? 'Wygrana' : 'Przegrana'}</b><span>Wygrał: {(() => { const a = data.athletes.find(a => a.id === m.winnerId); return a ? `${a.firstName} ${a.lastName}` : 'Nie ustalono' })()}</span></div>)}
            </div>}
            <AthleteCompetitionPreview entry={entry} athleteId={picked.id} data={data} />
            {hasCategory && <button className="ika-athlete-finder-go" type="button" onClick={() => openCategory(entry)}>Otwórz pełne wyniki konkurencji</button>}
          </article>
        })}
        {!athleteEntries.length && <p>Nie ma jeszcze zgłoszeń do konkurencji.</p>}
      </div>
      <p className="ika-athlete-finder-note">Godziny są orientacyjne i mogą ulec zmianie w trakcie zawodów. Wyniki pojawiają się po zapisaniu przez sędziów.</p>
    </div>}
  </section>
}
