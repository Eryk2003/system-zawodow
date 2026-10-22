import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { db, getComputedRemaining, resolveMatch } from '../lib/demoStore'
import { getKumitePenaltyLabel, getKumiteSideTheme } from '../lib/kumiteRules'

const fmt = (seconds) => {
  const value = Math.max(0, Number(seconds || 0))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
const scoreText = (value) => String(Number(value || 0)).replace('.', ',')

export default function JudgePanel() {
  const { mat } = useParams()
  const [params] = useSearchParams()
  const matName = decodeURIComponent(mat || 'Tatami 1')
  const [refreshKey, setRefreshKey] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = () => setRefreshKey((v) => v + 1)

  useEffect(() => {
    const handle = () => refresh()
    window.addEventListener('storage', handle)
    window.addEventListener('ika:data', handle)
    const interval = setInterval(() => refresh(), 500)
    return () => {
      window.removeEventListener('storage', handle)
      window.removeEventListener('ika:data', handle)
      clearInterval(interval)
    }
  }, [])

  const allMatches = db.getMatches()
  const matState = db.getMatState(matName)
  const competitionId = params.get('competitionId') || matState?.competitionId || ''
  const category = params.get('category') || matState?.category || ''
  const competition = db.getCompetitions().find((c) => c.id === competitionId) || null
  const tournament = db.getTournament()
  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const theme = getKumiteSideTheme(competition)

  const matches = useMemo(() => allMatches
    .filter((m) => m.mat === matName && (!competitionId || m.competitionId === competitionId) && (!category || m.category === category))
    .sort((a, b) => a.queueOrder - b.queueOrder), [allMatches, matName, competitionId, category, refreshKey])

  const resolvedMatches = matches.map((m) => resolveMatch(m, allMatches))
  const active = resolvedMatches.find((m) => m.status === 'active') || null
  const next = resolvedMatches.find((m) => m.status !== 'done' && m.redResolvedId && m.blueResolvedId) || null

  const athlete = (id) => {
    const item = athletes.find((a) => a.id === id)
    if (!item) return { name: 'Oczekiwanie', club: '' }
    const club = clubs.find((c) => c.id === item.clubId)
    return { name: `${item.firstName} ${item.lastName}`, club: club?.shortName || club?.name || '' }
  }

  const run = (action, success = '') => {
    try {
      setError('')
      action()
      if (success) setMessage(success)
      refresh()
    } catch (e) {
      setError(e.message || 'Nie udało się wykonać operacji.')
    }
  }

  const showBracket = () => run(() => db.setMatState(matName, {
    mode: 'bracket', competitionId, category, currentMatchId: null,
  }), 'Na tablicy TV wyświetlana jest drabinka.')

  const start = () => {
    if (!next) return
    run(() => db.startMatch(next.id), 'Walka przygotowana - zawodnicy są na tablicy. Kliknij START CZASU, aby uruchomić odliczanie.')
  }

  const finish = (winnerId) => {
    if (!active) return
    const isFinal = active.roundName === 'Finał'
    run(
      () => db.finishMatch(active.id, winnerId),
      isFinal ? 'Finał zakończony - tablica TV pokazuje podium kategorii.' : 'Walka zakończona - tablica TV wróciła do drabinki.',
    )
  }

  const changeScore = (side, delta) => {
    if (!active) return
    run(() => {
      const result = db.changeScore(active.id, side, delta)
      if (result?.status === 'done') {
        const winner = athlete(result.winnerId)
        setMessage(`Walka zakończona automatycznie - ${winner.name} wygrywa zgodnie z zasadami ${theme.winRule?.title || 'Shobu'}. Wynik został zablokowany.`)
      }
    })
  }

  const changePenalty = (side, level) => {
    if (!active) return
    run(() => {
      const result = db.changePenalty(active.id, side, level)
      if (result?.status === 'done' && result?.finishReason === 'HANSOKU') {
        const winner = athlete(result.winnerId)
        setMessage(`HANSOKU - walka zakończona. ${winner.name} wygrywa, a wynik i kary tej walki zostały zablokowane.`)
      }
    })
  }

  if (!matches.length) {
    return (
      <main className="judge-screen judge-empty">
        <div className="judge-topbar"><div><strong>IKA POLAND</strong><span>Panel sędziego • {matName}</span></div></div>
        <section className="judge-empty-card"><h1>Brak drabinki na tym tatami</h1><p>Najpierw utwórz drabinkę kumite w centrum zawodów.</p><a className="btn btn-primary" href="/organizator/zawody">Wróć do zawodów</a></section>
      </main>
    )
  }

  const activeRaw = active ? allMatches.find((m) => m.id === active.id) : null
  const red = athlete((active || next)?.redResolvedId)
  const blue = athlete((active || next)?.blueResolvedId)

  return (
    <main className={`judge-screen judge-${theme.mode}`}>
      <header className="judge-topbar">
        <div><strong>IKA POLAND</strong><span>{tournament.name}</span></div>
        <div className="judge-title"><b>PANEL SĘDZIEGO • {matName}</b><span>{competition?.name || 'Kumite'} • {category}</span></div>
        <div className="judge-actions"><button className="btn btn-outline" type="button" onClick={showBracket}>Drabinka na TV</button><a className="btn btn-primary" href={`/tatami/${encodeURIComponent(matName)}`} target="_blank" rel="noreferrer">Otwórz tablicę TV</a></div>
      </header>

      {(message || error) && <div className={`judge-message ${error ? 'error' : ''}`}>{error || message}</div>}

      <section className="judge-current">
        <div className={`judge-fighter ${theme.red.className}`}>
          <span className="judge-side-code">{theme.red.code}</span>
          <h2>{red.name}</h2>
          <p>{red.club}</p>
          <strong className="judge-score">{scoreText(active?.redScore || 0)}</strong>
          {active && <>
            <div className="judge-score-buttons judge-score-buttons-awards">
              <button onClick={() => changeScore('red', 1)}><strong>+1</strong></button>
              <button onClick={() => changeScore('red', 2)}><strong>+2</strong></button>
            </div>
            <div className="judge-correction-row">
              <span>Korekta wyniku</span>
              <button onClick={() => changeScore('red', -1)}>-1</button>
              <button onClick={() => changeScore('red', -2)}>-2</button>
            </div>
            <div className="judge-penalty-box">
              <span>KARY - {getKumitePenaltyLabel(activeRaw?.redPenaltyLevel)}</span>
              <div className="judge-penalty-buttons">
                <button className={Number(activeRaw?.redPenaltyLevel || 0) === 1 ? 'active' : ''} onClick={() => changePenalty('red', 1)}>ATTENAI 1</button>
                <button className={Number(activeRaw?.redPenaltyLevel || 0) === 2 ? 'active' : ''} onClick={() => changePenalty('red', 2)}>ATTENAI 2</button>
                <button className={Number(activeRaw?.redPenaltyLevel || 0) === 3 ? 'active' : ''} onClick={() => changePenalty('red', 3)}>CHUI</button>
                <button className="hansoku" onClick={() => changePenalty('red', 4)}>HANSOKU</button>
                <button className="penalty-undo" disabled={!Number(activeRaw?.redPenaltyLevel || 0)} onClick={() => changePenalty('red', Math.max(0, Number(activeRaw?.redPenaltyLevel || 0) - 1))}>COFNIJ KARĘ</button>
              </div>
            </div>
          </>}
        </div>

        <div className="judge-center">
          <span>{active ? `${active.roundName} • WALKA ${active.matchNo}` : next ? `${next.roundName} • WALKA ${next.matchNo}` : 'KONKURENCJA ZAKOŃCZONA'}</span>
          <strong className="judge-clock">{fmt(active ? getComputedRemaining(activeRaw) : tournament.boutSeconds)}</strong>
          <small>KARY: ATTENAI 1 → ATTENAI 2 → CHUI → HANSOKU</small>
          {theme.winRule && <small className="judge-win-rule">{theme.winRule.description} Po wygranej wynik jest automatycznie blokowany.</small>}
          {active ? (
            <div className="judge-main-controls judge-timer-controls">
              <button
                className={`btn ${activeRaw.timerRunning ? 'btn-outline' : 'btn-primary'} judge-time-start`}
                onClick={() => run(() => activeRaw.timerRunning ? db.pauseMatch(active.id) : db.resumeMatch(active.id))}
              >
                {activeRaw.timerRunning ? 'PAUZA CZASU' : 'START CZASU'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => run(() => db.adjustMatchTime(active.id, 10))}>COFNIJ 10 s</button>
              <button className="btn btn-outline" type="button" onClick={() => run(() => db.adjustMatchTime(active.id, -10))}>ODEJMIJ 10 s</button>
              <button className="btn btn-outline" type="button" onClick={() => run(() => db.resetMatchTimer(active.id))}>RESET CZASU</button>
            </div>
          ) : next ? (
            <button className="btn btn-primary judge-start" onClick={start}>ROZPOCZNIJ WALKĘ</button>
          ) : <strong className="judge-done">KONIEC DRABINKI</strong>}
        </div>

        <div className={`judge-fighter ${theme.blue.className}`}>
          <span className="judge-side-code">{theme.blue.code}</span>
          <h2>{blue.name}</h2>
          <p>{blue.club}</p>
          <strong className="judge-score">{scoreText(active?.blueScore || 0)}</strong>
          {active && <>
            <div className="judge-score-buttons judge-score-buttons-awards">
              <button onClick={() => changeScore('blue', 1)}><strong>+1</strong></button>
              <button onClick={() => changeScore('blue', 2)}><strong>+2</strong></button>
            </div>
            <div className="judge-correction-row">
              <span>Korekta wyniku</span>
              <button onClick={() => changeScore('blue', -1)}>-1</button>
              <button onClick={() => changeScore('blue', -2)}>-2</button>
            </div>
            <div className="judge-penalty-box">
              <span>KARY - {getKumitePenaltyLabel(activeRaw?.bluePenaltyLevel)}</span>
              <div className="judge-penalty-buttons">
                <button className={Number(activeRaw?.bluePenaltyLevel || 0) === 1 ? 'active' : ''} onClick={() => changePenalty('blue', 1)}>ATTENAI 1</button>
                <button className={Number(activeRaw?.bluePenaltyLevel || 0) === 2 ? 'active' : ''} onClick={() => changePenalty('blue', 2)}>ATTENAI 2</button>
                <button className={Number(activeRaw?.bluePenaltyLevel || 0) === 3 ? 'active' : ''} onClick={() => changePenalty('blue', 3)}>CHUI</button>
                <button className="hansoku" onClick={() => changePenalty('blue', 4)}>HANSOKU</button>
                <button className="penalty-undo" disabled={!Number(activeRaw?.bluePenaltyLevel || 0)} onClick={() => changePenalty('blue', Math.max(0, Number(activeRaw?.bluePenaltyLevel || 0) - 1))}>COFNIJ KARĘ</button>
              </div>
            </div>
          </>}
        </div>
      </section>

      {active && <section className="judge-winner-row"><span>ZAKOŃCZ WALKĘ I WSKAŻ ZWYCIĘZCĘ</span><button className="judge-winner red" onClick={() => finish(active.redResolvedId)}>{theme.red.code} - {athlete(active.redResolvedId).name}</button><button className={`judge-winner ${theme.mode === 'red-white' ? 'white' : 'blue'}`} onClick={() => finish(active.blueResolvedId)}>{theme.blue.code} - {athlete(active.blueResolvedId).name}</button></section>}

      <section className="judge-queue">
        <div className="judge-queue-head"><h3>Kolejność walk</h3><span>Po zakończeniu walki zwycięzca automatycznie przechodzi dalej.</span></div>
        <div className="judge-queue-list">
          {resolvedMatches.map((m) => {
            const r = athlete(m.redResolvedId)
            const b = athlete(m.blueResolvedId)
            return <article className={`judge-queue-match ${m.status}`} key={m.id}><span>{m.roundName} • {m.matchNo}</span><strong><i className="dot red" /><small className="judge-queue-side-label">{theme.red.code}</small>{r.name}</strong><b>VS</b><strong><i className={`dot ${theme.mode === 'red-white' ? 'white' : 'blue'}`} /><small className="judge-queue-side-label">{theme.blue.code}</small>{b.name}</strong><em>{m.status === 'done' ? `✓ ${athlete(m.winnerId).name}` : m.status === 'active' ? 'TRWA' : 'OCZEKUJE'}</em></article>
          })}
        </div>
      </section>
    </main>
  )
}
