import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { db, getTatamiPayload } from '../lib/demoStore'
import { getKumiteSideTheme } from '../lib/kumiteRules'

const scoreText = (value) => value == null ? '—' : String(Number(value)).replace('.', ',')

const fmt = (seconds) => {
  const s = Math.max(0, Number(seconds || 0))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
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

  const displayMode = payload.displayMode || payload.state?.mode

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
              <div><strong>{result.athlete ? `${result.athlete.firstName} ${result.athlete.lastName}` : '—'}</strong><span>{result.athlete?.clubName || ''}</span>{result.kataName && <small className="kata-tv-kata-name-inline">Kata: {result.kataName}</small>}</div>
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
          <h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '—'}</h1>
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
            <h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '—'}</h1>
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
          <div className="kata-final-athlete"><div className="kata-scoreboard-photo">{athlete?.photo ? <img src={athlete.photo} alt={`${athlete.firstName} ${athlete.lastName}`} /> : <div>{(athlete?.firstName?.[0] || '')}{(athlete?.lastName?.[0] || '')}</div>}</div><div><h1>{athlete ? `${athlete.firstName} ${athlete.lastName}` : '—'}</h1><p>{athlete?.clubName || ''}</p>{result?.kataName && <div className="kata-final-kata-name"><span>KATA</span><strong>{result.kataName}</strong></div>}</div></div>
          <div className={`kata-tv-score-grid judges-${payload.kata.judgeCount}`}>{Array.from({ length: payload.kata.judgeCount }, (_, index) => <article key={index} className={dropped.has(index) ? 'dropped' : ''}><span>SĘDZIA {index + 1}</span><strong>{scoreText(result?.scores?.[index])}</strong>{dropped.has(index) && <small>ODRZUCONA</small>}</article>)}</div>
          <div className="kata-final-total"><span>KOŃCOWA OCENA</span><strong>{scoreText(result?.finalScore)}</strong>{payload.kata.judgeCount === 5 && <small>Najwyższa i najniższa nota nie są liczone.</small>}</div>
        </section>
      </main>
    )
  }

  if (displayMode === 'podium' && payload.podium) {
    const byPlace = (place) => payload.podium.placements.filter((item) => item.place === place)
    const first = byPlace(1)[0] || null
    const second = byPlace(2)[0] || null
    const thirds = byPlace(3)

    const athleteTile = (result, place) => {
      if (!result) {
        return (
          <div className={`podium-athlete podium-athlete-${place} podium-athlete-empty`}>
            <div className="podium-photo podium-photo-empty">—</div>
            <strong>—</strong>
          </div>
        )
      }
      const info = athleteInfo(result.athleteId)
      const initials = result.athleteName.split(' ').map((part) => part[0]).slice(0, 2).join('')
      return (
        <article className={`podium-athlete podium-athlete-${place}`}>
          <div className="podium-photo">
            {info?.photo ? <img src={info.photo} alt={result.athleteName} /> : <div>{initials}</div>}
          </div>
          <strong>{result.athleteName}</strong>
          <small>{result.clubName}</small>
        </article>
      )
    }

    return (
      <main className="tatami-screen podium-screen podium-screen-v2">
        <FullscreenControl />
        <header className="podium-header">
          <div><strong>IKA POLAND</strong><span>{payload.tournament.name}</span></div>
          <div><b>PODIUM</b><span>{payload.podium.competitionName} • {payload.podium.categoryName}</span></div>
          <div><b>{matName}</b><span>Kategoria zakończona</span></div>
        </header>
        <section className="podium-stage-v2">
          <div className="podium-title-v2">
            <span>KATEGORIA ZAKOŃCZONA</span>
            <h1>{payload.podium.categoryName}</h1>
            <p>{payload.podium.competitionName}</p>
          </div>

          <div className="podium-platform-wrap">
            <div className="podium-slot podium-slot-second">
              <div className="podium-athletes-on-step">{athleteTile(second, 'silver')}</div>
              <div className="podium-step podium-step-silver"><span>2</span><small>2. MIEJSCE</small></div>
            </div>

            <div className="podium-slot podium-slot-first">
              <div className="podium-athletes-on-step">{athleteTile(first, 'gold')}</div>
              <div className="podium-step podium-step-gold"><span>1</span><small>1. MIEJSCE</small></div>
            </div>

            <div className="podium-slot podium-slot-third">
              <div className={`podium-athletes-on-step ${thirds.length > 1 ? 'podium-two-bronzes' : ''}`}>
                {thirds.length ? thirds.map((item) => <React.Fragment key={item.athleteId}>{athleteTile(item, 'bronze')}</React.Fragment>) : athleteTile(null, 'bronze')}
              </div>
              <div className="podium-step podium-step-bronze"><span>3</span><small>{thirds.length > 1 ? '3. MIEJSCA' : '3. MIEJSCE'}</small></div>
            </div>
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
            <div className="scoreboard-athlete-photo">
              {m.redAthlete?.photo ? (
                <img src={m.redAthlete.photo} alt={`${m.redAthlete.firstName} ${m.redAthlete.lastName}`} />
              ) : (
                <div className="scoreboard-athlete-photo-fallback">
                  {(m.redAthlete?.firstName?.[0] || '')}{(m.redAthlete?.lastName?.[0] || '')}
                </div>
              )}
            </div>
            <h1>{m.redAthlete ? `${m.redAthlete.firstName} ${m.redAthlete.lastName}` : '—'}</h1>
            <p>{m.redAthlete?.clubName || ''}</p>
            <strong className="score-number">{scoreText(m.redScore)}</strong>
          </div>
          <div className="fight-center">
            <span>{m.roundName} • WALKA {m.matchNo}</span>
            <div className="fight-clock">{fmt(m.remaining)}</div>
            <small>{m.timerRunning ? 'CZAS TRWA' : 'CZAS ZATRZYMANY'}</small><small>WAZARI = 1 PUNKT • IPPON = 2 PUNKTY</small>
          </div>
          <div className={`fighter ${sideTheme.mode === 'red-white' ? 'fighter-white' : 'fighter-blue'} ${sideTheme.blue.className}`}>
            <div className="scoreboard-athlete-photo">
              {m.blueAthlete?.photo ? (
                <img src={m.blueAthlete.photo} alt={`${m.blueAthlete.firstName} ${m.blueAthlete.lastName}`} />
              ) : (
                <div className="scoreboard-athlete-photo-fallback">
                  {(m.blueAthlete?.firstName?.[0] || '')}{(m.blueAthlete?.lastName?.[0] || '')}
                </div>
              )}
            </div>
            <h1>{m.blueAthlete ? `${m.blueAthlete.firstName} ${m.blueAthlete.lastName}` : '—'}</h1>
            <p>{m.blueAthlete?.clubName || ''}</p>
            <strong className="score-number">{scoreText(m.blueScore)}</strong>
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
        <div className="next-fight-box"><small>NASTĘPNA WALKA</small><strong>{payload.nextMatch?.redAthlete ? `${payload.nextMatch.redAthlete.firstName} ${payload.nextMatch.redAthlete.lastName}` : '—'} vs {payload.nextMatch?.blueAthlete ? `${payload.nextMatch.blueAthlete.firstName} ${payload.nextMatch.blueAthlete.lastName}` : '—'}</strong></div>
      </header>
      <section className="bracket-board">
        {rounds.map((round) => (
          <div className="bracket-round" key={`${round.index}-${round.name}`}>
            <h2>{round.name}</h2>
            <div className="bracket-round-matches">
              {round.matches.map((match) => {
                const red = athleteInfo(match.redResolvedId)
                const blue = athleteInfo(match.blueResolvedId)
                return (
                  <article className={`bracket-match ${match.status === 'done' ? 'bracket-match-done' : ''}`} key={match.id}>
                    <small>Walka {match.matchNo}</small>
                    <div className={`bracket-colored-side bracket-red-side ${match.winnerId === match.redResolvedId ? 'bracket-winner' : ''}`}><i className="bracket-color-mark" aria-hidden="true" /><strong>{red?.name || 'Oczekiwanie na zwycięzcę'}</strong>{red?.club && <em>{red.club}</em>}</div>
                    <div className={`bracket-colored-side ${sideTheme.mode === 'red-white' ? 'bracket-white-side' : 'bracket-blue-side'} ${match.winnerId === match.blueResolvedId ? 'bracket-winner' : ''}`}><i className="bracket-color-mark" aria-hidden="true" /><strong>{blue?.name || 'Oczekiwanie na zwycięzcę'}</strong>{blue?.club && <em>{blue.club}</em>}</div>
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
