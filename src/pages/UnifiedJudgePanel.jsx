import React, { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../lib/demoStore'
import JudgePanel from './JudgePanel'
import KataJudgePanel from './KataJudgePanel'

// Wspolny punkt wejsciowy. Same panele oceniania pozostaja bez zmian.
export default function UnifiedJudgePanel() {
  const { mat } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const matName = decodeURIComponent(mat || 'Tatami 1')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const tournament = db.getTournament()
  const matNames = Array.from({ length: Math.max(1, Number(tournament?.matCount) || 1) }, (_, i) => `Tatami ${i + 1}`)
  const competitions = db.getCompetitions()
  const schedule = db.getSchedule()
  const matches = db.getMatches()
  const sessions = db.getKataSessions()
  const categories = db.getTournamentCategories()
  const choices = useMemo(() => categories.flatMap(category => {
    const competition = competitions.find(c => c.id === category.competitionId)
    const kind = competition?.group === 'Kata' ? 'kata' : competition?.group === 'Kumite' ? 'kumite' : null
    if (!kind) return []
    const related = item => (item.categoryId && item.categoryId === category.id) ||
      (item.competitionId === category.competitionId && item.category === category.name)
    const planned = schedule.find(related)?.mat || category.preferredMat || ''
    const session = sessions.find(item => related(item) && item.mat === matName)
    const bracket = matches.find(item => related(item) && item.mat === matName)
    if (planned !== matName && !session && !bracket) return []
    return [{ category, competition, kind, session, prepared: kind === 'kata' ? !!session : !!bracket,
      id: `${kind}:${category.id}`, label: `${competition.name} - ${category.name}` }]
  }).sort((a, b) => Number(b.prepared) - Number(a.prepared) || a.label.localeCompare(b.label, 'pl')),
  [categories, competitions, schedule, sessions, matches, matName, revision])

  const matState = db.getMatState(matName) || {}
  const sessionId = params.get('sessionId') || ''
  const selected = choices.find(option => option.kind === 'kata' && option.session?.id === sessionId) ||
    choices.find(option => option.kind === 'kumite' && option.category.competitionId === params.get('competitionId') && option.category.name === params.get('category')) ||
    choices.find(option => option.category.competitionId === matState.competitionId && option.category.name === matState.category) || null
  const chosen = selected || choices.find(option => option.prepared) || null
  const isKata = chosen?.kind === 'kata'
  const active = choices.find(option => option.prepared && option.id === chosen?.id)

  const changeMat = nextMat => {
    setError('')
    navigate(`/organizator/panel-sedziego/${encodeURIComponent(nextMat)}`)
  }
  const changeCategory = id => {
    setError('')
    const next = choices.find(option => option.id === id)
    if (!next || !next.prepared) {
      setError('Najpierw przygotuj drabinke lub liste startowa tej kategorii w Centrum Zawodow.')
      return
    }
    const current = db.getMatState(matName) || {}
    if (current.breakActive || current.mode === 'break') {
      setError('Tatami jest w trybie przerwy. Najpierw wznow wyswietlanie TV.')
      return
    }
    if (matches.some(item => item.mat === matName && item.status === 'active' &&
      (item.competitionId !== next.category.competitionId || item.category !== next.category.name))) {
      setError('Trwa walka innej kategorii. Zakoncz ja przed przelaczeniem.')
      return
    }
    if (sessions.some(item => item.mat === matName && item.id !== next.session?.id && item.status === 'active' && item.phase === 'scores')) {
      setError('Trwa ocenianie kata. Zakoncz je przed przelaczeniem.')
      return
    }
    try {
      const activeFight = matches.find(item => item.mat === matName && item.status === 'active' &&
        item.competitionId === next.category.competitionId && item.category === next.category.name)
      const kataMode = next.session?.phase === 'scores' ? 'kata-scores' :
        next.session?.phase === 'athlete' ? 'kata-athlete' :
        next.session?.status === 'completed' ? 'podium' : 'kata-list'
      db.setMatState(matName, { ...current,
        competitionId: next.category.competitionId,
        category: next.category.name, categoryId: next.category.id,
        mode: next.kind === 'kata' ? kataMode : (activeFight ? 'scoreboard' : 'bracket'),
        kataSessionId: next.kind === 'kata' ? next.session?.id : null,
        currentMatchId: next.kind === 'kumite' ? (activeFight?.id || null) : null,
        lastCompletedMatchId: null, autoTransition: null, transitionAuto: false,
      })
      const query = next.kind === 'kata' ? `sessionId=${encodeURIComponent(next.session.id)}` :
        `competitionId=${encodeURIComponent(next.category.competitionId)}&category=${encodeURIComponent(next.category.name)}`
      navigate(`/organizator/panel-sedziego/${encodeURIComponent(matName)}?${query}`)
      setRevision(x => x + 1)
    } catch (e) { setError(e?.message || 'Nie udalo sie zmienic konkurencji.') }
  }

  return <>
    <div style={{padding:'14px 22px',background:'#181818',color:'#fff',display:'flex',flexWrap:'wrap',alignItems:'end',gap:14}}>
      <label style={{display:'grid',gap:5,fontWeight:700,fontSize:13}}>Tatami
        <select aria-label="Wybierz tatami" value={matName} onChange={e => changeMat(e.target.value)} style={{minWidth:135,padding:10,borderRadius:8}}>
          {matNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label style={{display:'grid',gap:5,fontWeight:700,fontSize:13,flex:'1 1 290px'}}>Kata / Kumite - kategoria
        <select aria-label="Wybierz konkurencje i kategorie" value={active?.id || ''} onChange={e => changeCategory(e.target.value)} style={{width:'100%',padding:10,borderRadius:8}}>
          <option value="">Wybierz przygotowana kategorie</option>
          {choices.map(item => <option key={item.id} value={item.id} disabled={!item.prepared}>
            {item.kind === 'kata' ? 'KATA' : 'KUMITE'} - {item.label}{!item.prepared ? ' (nieprzygotowana)' : ''}
          </option>)}
        </select>
      </label>
      <strong style={{paddingBottom:10,color:'#f34b42'}}>IKA POLAND - PANEL SEDZIEGO</strong>
    </div>
    {error && <div role="alert" style={{padding:'12px 22px',color:'#ae1d16',fontWeight:700}}>{error}</div>}
    {!chosen?.prepared ? <div style={{padding:24}}>Brak przygotowanej kategorii na tym tatami. Wroc do Centrum Zawodow i przygotuj drabinke kumite lub liste startowa kata.</div> :
      isKata ? <KataJudgePanel key={`kata:${matName}:${chosen.session?.id}`} /> :
        <JudgePanel key={`kumite:${matName}:${chosen.category.id}`} />}
  </>
}
