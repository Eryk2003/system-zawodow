import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { db, getTatamiPayload } from '../lib/demoStore'
import { getKumitePenaltyLabel, getKumiteSideTheme } from '../lib/kumiteRules'
import KumiteBracket from '../components/KumiteBracket'
import TechniqueScoreColumns from '../components/TechniqueScoreColumns.jsx'
import TournamentPodiumTop3 from '../components/TournamentPodiumTop3.jsx'
/* ika104-tv */
import { tvRound, tvCategory, tvCompetition, tvStage, tvPenaltyLabel } from '../lib/tvEnglish.js'

const scoreText = (value) => value == null ? '-' : String(Number(value))

const tvPenaltyLevel = (match,side,reason) => {
  const key = side + (reason === 'exit' ? 'ExitPenaltyLevel' : 'BehaviorPenaltyLevel')
  if (match?.[key] != null) return Number(match[key]||0)
  return reason === 'exit' ? Number(match?.[side+'PenaltyLevel']||0) : 0
}
function TvPenaltyColumns({match,side}) {
  return <div className="ika104-tv-penalty-grid">
    {[
      { key:'exit', name:'EXITING THE MAT' },
      { key:'behavior', name:'UNSPORTING BEHAVIOUR' },
    ].map(({key,name}) => {
      const level = tvPenaltyLevel(match,side,key)
      return <div key={key} className={'ika104-tv-penalty '+(level?'active':'')}>
        <small>{name}</small><strong>{getKumitePenaltyLabel(level) === 'BRAK' ? 'NONE' : getKumitePenaltyLabel(level)}</strong>
      </div>
    })}
  </div>
}

const fmt = (seconds) => {
  const s = Math.max(0, Number(seconds || 0))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}


/* IKA95_FULLSCREEN - przycisk ukrycia paska adresu w trybie pelnoekranowym */
/* ETAP 103 - SPACE uruchamia pelny ekran TV bez paska adresu */
function FullscreenControl() {
  const active = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement)
  const [isFullscreen, setIsFullscreen] = useState(active)
  const [visible, setVisible] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const onChange = () => { setIsFullscreen(active()); setVisible(true); setBlocked(false) }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  useEffect(() => {
    if (!isFullscreen) { setVisible(true); return undefined }
    let timer = window.setTimeout(() => setVisible(false), 2800)
    const reveal = () => {
      setVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), 2800)
    }
    window.addEventListener('mousemove', reveal)
    window.addEventListener('touchstart', reveal, { passive:true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', reveal)
      window.removeEventListener('touchstart', reveal)
    }
  }, [isFullscreen])

  const toggle = async () => {
    try {
      if (active()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen
        if (exit) await exit.call(document)
      } else {
        const enter = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen
        if (!enter) { setBlocked(true); return }
        await enter.call(document.documentElement)
      }
    } catch (_) { setBlocked(true) }
  }

  useEffect(() => {
    const onKey = (event) => {
      // Spacja jest dzialaniem uzytkownika wymaganym przez Fullscreen API.
      if ((event.code !== 'Space' && event.key !== ' ' && event.key !== 'Spacebar') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
      // Nie przechwytuj pisania ani obslugi przyciskow / linkow.
      const focused = document.activeElement
      if (focused?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(focused?.tagName)) return
      event.preventDefault()
      toggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  /* ETAP 109: bez przycisku EXIT FULLSCREEN na aktywnym pelnym ekranie. */
  if (isFullscreen) return null;

  return (
    <button
      type="button"
      className={`tv-fullscreen-btn ika95-tv-fullscreen ${isFullscreen ? '' : 'ika95-tv-fullscreen-enter'} ${visible ? 'is-visible' : 'is-hidden'}`}
      onClick={toggle}
      title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen TV - press SPACE'}
      aria-label={isFullscreen ? 'Exit TV fullscreen' : 'Fullscreen TV - press Space'}
    >
      <span aria-hidden="true">{isFullscreen ? '⤢' : '⛶'}</span>
      <b>{blocked ? 'Fullscreen blocked - use F11' : isFullscreen ? 'EXIT FULLSCREEN (ESC)' : 'FULLSCREEN TV (SPACE)'}</b>
    </button>
  )
}


export default function TatamiDisplay() {
  const { mat } = useParams()
  const matName = decodeURIComponent(mat || 'Tatami 1')
  const [payload, setPayload] = useState(() => getTatamiPayload(matName))

  useEffect(() => {
    const refresh = () => setPayload(getTatamiPayload(matName))
    window.addEventListener('storage', refresh)
    window.addEventListener('ika:data', refresh)
    const interval = setInterval(refresh, 500)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ika:data', refresh)
      clearInterval(interval)
    }
  }, [matName])


  const displayMode = payload.displayMode || payload.state?.mode
  useEffect(() => {
    const nextId = payload.nextMatch?.id
    if (displayMode !== 'bracket' || !nextId) return undefined

    const timer = window.setTimeout(() => {
      const board = document.querySelector('.academy-bracket-tv-wrap')
      const target = board?.querySelector(`[data-match-id="${nextId}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }, 180)

    return () => window.clearTimeout(timer)
  }, [payload.displayMode, payload.state?.mode, payload.nextMatch?.id])

  const athletes = db.getAthletes()
  const sideTheme = getKumiteSideTheme(payload.competition)
  const clubs = db.getClubs()
  const athleteInfo = (id) => {
    const athlete = athletes.find((a) => a.id === id)
    const club = athlete ? clubs.find((c) => c.id === athlete.clubId) : null
    return athlete ? { name: `${athlete.firstName} ${athlete.lastName}`, club: club?.shortName || club?.name || '', photo: athlete.photo || '' } : null
  }

  const rounds = useMemo(() => {
    const map = new Map()
    payload.matches.forEach((match) => {
      const key = `${match.roundIndex}-${match.roundName}`
      if (!map.has(key)) map.set(key, { name: match.roundName, index: match.roundIndex, matches: [] })
      map.get(key).matches.push(match)
    })
    return [...map.values()].sort((a, b) => a.index - b.index)
  }, [payload.matches])

  /* ETAP 102: przerwa lokalna dla tatami - plakat zamiast obrazu walki */
  if (payload.state?.breakActive || payload.state?.mode === 'break') {
    return (
      <main className="tatami-screen ika102-break-poster-screen">
        <FullscreenControl />
        {payload.tournament?.poster ? (
          <img
            className="ika102-break-poster"
            src={payload.tournament.poster}
            alt={`Event poster - ${payload.tournament?.name || 'IKA Poland'}`}
          />
        ) : (
          <section className="ika102-break-placeholder">
            <strong>BREAK</strong>
            <span>{payload.tournament?.name || 'IKA POLAND'}</span>
            <small>Competition will resume soon</small>
          </section>
        )}
      </main>
    )
  }

  if (!payload.matches.length && !payload.kata) {
    return (
      <main className="tatami-screen tatami-empty">
        <FullscreenControl />
        <div className="tatami-brand ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></div>
        <h1>{matName}</h1>
        <p>Waiting for the bracket to start.</p>
      </main>
    )
  }

  if (displayMode === 'kata-list' && payload.kata) {
    const nextId = payload.kata.nextResult?.athleteId || payload.kata.session.currentAthleteId
    return (
      <main className="tatami-screen kata-tv-screen kata-list-screen">
        <FullscreenControl />
        <header className="kata-tv-header">
          <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{payload.tournament.name}</span></div>
          <div><b>COMPETITOR LIST</b><span>{tvCompetition(payload.competition?.name || 'Kata')} • {tvCategory(payload.state?.category || payload.kata.session.category)} • {tvStage(payload.kata.stageName || 'KATA')}</span></div>
          <div><b>{matName}</b><span>{payload.kata.judgeCount} judges • round {payload.kata.roundNumber || 1}/{payload.kata.totalRounds || 1}</span></div>
        </header>
        <section className="kata-tv-list">
          {payload.kata.results.map((result) => (
            <article key={result.athleteId} className={`kata-tv-list-row ${result.athleteId === nextId && result.status !== 'done' ? 'next' : ''} ${result.status}`}>
              <b>{result.order}</b>
              <div><strong>{result.athlete ? `${result.athlete.firstName} ${result.athlete.lastName}` : '-'}</strong><span>{result.athlete?.clubName || ''}</span>{result.kataName && <small className="kata-tv-kata-name-inline">Kata: {result.kataName}</small>}</div>
              <em>{result.status === 'done' ? scoreText(result.finalScore) : result.athleteId === nextId ? 'NEXT' : 'WAITING'}</em>
            </article>
          ))}
        </section>
      </main>
    )
  }

  if (displayMode === 'kata-athlete' && payload.kata) {
    const result = payload.kata.nextResult || payload.kata.currentResult
    const athlete = result?.athlete
    return (
      <main className="tatami-screen kata-tv-screen kata-athlete-screen">
        <FullscreenControl />
        <header className="kata-tv-header">
          <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{payload.tournament.name}</span></div>
          <div><b>{tvCompetition(payload.competition?.name || 'Kata')}</b><span>{tvCategory(payload.state?.category || payload.kata.session.category)}</span></div>
          <div><b>{matName}</b><span>Next competitor</span></div>
        </header>
        <section className="kata-athlete-stage">
          <div className="kata-athlete-tv-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div>
          <span>NEXT COMPETITOR</span>
          <h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</h1>
          <p>{athlete?.clubName || ''}</p>
          {result?.kataName && <div className="kata-tv-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}
          <small>After the performance, the head judge signals and the scores are entered.</small>
        </section>
      </main>
    )
  }

  if (displayMode === 'kata-scores' && payload.kata) {
    const result = payload.kata.currentResult || payload.kata.nextResult
    const athlete = result?.athlete
    return (
      <main className="tatami-screen kata-tv-screen kata-scores-screen">
        <FullscreenControl />
        <header className="kata-tv-header">
          <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{payload.tournament.name}</span></div>
          <div><b>JUDGES' SCORES</b><span>{tvCompetition(payload.competition?.name || 'Kata')} • {tvCategory(payload.state?.category || payload.kata.session.category)} • {tvStage(payload.kata.stageName || 'KATA')}</span></div>
          <div><b>{matName}</b><span>{payload.kata.judgeCount} judges • round {payload.kata.roundNumber || 1}/{payload.kata.totalRounds || 1}</span></div>
        </header>
        <section className="kata-scoreboard-stage">
          <div className="kata-scoreboard-athlete">
            <div className="kata-scoreboard-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div>
            <h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</h1>
            <p>{athlete?.clubName || ''}</p>
            {result?.kataName && <div className="kata-scoreboard-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}
          </div>
          <div className={`kata-tv-score-grid judges-${payload.kata.judgeCount}`}>
            {Array.from({ length: payload.kata.judgeCount }, (_, index) => <article key={index}><span>JUDGE {index + 1}</span><strong>{scoreText(result?.scores?.[index])}</strong></article>)}
          </div>
          <div className="kata-waiting-final">WAITING FOR FINAL SCORE</div>
        </section>
      </main>
    )
  }

  if (displayMode === 'kata-final' && payload.kata) {
    const result = payload.kata.finalResult
    const athlete = result?.athlete
    const dropped = new Set(result?.droppedIndexes || [])
    return (
      <main className="tatami-screen kata-tv-screen kata-final-screen">
        <FullscreenControl />
        <header className="kata-tv-header">
          <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{payload.tournament.name}</span></div>
          <div><b>FINAL SCORE</b><span>{tvCompetition(payload.competition?.name || 'Kata')} • {tvCategory(payload.state?.category || payload.kata.session.category)} • {tvStage(payload.kata.stageName || 'KATA')}</span></div>
          <div><b>{matName}</b><span>Score saved</span></div>
        </header>
        <section className="kata-final-stage">
          <div className="kata-final-athlete"><div className="kata-scoreboard-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div><div><h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</h1><p>{athlete?.clubName || ''}</p>{result?.kataName && <div className="kata-final-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}</div></div>
          <div className={`kata-tv-score-grid judges-${payload.kata.judgeCount}`}>{Array.from({ length: payload.kata.judgeCount }, (_, index) => <article key={index} className={dropped.has(index) ? 'dropped' : ''}><span>JUDGE {index + 1}</span><strong>{scoreText(result?.scores?.[index])}</strong>{dropped.has(index) && <small>EXCLUDED</small>}</article>)}</div>
          <div className="kata-final-total"><span>FINAL SCORE</span><strong>{scoreText(result?.finalScore)}</strong>{payload.kata.judgeCount === 5 && <small>The highest and lowest scores are excluded.</small>}</div>
        </section>
      </main>
    )
  }

  /* ETAP 106 - podium TOP3 after kata and kumite */
  if (displayMode === 'podium' && payload.podium) {
    return <TournamentPodiumTop3
      podium={payload.podium}
      matName={matName}
      tournamentName={payload.tournament?.name || ''}
      getAthlete={athleteInfo}
      fullscreenControl={<FullscreenControl />}
    />
  }

  if (displayMode === 'scoreboard' && payload.currentMatch) {
    const m = payload.currentMatch
    const isFinished = m.status === 'done' && Boolean(m.winnerId)
    const redWinner = isFinished && m.winnerId === m.redResolvedId
    const blueWinner = isFinished && m.winnerId === m.blueResolvedId
    return (
      <main className="tatami-screen scoreboard-screen">
        <FullscreenControl />
        <header className="scoreboard-header">
          <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{payload.tournament.name}</span></div>
          <div><b>{matName}</b><span>{tvCompetition(payload.competition?.name || '')} • {tvCategory(payload.state?.category || '')}</span></div>
        </header>
        <section className="scoreboard-body">
          <div className={`fighter fighter-red ${sideTheme.red.className} ${isFinished ? (redWinner ? 'ika105-winner' : 'ika105-loser') : ''}`}>
            <div className="fighter-side">{sideTheme.red.code}</div>
            <div className="scoreboard-athlete-photo">
              {m.redAthlete?.photo ? (
                <img src={m.redAthlete.photo} alt={`${m.redAthlete.firstName} ${m.redAthlete.lastName}`} />
              ) : (
                <div className="scoreboard-athlete-photo-fallback">
                  {(m.redAthlete?.firstName?.[0] || '')}{(m.redAthlete?.lastName?.[0] || '')}
                </div>
              )}
            </div>
            <h1>{m.redAthlete ? `${m.redAthlete.firstName} ${m.redAthlete.lastName}` : '-'}</h1>
            <p>{m.redAthlete?.clubName || ''}</p>
            {redWinner && <div className="ika105-winner-badge">WINNER</div>}
            <strong className="score-number">{scoreText(m.redScore)}</strong>
            <TechniqueScoreColumns match={m} side="red" mode="tv" />
            <TvPenaltyColumns match={m} side="red" />
          </div>
          <div className="fight-center">
            <span>{isFinished ? 'BOUT FINISHED' : `${tvRound(m.roundName)} • BOUT ${m.matchNo}`}</span>
            <div className="fight-clock">{fmt(m.remaining)}</div>
            <small>{isFinished ? 'WINNER' : (m.timerRunning ? 'TIMER RUNNING' : 'TIMER STOPPED')}</small><small>HANSOKU = DEFEAT</small>
          </div>
          <div className={`fighter ${sideTheme.mode === 'red-white' ? 'fighter-white' : 'fighter-blue'} ${sideTheme.blue.className} ${isFinished ? (blueWinner ? 'ika105-winner' : 'ika105-loser') : ''}`}>
            <div className="fighter-side">{sideTheme.blue.code}</div>
            <div className="scoreboard-athlete-photo">
              {m.blueAthlete?.photo ? (
                <img src={m.blueAthlete.photo} alt={`${m.blueAthlete.firstName} ${m.blueAthlete.lastName}`} />
              ) : (
                <div className="scoreboard-athlete-photo-fallback">
                  {(m.blueAthlete?.firstName?.[0] || '')}{(m.blueAthlete?.lastName?.[0] || '')}
                </div>
              )}
            </div>
            <h1>{m.blueAthlete ? `${m.blueAthlete.firstName} ${m.blueAthlete.lastName}` : '-'}</h1>
            <p>{m.blueAthlete?.clubName || ''}</p>
            {blueWinner && <div className="ika105-winner-badge">WINNER</div>}
            <strong className="score-number">{scoreText(m.blueScore)}</strong>
            <TechniqueScoreColumns match={m} side="blue" mode="tv" />
            <TvPenaltyColumns match={m} side="blue" />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="tatami-screen bracket-screen">
      <FullscreenControl />
      <header className="bracket-header">
        <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{payload.tournament.name}</span></div>
        <div className="bracket-title"><b>{matName}</b><span>{tvCompetition(payload.competition?.name || '')} • {tvCategory(payload.state?.category || '')}</span></div>
        <div className="next-fight-box"><small>NEXT BOUT</small><strong>{payload.nextMatch?.redAthlete ? `${payload.nextMatch.redAthlete.firstName} ${payload.nextMatch.redAthlete.lastName}` : '-'} vs {payload.nextMatch?.blueAthlete ? `${payload.nextMatch.blueAthlete.firstName} ${payload.nextMatch.blueAthlete.lastName}` : '-'}</strong></div>
      </header>
      <section className="bracket-board academy-bracket-tv-wrap">
        <KumiteBracket
          matches={payload.matches}
          athletes={athletes}
          clubs={clubs}
          sideTheme={sideTheme}
          variant="tv"
          highlightMatchId={payload.nextMatch?.id || null}
        />
      </section>
    </main>
  )
}
