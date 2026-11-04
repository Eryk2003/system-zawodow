import React, { useMemo, useState } from 'react'
import KumiteBracket from './KumiteBracket.jsx'
import { resolveMatch, getKataCombinedResults } from '../lib/demoStore'
import { getKumiteSideTheme } from '../lib/kumiteRules'
import './PublicCategoryDetails.css'

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl').trim()
const score = value => value == null || !Number.isFinite(Number(value)) ? '—' : String(Math.round(Number(value) * 100) / 100).replace('.', ',')
const same = (item, row) => Boolean(item) && (
  (item.categoryId && row.id && item.categoryId === row.id) ||
  (item.competitionId === row.competitionId && (item.category || item.name) === row.name)
)

export default function PublicCategoryDetails({ row, data }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const competition = (data.competitions || []).find(item => item.id === row.competitionId)
  const entries = useMemo(() => (data.entries || []).filter(item => same(item, row)), [data.entries, row.id, row.competitionId, row.name])
  const session = (data.sessions || []).find(item => same(item, row)) || null
  const matches = useMemo(() => (data.matches || []).filter(item => same(item, row)), [data.matches, row.id, row.competitionId, row.name])
  const resolved = useMemo(() => matches.map(item => resolveMatch(item, data.matches || [])), [matches, data.matches])
  const ids = new Set([
    ...entries.map(item => item.athleteId),
    ...(session?.results || []).map(item => item.athleteId),
    ...(session?.preliminaryResults || []).map(item => item.athleteId),
    ...resolved.flatMap(item => [item.redResolvedId, item.blueResolvedId]),
  ].filter(Boolean))
  const athletes = (data.athletes || []).filter(item => ids.has(item.id))
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl'))
  const found = athletes.filter(item => normalize(`${item.firstName} ${item.lastName}`).includes(normalize(query)) || normalize(`${item.lastName} ${item.firstName}`).includes(normalize(query)))
  const currentId = athletes.some(item => item.id === selectedId) ? selectedId : ''
  const target = resolved.find(item => item.status === 'active' && (item.redResolvedId === currentId || item.blueResolvedId === currentId))
    || resolved.find(item => item.status !== 'done' && (item.redResolvedId === currentId || item.blueResolvedId === currentId))
    || [...resolved].reverse().find(item => item.redResolvedId === currentId || item.blueResolvedId === currentId)
  const athleteName = id => {
    const a = (data.athletes || []).find(item => item.id === id)
    return a ? `${a.firstName || ''} ${a.lastName || ''}`.trim() : 'Nieznany zawodnik'
  }
  const clubName = id => {
    const a = (data.athletes || []).find(item => item.id === id)
    const c = (data.clubs || []).find(item => item.id === a?.clubId)
    return c?.shortName || c?.name || ''
  }
  const twoRounds = Number(session?.totalRounds || 1) === 2 && (session?.preliminaryResults || []).length > 0
  const combined = session?.status === 'completed' && twoRounds ? getKataCombinedResults(session) : []
  const finalMap = new Map(combined.map(item => [item.athleteId, item.totalScore]))
  const scoringList = (items, title, total = false) => <div className="ika-category-detail-stage" key={title}>
    <h4>{title}</h4>
    <div className="ika-category-detail-athletes">
      {items.map((item, index) => <div key={item.athleteId || index} className={`ika-category-detail-athlete ${currentId && item.athleteId === currentId ? 'highlight' : ''}`}>
        <b>{item.order || index + 1}.</b>
        <span><strong>{athleteName(item.athleteId)}</strong><small>{clubName(item.athleteId)}</small></span>
        <em>{total && finalMap.has(item.athleteId) ? score(finalMap.get(item.athleteId)) : item.status === 'done' ? score(item.finalScore) : item.status === 'active' ? 'Trwa występ' : 'Oczekuje'}</em>
      </div>)}
    </div>
  </div>

  return <div className="ika-category-detail-panel" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <div className="ika-category-detail-intro">
      <h3>{session ? 'Lista startowa i oceny' : matches.length ? 'Drabinka i przebieg walk' : 'Zgłoszeni zawodnicy'}</h3>
      <p>{row.mat} · {athletes.length} zawodników · {row.competition}</p>
    </div>
    <label className="ika-category-detail-search">Znajdź zawodnika w tej kategorii
      <input type="search" value={query} onChange={e => { setQuery(e.target.value); setSelectedId('') }} placeholder="Imię lub nazwisko..." />
    </label>
    {query.trim() && <div className="ika-category-detail-found">
      {found.map(item => <button type="button" key={item.id} className={currentId === item.id ? 'selected' : ''} onClick={() => setSelectedId(item.id)}>{item.firstName} {item.lastName}</button>)}
      {!found.length && <span>Nie znaleziono zawodnika w tej kategorii.</span>}
    </div>}
    {currentId && <div className="ika-category-detail-location">
      <b>{athleteName(currentId)}</b>
      <span>{target ? `${target.roundName || 'Walka'} · ${target.status === 'done' ? target.winnerId === currentId ? 'Wygrana' : 'Przegrana' : target.status === 'active' ? 'W trakcie' : 'Oczekuje'}` : session ? 'Zaznaczony na liście kata' : 'Zgłoszony do kategorii — oczekuje na losowanie'}</span>
    </div>}
    {session ? <>
      {twoRounds && scoringList(session.preliminaryResults || [], 'Eliminacje')}
      {scoringList(session.results || [], twoRounds ? 'Finał' : 'Lista startowa i oceny')}
      {combined.length > 0 && scoringList(combined.map((item, i) => ({...item, order: i + 1, status: 'done', finalScore: item.totalScore})), 'Wyniki końcowe — suma dwóch rund', true)}
    </> : matches.length > 0 ? <div className="ika-category-detail-bracket">
      <KumiteBracket matches={matches} athletes={data.athletes || []} clubs={data.clubs || []} sideTheme={getKumiteSideTheme(competition || {})} variant="panel" highlightMatchId={target?.id || null} />
    </div> : <p className="ika-category-detail-note">Losowanie lub lista startowa nie zostały jeszcze przygotowane. Poniżej są zawodnicy zgłoszeni do tej kategorii.</p>}
    {!session && (!matches.length || currentId) && <div className="ika-category-detail-athletes">
      {athletes.map((item, i) => <div key={item.id} className={`ika-category-detail-athlete ${currentId === item.id ? 'highlight' : ''}`}>
        <b>{i + 1}.</b><span><strong>{item.firstName} {item.lastName}</strong><small>{clubName(item.id)}</small></span>
      </div>)}
      {!athletes.length && <p>Brak zgłoszonych zawodników.</p>}
    </div>}
  </div>
}
