import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../lib/demoStore'
import JudgePanel from './JudgePanel'
import KataJudgePanel from './KataJudgePanel'
import TournamentPodiumTop3 from '../components/TournamentPodiumTop3.jsx'

// Jeden panel sedziego. Konkurencja wynika z aktualnego tatami i harmonogramu.
// Oryginalne moduly kata/kumite zachowuja cala logike ocen i walk.
export default function UnifiedJudgePanel() {
  const { mat } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const matName = decodeURIComponent(mat || 'Tatami 1')
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  // IKA20-WINNERS-FIX: wspolny znacznik czasu dla sedziego i telewizora
  const WINNERS_DISPLAY_MS = 20000

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('ika:data', refresh)
    window.addEventListener('storage', refresh)
    const interval = setInterval(refresh, 1200)
    return () => {
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('storage', refresh)
      clearInterval(interval)
    }
  }, [matName])

  const competitions = db.getCompetitions()
  const categories = db.getTournamentCategories()
  const schedule = db.getSchedule()
  const matches = db.getMatches()
  const sessions = db.getKataSessions()
  const matState = db.getMatState(matName) || {}
  // Wyniki ostatniej ukonczonej kategorii sa pobierane z zapisanych rezultatow,
  // a nie z adresu URL lub tymczasowego stanu ekranu.
  const lastPodium = db.getTournamentPodiums()
    .filter(item => item.mat === matName && item.placements?.length)
    .sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0))[0] || null
  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const podiumAthlete = athleteId => {
    const athlete = athletes.find(item => item.id === athleteId)
    if (!athlete) return null
    const club = clubs.find(item => item.id === athlete.clubId)
    return {
      name: `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim(),
      club: club?.shortName || club?.name || '',
      photo: athlete.photo || '',
    }
  }
  const items = categories.flatMap(category => {
    const competition = competitions.find(value => value.id === category.competitionId)
    const kind = competition?.group === 'Kata' ? 'kata' : competition?.group === 'Kumite' ? 'kumite' : null
    if (!kind) return []
    const related = value => (value.categoryId && value.categoryId === category.id) ||
      (value.competitionId === category.competitionId && value.category === category.name)
    const slot = schedule.find(related)
    const plannedMat = slot?.mat || category.preferredMat || ''
    const ownMatches = matches.filter(value => related(value) && value.mat === matName)
    const session = sessions.find(value => related(value) && value.mat === matName)
    if (plannedMat !== matName && ownMatches.length === 0 && !session) return []
    const prepared = kind === 'kata' ? Boolean(session) : ownMatches.length > 0
    const done = kind === 'kata' ? session?.status === 'completed' :
      prepared && ownMatches.every(value => value.status === 'done')
    const busy = kind === 'kata' ? Boolean(session && session.status === 'active' && session.phase === 'scores') :
      ownMatches.some(value => value.status === 'active')
    return [{ category, kind, session, ownMatches, prepared, done, busy,
      scheduleIndex: slot ? schedule.indexOf(slot) : Number.MAX_SAFE_INTEGER }]
  }).sort((a, b) => a.scheduleIndex - b.scheduleIndex)

  const same = item => item && item.category.competitionId === matState.competitionId && item.category.name === matState.category
  const current = items.find(same)
  const ongoing = items.find(item => item.busy)
  const fromUrl = items.find(item => item.kind === 'kata' && item.session?.id === params.get('sessionId')) ||
    items.find(item => item.kind === 'kumite' && item.category.competitionId === params.get('competitionId') && item.category.name === params.get('category'))
  const next = items.find(item => item.prepared && !item.done)
  // Czas zakonczenia jest zapisany w stanie tatami, nie w nietrwalym useRef.
  // Kumite: podiumShownAt. Kata: kataFinalShownAt (ostatni wystep).
  const winnersShownAt = current?.kind === 'kata'
    ? Number(matState.kataFinalShownAt || 0)
    : Number(matState.podiumShownAt || 0)
  const holdWinners = Boolean(current?.done && winnersShownAt > 0 &&
    Date.now() - winnersShownAt >= 0 && Date.now() - winnersShownAt < WINNERS_DISPLAY_MS)
  const chosen = ongoing || (holdWinners ? current : null) ||
    (current?.prepared && !current.done ? current : null) ||
    (fromUrl?.prepared && !fromUrl.done ? fromUrl : null) || next || null


  useEffect(() => {
    if (!chosen || matState.breakActive || matState.mode === 'break') return
    if (same(chosen) && (chosen.kind !== 'kata' || matState.kataSessionId === chosen.session?.id)) return
    // Dodatkowy bezpiecznik - nie przelaczamy stanowiska w trakcie punktowania.
    if (items.some(item => item.busy && item !== chosen)) return
    // Pozwalamy poprzedniej kategorii pokazac wynik koncowy na TV.
    if (holdWinners) return
    try {
      const activeFight = chosen.ownMatches.find(item => item.status === 'active')
      const kataMode = chosen.session?.phase === 'scores' ? 'kata-scores' :
        chosen.session?.phase === 'athlete' ? 'kata-athlete' : 'kata-list'
      db.setMatState(matName, {
        ...matState,
        competitionId: chosen.category.competitionId,
        category: chosen.category.name,
        categoryId: chosen.category.id,
        kataSessionId: chosen.kind === 'kata' ? chosen.session?.id : null,
        currentMatchId: chosen.kind === 'kumite' ? activeFight?.id || null : null,
        mode: chosen.kind === 'kata' ? kataMode : activeFight ? 'scoreboard' : 'bracket',
        lastCompletedMatchId: null,
        autoTransition: null,
        transitionAuto: false,
      })
      setError('')
    } catch (e) { setError(e?.message || 'Nie udalo sie automatycznie przelaczyc kategorii.') }
  }, [revision, matName, chosen?.category.id, matState.competitionId, matState.category, matState.mode])

  useEffect(() => {
    if (!chosen) return
    // Parametry adresu musza odpowiadac nowej kategorii, bo stare moduly je odczytuja.
    const query = chosen.kind === 'kata'
      ? `sessionId=${encodeURIComponent(chosen.session.id)}`
      : `competitionId=${encodeURIComponent(chosen.category.competitionId)}&category=${encodeURIComponent(chosen.category.name)}`
    const target = `/organizator/panel-sedziego/${encodeURIComponent(matName)}?${query}`
    const currentUrl = window.location.pathname + window.location.search
    if (currentUrl !== target) navigate(target, { replace: true })
  }, [matName, chosen?.category.id, chosen?.session?.id, chosen?.kind, navigate])


  if (error) return <div role="alert" style={{ padding: 24, color: '#ae1d16' }}>{error}</div>
  if (!chosen && lastPodium) return (
    <main style={{ minHeight: '100vh', background: '#090b10', color: '#f4f6fb' }}>
      <div style={{ padding: '18px 24px', background: '#171b23', borderBottom: '1px solid #383e4d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: '#e1261c' }}>IKA POLAND · {matName}</strong>
          <div style={{ marginTop: 5, fontSize: 14 }}>Ostatnia zakończona konkurencja: {lastPodium.competitionName} - {lastPodium.categoryName}</div>
        </div>
        <span style={{ fontSize: 13, color: '#b8c1d0' }}>Oczekiwanie na kolejną przygotowaną konkurencję</span>
      </div>
      <TournamentPodiumTop3
        podium={lastPodium}
        matName={matName}
        tournamentName={db.getTournament().name || ''}
        getAthlete={podiumAthlete}
      />
    </main>
  )
  if (!chosen) return <div style={{ padding: 24 }}>Na {matName} nie ma jeszcze zakończonej ani przygotowanej konkurencji. Panel wznowi pracę, gdy pojawi się drabinka kumite lub lista kata.</div>
  return chosen.kind === 'kata'
    ? <KataJudgePanel key={`kata:${matName}:${chosen.session.id}`} />
    : <JudgePanel key={`kumite:${matName}:${chosen.category.id}`} />
}
