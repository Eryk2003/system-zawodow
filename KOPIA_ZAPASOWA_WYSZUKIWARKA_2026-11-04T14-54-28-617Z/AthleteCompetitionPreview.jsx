import React, { useMemo } from 'react'
import KumiteBracket from './KumiteBracket.jsx'
import { resolveMatch, getKataCombinedResults } from '../lib/demoStore'
import { getKumiteSideTheme } from '../lib/kumiteRules'
import './AthleteCompetitionPreview.css'

const scoreText = value => value == null || !Number.isFinite(Number(value)) ? '—' : String(Math.round(Number(value) * 100) / 100).replace('.', ',')
const isSameCategory = (record, entry) => Boolean(entry.categoryId && record.categoryId && record.categoryId === entry.categoryId) ||
  (record.competitionId === entry.competitionId && record.category === entry.category && (!entry.mat || !record.mat || entry.mat === record.mat))

export default function AthleteCompetitionPreview({ entry, athleteId, data }) {
  const competition = data.competitions.find(c => c.id === entry.competitionId) || null
  const session = data.sessions.find(s => isSameCategory(s, entry)) || null
  const matches = data.matches.filter(m => isSameCategory(m, entry))
  const bracket = useMemo(() => matches.map(m => resolveMatch(m, data.matches)), [data.matches, entry.categoryId, entry.competitionId, entry.category, entry.mat])
  const isKata = Boolean(session) || (!matches.length && (competition?.group === 'Kata' || ['para-kata','para-kihon'].includes(competition?.id)))

  const results = session?.results || []
  const prelim = session?.preliminaryResults || []
  const twoRounds = Number(session?.totalRounds || 1) === 2 && prelim.length > 0
  const combined = session?.status === 'completed' && twoRounds ? getKataCombinedResults(session) : []
  const totalMap = new Map(combined.map(r => [r.athleteId, r.totalScore]))
  const competitorName = id => {
    const a = data.athletes.find(v => v.id === id)
    return a ? `${a.firstName || ''} ${a.lastName || ''}`.trim() : 'Zawodnik'
  }
  const clubName = id => {
    const a = data.athletes.find(v => v.id === id)
    return data.clubs.find(c => c.id === a?.clubId)?.shortName || data.clubs.find(c => c.id === a?.clubId)?.name || ''
  }
  const renderList = (items, stage, withTotal = false) => (
    <div className="ika-search-preview-list-group" key={stage}>
      <h4>{stage}</h4>
      <div className="ika-search-preview-list">
        {items.map((result, i) => <div key={result.athleteId} className={`ika-search-preview-athlete ${result.athleteId === athleteId ? 'is-searched-athlete' : ''}`}>
          <b>{result.order || i + 1}.</b>
          <div><strong>{competitorName(result.athleteId)}</strong><small>{clubName(result.athleteId)}</small></div>
          <span>{withTotal && totalMap.has(result.athleteId) ? scoreText(totalMap.get(result.athleteId)) : result.status === 'done' ? scoreText(result.finalScore) : result.status === 'active' ? 'Trwa występ' : 'Oczekuje'}</span>
        </div>)}
      </div>
    </div>
  )

  if (isKata) return (
    <div className="ika-search-preview" aria-label={`Lista startowa i oceny - ${entry.category}`}>
      <div className="ika-search-preview-head"><h3>Lista kata i oceny</h3><span>{session?.mat || entry.mat || 'Tatami w przygotowaniu'}</span></div>
      {!session ? <p className="ika-search-preview-empty">Lista startowa nie została jeszcze wylosowana. Pojawi się tutaj automatycznie po przygotowaniu konkurencji.</p> : <>
        {twoRounds && renderList(prelim, 'Eliminacje')}
        {renderList(results, twoRounds ? 'Finał - wyniki bieżącej rundy' : 'Lista startowa i wyniki')}
        {combined.length > 0 && <div className="ika-search-preview-total">{renderList(combined.map((r,i) => ({ ...r, order:i+1, status:'done', finalScore:r.totalScore })), 'Klasyfikacja końcowa - suma dwóch rund')}</div>}
      </>}
    </div>
  )

  if (!matches.length) return <div className="ika-search-preview"><div className="ika-search-preview-head"><h3>Drabinka kumite</h3></div><p className="ika-search-preview-empty">Drabinka nie została jeszcze wylosowana. Po losowaniu pojawi się tutaj automatycznie.</p></div>

  const finished = bracket.filter(m => m.status === 'done' && m.winnerId)
  const own = finished.filter(m => m.redResolvedId === athleteId || m.blueResolvedId === athleteId)
  const active = bracket.find(m => m.status === 'active' && (m.redResolvedId === athleteId || m.blueResolvedId === athleteId))
  const next = bracket.find(m => m.status !== 'done' && (m.redResolvedId === athleteId || m.blueResolvedId === athleteId))
  const last = own.at(-1)
  const theme = getKumiteSideTheme(competition)

  return <div className="ika-search-preview" aria-label={`Drabinka i wyniki - ${entry.category}`}>
    <div className="ika-search-preview-head"><h3>Drabinka kumite</h3><span>{entry.mat || 'Tatami w przygotowaniu'}</span></div>
    {(active || next || last) && <p className="ika-search-preview-status">
      {active ? `Trwa: ${active.roundName || 'walka'}` : next ? `Najbliższa runda: ${next.roundName || 'oczekiwanie'}` : `Ostatnia walka: ${last.roundName || 'zakończona'}`}
      {last?.status === 'done' && <span> · Ostatni wynik: {last.winnerId === athleteId ? 'wygrana' : 'przegrana'}</span>}
    </p>}
    <div className="ika-search-preview-bracket"><KumiteBracket matches={matches} athletes={data.athletes} clubs={data.clubs} sideTheme={theme} variant="panel" highlightMatchId={active?.id || next?.id || null}/></div>
    {own.length > 0 && <div className="ika-search-preview-history"><h4>Rozegrane walki zawodnika</h4>{own.map(m => <div key={m.id}><span>{m.roundName || 'Walka'} · {competitorName(m.redResolvedId)} vs {competitorName(m.blueResolvedId)}</span><strong>{m.winnerId === athleteId ? 'Wygrana' : 'Przegrana'} · {Number(m.redScore||0)}:{Number(m.blueScore||0)}</strong></div>)}</div>}
  </div>
}
