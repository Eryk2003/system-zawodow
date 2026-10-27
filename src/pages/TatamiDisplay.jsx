import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { db, getTatamiPayload } from '../lib/demoStore'
import { getKumitePenaltyLabel, getKumiteSideTheme } from '../lib/kumiteRules'
import KumiteBracket from '../components/KumiteBracket'

const scoreText = (value) => value == null ? '-' : String(Number(value)).replace('.', ',')

const fmt = (seconds) => {
  const s = Math.max(0, Number(seconds || 0))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const penaltyLevelFor = (match, side, type) => {
  if (!match) return 0
  const key = side === 'red'
    ? (type === 'behavior' ? 'redBehaviorPenaltyLevel' : 'redExitPenaltyLevel')
    : (type === 'behavior' ? 'blueBehaviorPenaltyLevel' : 'blueExitPenaltyLevel')
  if (match[key] != null) return Number(match[key] || 0)
  const legacyKey = side === 'red' ? 'redPenaltyLevel' : 'bluePenaltyLevel'
  return type === 'exit' ? Number(match[legacyKey] || 0) : 0
}

const renderTvPenalty = (match, side, type) => {
  const level = penaltyLevelFor(match, side, type)
  return (
    <div className={`tv-penalty-col ${level ? 'active' : ''}`}>
      <small>{type === 'exit' ? 'WYCHODZENIE ZA MATĘ' : 'NIESPORTOWE ZACHOWANIE'}</small>
      <strong>{getKumitePenaltyLabel(level)}</strong>
    </div>
  )
}


function FullscreenControl() {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
      setVisible(true)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      setVisible(true)
      return undefined
    }
    let timer = window.setTimeout(() => setVisible(false), 3000)
    const reveal = () => {
      setVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), 3000)
    }
    window.addEventListener('mousemove', reveal)
    window.addEventListener('touchstart', reveal, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', reveal)
      window.removeEventListener('touchstart', reveal)
    }
  }, [isFullscreen])

  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch (_) {
      // Przeglądarka może zablokować pełny ekran, jeśli akcja nie pochodzi bezpośrednio od użytkownika.
    }
  }

  return (
    <button
      type="button"
      className={`tv-fullscreen-btn ${visible ? 'is-visible' : 'is-hidden'}`}
      onClick={toggle}
      title={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
    >
      <span aria-hidden="true">{isFullscreen ? '⤢' : '⛶'}</span>
      <b>{isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}</b>
    </button>
  )
}

export default function TatamiDisplay() {
  const { mat } = useParams()
  const matName = decodeURIComponent(mat || 'Tatami 1')
  const [payload, setPayload] = useState(() => getTatamiPayload(matName))
  const [completedView, setCompletedView] = useState('winner')

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
  const podiumKey = payload.podium?.key || (payload.podium ? `${payload.podium.competitionName || ''}|||${payload.podium.categoryName || ''}` : '')

  useEffect(() => {
    if (displayMode !== 'podium' || !payload.podium) {
      setCompletedView('winner')
      return undefined
    }

    setCompletedView('winner')
    const timer = window.setTimeout(() => setCompletedView('results'), 6000)
    return () => window.clearTimeout(timer)
  }, [displayMode, podiumKey])

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

  if (!payload.matches.length && !payload.kata) {
    return (
      <main className="tatami-screen tatami-empty">
        <FullscreenControl />
        <div className="tatami-brand">IKA POLAND</div>
        <h1>{matName}</h1>
        <p>Oczekiwanie na uruchomienie drabinki.</p>
      </main>
    )
  }

  if (displayMode === 'kata-list' && payload.kata) {
    const nextId = payload.kata.nextResult?.athleteId || payload.kata.session.currentAthleteId
    return (
      <main className="tatami-screen kata-tv-screen kata-list-screen">
        <FullscreenControl />
        <header className="kata-tv-header">
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>LISTA UCZESTNIKÓW</b><span>{payload.competition?.name || 'Kata'} • {payload.state?.category || payload.kata.session.category}</span></div>
          <div><b>{matName}</b><span>{payload.kata.judgeCount} sędziów</span></div>
        </header>
        <section className="kata-tv-list">
          {payload.kata.results.map((result) => (
            <article key={result.athleteId} className={`kata-tv-list-row ${result.athleteId === nextId && result.status !== 'done' ? 'next' : ''} ${result.status}`}>
              <b>{result.order}</b>
              <div><strong>{result.athlete ? `${result.athlete.firstName} ${result.athlete.lastName}` : '-'}</strong><span>{result.athlete?.clubName || ''}</span>{result.kataName && <small className="kata-tv-kata-name-inline">Kata: {result.kataName}</small>}</div>
              <em>{result.status === 'done' ? scoreText(result.finalScore) : result.athleteId === nextId ? 'NASTĘPNY' : 'OCZEKUJE'}</em>
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
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>{payload.competition?.name || 'Kata'}</b><span>{payload.state?.category || payload.kata.session.category}</span></div>
          <div><b>{matName}</b><span>Następny zawodnik</span></div>
        </header>
        <section className="kata-athlete-stage">
          <div className="kata-athlete-tv-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div>
          <span>NASTĘPNY ZAWODNIK</span>
          <h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</h1>
          <p>{athlete?.clubName || ''}</p>
          {result?.kataName && <div className="kata-tv-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}
          <small>Po wykonaniu kata sędzia główny używa gwizdka, a następnie wprowadzane są oceny.</small>
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
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>OCENY SĘDZIÓW</b><span>{payload.competition?.name || 'Kata'} • {payload.state?.category || payload.kata.session.category}</span></div>
          <div><b>{matName}</b><span>{payload.kata.judgeCount} sędziów</span></div>
        </header>
        <section className="kata-scoreboard-stage">
          <div className="kata-scoreboard-athlete">
            <div className="kata-scoreboard-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div>
            <h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</h1>
            <p>{athlete?.clubName || ''}</p>
            {result?.kataName && <div className="kata-scoreboard-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}
          </div>
          <div className={`kata-tv-score-grid judges-${payload.kata.judgeCount}`}>
            {Array.from({ length: payload.kata.judgeCount }, (_, index) => <article key={index}><span>SĘDZIA {index + 1}</span><strong>{scoreText(result?.scores?.[index])}</strong></article>)}
          </div>
          <div className="kata-waiting-final">OCZEKIWANIE NA KOŃCOWĄ OCENĘ</div>
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
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>KOŃCOWA OCENA</b><span>{payload.competition?.name || 'Kata'} • {payload.state?.category || payload.kata.session.category}</span></div>
          <div><b>{matName}</b><span>Wynik zapisany</span></div>
        </header>
        <section className="kata-final-stage">
          <div className="kata-final-athlete"><div className="kata-scoreboard-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div><div><h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '-'}</h1><p>{athlete?.clubName || ''}</p>{result?.kataName && <div className="kata-final-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}</div></div>
          <div className={`kata-tv-score-grid judges-${payload.kata.judgeCount}`}>{Array.from({ length: payload.kata.judgeCount }, (_, index) => <article key={index} className={dropped.has(index) ? 'dropped' : ''}><span>SĘDZIA {index + 1}</span><strong>{scoreText(result?.scores?.[index])}</strong>{dropped.has(index) && <small>ODRZUCONA</small>}</article>)}</div>
          <div className="kata-final-total"><span>KOŃCOWA OCENA</span><strong>{scoreText(result?.finalScore)}</strong>{payload.kata.judgeCount === 5 && <small>Najwyższa i najniższa nota nie są liczone.</small>}</div>
        </section>
      </main>
    )
  }

  if (displayMode === 'podium' && payload.podium) {
    const placements = payload.podium.placements || []
    const first = placements.find((item) => item.place === 1) || null
    const winnerInfo = first ? athleteInfo(first.athleteId) : null
    const winnerInitials = first?.athleteName
      ? first.athleteName.split(' ').map((part) => part[0]).slice(0, 2).join('')
      : '-'

    const placementByAthlete = new Map(placements.map((item) => [item.athleteId, item]))
    const entries = db.getEntries().filter((entry) => {
      if (payload.podium.categoryId && entry.categoryId) return entry.categoryId === payload.podium.categoryId
      return entry.competitionId === payload.podium.competitionId && entry.category === payload.podium.categoryName
    })
    const participantIds = [...new Set([
      ...placements.map((item) => item.athleteId),
      ...entries.map((entry) => entry.athleteId),
    ].filter(Boolean))]
    const finalList = participantIds.map((athleteId) => {
      const placement = placementByAthlete.get(athleteId) || null
      const info = athleteInfo(athleteId)
      const athlete = athletes.find((item) => item.id === athleteId)
      const fallbackName = athlete ? `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() : 'Nieznany zawodnik'
      return {
        athleteId,
        place: placement?.place || null,
        name: placement?.athleteName || info?.name || fallbackName,
        club: placement?.clubName || info?.club || '',
        photo: info?.photo || athlete?.photo || '',
      }
    }).sort((a, b) => {
      const pa = a.place == null ? 99 : a.place
      const pb = b.place == null ? 99 : b.place
      return pa - pb || a.name.localeCompare(b.name, 'pl')
    })

    if (completedView === 'winner') {
      return (
        <main
          key={`${podiumKey}-winner`}
          className="tatami-screen final-winner-screen"
        >
          <FullscreenControl />
          <header className="final-results-header">
            <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
            <div><b>ZWYCIĘZCA</b><span>{payload.podium.competitionName} • {payload.podium.categoryName}</span></div>
            <div><b>{matName}</b><span>Kategoria zakończona</span></div>
          </header>

          <section className="final-winner-stage">
            <div className="final-winner-label">1. MIEJSCE</div>
            <article className="final-winner-card">
              <div className="final-winner-photo">
                {winnerInfo?.photo ? (
                  <img src={winnerInfo.photo} alt={first?.athleteName || 'Zwycięzca'} />
                ) : (
                  <div>{winnerInitials}</div>
                )}
              </div>
              <div className="final-winner-copy">
                <span>ZWYCIĘZCA KONKURENCJI</span>
                <h1>{first?.athleteName || '-'}</h1>
                <p>{first?.clubName || winnerInfo?.club || ''}</p>
                <div className="final-winner-meta">
                  <strong>{payload.podium.competitionName}</strong>
                  <small>{payload.podium.categoryName}</small>
                </div>
              </div>
            </article>
            <small className="final-winner-next">Za chwilę pełna lista wyników</small>
          </section>
        </main>
      )
    }

    return (
      <main
        key={`${podiumKey}-results`}
        className="tatami-screen final-results-screen"
      >
        <FullscreenControl />
        <header className="final-results-header">
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>WYNIKI KOŃCOWE</b><span>{payload.podium.competitionName} • {payload.podium.categoryName}</span></div>
          <div><b>{matName}</b><span>{finalList.length} zawodników</span></div>
        </header>

        <section className="final-results-stage">
          <div className="final-results-title">
            <span>KATEGORIA ZAKOŃCZONA</span>
            <h1>{payload.podium.categoryName}</h1>
            <p>{payload.podium.competitionName}</p>
          </div>

          <div className={`final-results-grid ${finalList.length > 10 ? 'is-dense' : ''}`}>
            {finalList.map((result, index) => {
              const initials = result.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
              const placeText = result.place === 1
                ? '1. MIEJSCE'
                : result.place === 2
                  ? '2. MIEJSCE'
                  : result.place === 3
                    ? '3. MIEJSCE'
                    : 'UCZESTNIK'
              return (
                <article
                  className={`final-result-row place-${result.place || 'other'}`}
                  key={result.athleteId}
                  style={{ '--result-delay': `${Math.min(index * 90, 900)}ms` }}
                >
                  <div className="final-result-place">{result.place || '-'}</div>
                  <div className="final-result-photo">
                    {result.photo ? <img src={result.photo} alt={result.name} /> : <div>{initials}</div>}
                  </div>
                  <div className="final-result-person">
                    <strong>{result.name}</strong>
                    <span>{result.club}</span>
                  </div>
                  <em>{placeText}</em>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    )
  }

  if (displayMode === 'scoreboard' && payload.currentMatch) {
    const m = payload.currentMatch
    return (
      <main className="tatami-screen scoreboard-screen">
        <FullscreenControl />
        <header className="scoreboard-header">
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>{matName}</b><span>{payload.competition?.name || ''} • {payload.state?.category || ''}</span></div>
        </header>
        <section className="scoreboard-body">
          <div className={`fighter fighter-red ${sideTheme.red.className}`}>
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
            <strong className="score-number">{scoreText(m.redScore)}</strong>
            <div className="tv-penalties-grid">{renderTvPenalty(m, 'red', 'exit')}{renderTvPenalty(m, 'red', 'behavior')}</div>
          </div>
          <div className="fight-center">
            <span>{m.roundName} • WALKA {m.matchNo}</span>
            <div className="fight-clock">{fmt(m.remaining)}</div>
            <small>{m.timerRunning ? 'CZAS TRWA' : 'CZAS ZATRZYMANY'}</small><small>HANSOKU = PRZEGRANA</small>
          </div>
          <div className={`fighter ${sideTheme.mode === 'red-white' ? 'fighter-white' : 'fighter-blue'} ${sideTheme.blue.className}`}>
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
            <strong className="score-number">{scoreText(m.blueScore)}</strong>
            <div className="tv-penalties-grid">{renderTvPenalty(m, 'blue', 'exit')}{renderTvPenalty(m, 'blue', 'behavior')}</div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="tatami-screen bracket-screen">
      <FullscreenControl />
      <header className="bracket-header">
        <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
        <div className="bracket-title"><b>{matName}</b><span>{payload.competition?.name || ''} • {payload.state?.category || ''}</span></div>
        <div className="next-fight-box"><small>NASTĘPNA WALKA</small><strong>{payload.nextMatch?.redAthlete ? `${payload.nextMatch.redAthlete.firstName} ${payload.nextMatch.redAthlete.lastName}` : '-'} vs {payload.nextMatch?.blueAthlete ? `${payload.nextMatch.blueAthlete.firstName} ${payload.nextMatch.blueAthlete.lastName}` : '-'}</strong></div>
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
