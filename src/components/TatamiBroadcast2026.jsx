import React from 'react'
import { tvCategory, tvCompetition, tvRound, tvStage } from '../lib/tvEnglish.js'
import { getKumitePenaltyLabel } from '../lib/kumiteRules.js'

// IKA-TV-BROADCAST-2026: wyłącznie prezentacja, bez zapisu lub zmiany wyników.
const firstNonempty = (...values) => values.find(value => typeof value === 'string' && value.trim()) || ''
const personName = person => person ? [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || '—' : '—'
const smallScore = value => value == null || value === '' ? '—' : String(Number(value)).replace('.', ',')
const padTime = value => {
  const secs = Math.max(0, Math.floor(Number(value) || 0))
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
}
const countryLabel = person => {
  const value = firstNonempty(person?.country, person?.countryCode, person?.nationality)
  if (['PL', 'POL', 'Polska', 'Poland'].includes(value)) return 'POLAND'
  return value.toUpperCase()
}
const countryFlag = person => countryLabel(person) === 'POLAND' ? '🇵🇱' : ''
const clipTitle = value => String(value || '').trim()
const techniqueCount = (match, side, kind) => Math.max(0, Math.floor(Number(match?.[`${side}${kind}Count`] || 0)))
const penaltyLabel = (match, side, key) => {
  const val = Number(match?.[`${side}${key}PenaltyLevel`] ?? (key === 'Exit' ? match?.[`${side}PenaltyLevel`] : 0)) || 0
  const label = getKumitePenaltyLabel(val)
  return label === 'BRAK' ? 'NONE' : label
}

function TvTop({ tournament, matName, category, stage }) {
  return <header className="ikatv26-top">
    <div className="ikatv26-mark"><span className="ikatv26-emblem">IKA</span><div className="ikatv26-brand"><strong>IKA <b>POLAND</b></strong><small>KARATE TOURNAMENT</small></div></div>
    <div className="ikatv26-top-info"><strong>{clipTitle(tournament) || 'IKA POLAND'}</strong><span>{matName} <i>•</i> {clipTitle(category)}</span></div>
    {stage && <div className="ikatv26-stage">{stage}</div>}
  </header>
}

function JudgeRow({ count, scores, mode }) {
  const amount = [3, 5].includes(Number(count)) ? Number(count) : 3
  return <div className="ikatv26-judges" aria-label="Judges' scores">
    {Array.from({ length: amount }, (_, index) => {
      const score = scores?.[index]
      return <div className="ikatv26-judge" key={index}>
        <span>J{index + 1}</span>
        <strong className={score == null || score === '' ? 'ikatv26-waiting' : ''}>
          {mode === 'athlete' ? '—' : smallScore(score)}
        </strong>
      </div>
    })}
  </div>
}

function AthletePicture({ athlete }) {
  return <div className="ikatv26-kata-picture">
    {athlete?.photo ? <img src={athlete.photo} alt={personName(athlete)}/> : <span>{[athlete?.firstName?.[0], athlete?.lastName?.[0]].filter(Boolean).join('') || 'IKA'}</span>}
  </div>
}

function nextKataName(kata, current) {
  const ordered = [...(kata?.results || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  const currentOrder = Number(current?.order || 0)
  const upcoming = ordered.find(item => Number(item.order || 0) > currentOrder && item.status !== 'done')
    || ordered.find(item => item.athleteId !== current?.athleteId && item.status !== 'done')
  return personName(upcoming?.athlete)
}

export function TatamiKataBroadcast2026({ payload, matName, mode, fullscreenControl }) {
  const kata = payload.kata || {}
  const current = mode === 'final'
    ? kata.finalResult || kata.currentResult
    : mode === 'athlete' ? kata.nextResult || kata.currentResult : kata.currentResult || kata.nextResult
  const athlete = current?.athlete
  const stage = tvStage(kata.stageName || '')
  const judges = Number(kata.judgeCount || 3)
  const category = `${tvCompetition(payload.competition?.name || 'Kata')} • ${tvCategory(payload.state?.category || kata.session?.category || '')}`
  const round = `ROUND ${kata.roundNumber || 1}/${kata.totalRounds || 1}`
  const isFinal = mode === 'final'
  const nextName = nextKataName(kata, current)
  return <main className="tatami-screen ikatv26 ikatv26-kata" data-tv-view={`kata-${mode}`}>
    {fullscreenControl}
    <TvTop tournament={payload.tournament?.name} matName={matName} category={category} stage={round}/>
    <div className="ikatv26-kata-heading"><div><strong>{tvCategory(payload.state?.category || kata.session?.category || '')}</strong><span>{stage || 'KATA'}</span></div><b>{isFinal ? 'RESULT' : mode === 'scores' ? 'JUDGES’ SCORES' : 'CURRENT COMPETITOR'}</b></div>
    <section className="ikatv26-kata-content">
      <div className="ikatv26-kata-primary">
        <AthletePicture athlete={athlete}/>
        <div className="ikatv26-kata-person">
          <small className="ikatv26-kata-order">{current?.order ? `${current.order}.` : ''}</small>
          <h1>{personName(athlete)}</h1>
          <div className="ikatv26-kata-club">{countryFlag(athlete) && <span>{countryFlag(athlete)}</span>}<div><strong>{firstNonempty(athlete?.clubName) || '—'}</strong>{countryLabel(athlete) && <small>{countryLabel(athlete)}</small>}</div></div>
          {current?.kataName && <div className="ikatv26-kata-name"><small>KATA</small><b>{current.kataName}</b></div>}
        </div>
      </div>
      <aside className="ikatv26-kata-next"><span>NEXT</span><strong>{nextName !== '—' ? nextName : '—'}</strong></aside>
    </section>
    <JudgeRow count={judges} scores={current?.scores} mode={mode}/>
    <footer className="ikatv26-footer"><strong>IKA <b>POLAND</b></strong><span>{isFinal ? 'SCORE SAVED' : mode === 'scores' ? 'JUDGES ARE SCORING' : 'WAITING FOR PERFORMANCE'}</span></footer>
  </main>
}

// IKA-TV-PHOTO-PENALTIES-V2: zdjecie zawodnika lub czytelne miejsce na zdjecie.
function FighterPortrait({ person, side }) {
  const [failed, setFailed] = React.useState(false)
  const initials = [person?.firstName?.[0], person?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '—'
  return <div className={`ikatv26-fighter-photo ${side}`} aria-label={person?.photo ? `Zdjęcie: ${personName(person)}` : 'Miejsce na zdjęcie zawodnika'}>
    {person?.photo && !failed
      ? <img src={person.photo} alt={personName(person)} onError={() => setFailed(true)} />
      : <div className="ikatv26-fighter-photo-empty"><strong>{initials}</strong><small>PHOTO</small></div>}
  </div>
}

function BroadcastCompetitor({ person, side, isWinner }) {
  return <div className={`ikatv26-fighter-info ${side} ${isWinner ? 'winner' : ''}`}>
    <FighterPortrait key={`${side}-${person?.id || personName(person)}`} person={person} side={side} />
    <div className="ikatv26-fighter-copy">
      <div className="ikatv26-fighter-club">
        {countryFlag(person) && <span className="ikatv26-flag">{countryFlag(person)}</span>}
        <div><strong>{firstNonempty(person?.clubName) || '—'}</strong>{countryLabel(person) && <small>{countryLabel(person)}</small>}</div>
      </div>
      <h2>{personName(person)}</h2>
      {isWinner && <span className="ikatv26-win-tag">WINNER</span>}
    </div>
  </div>
}

function TechniqueCount({ match, side, kind, label }) {
  return <div className="ikatv26-technique"><span>{label}</span><strong>{techniqueCount(match, side, kind)}</strong></div>
}

// IKA-TV-PHOTO-PENALTIES-V2: przejrzyste pola kar, bez zmian w logice.
// Kary pozostaja oparte na oryginalnym stanie walki: bez zmian punktacji lub limitow.
function Penalties({ match, side }) {
  const rows = [
    { key: 'Exit', label: 'EXITING THE MAT' },
    { key: 'Behavior', label: 'UNSPORTING BEHAVIOUR' },
  ]
  return <div className="ikatv26-penalties" aria-label={`Penalties ${side}`}>
    {rows.map(({ key, label }) => {
      const level = Number(match?.[`${side}${key}PenaltyLevel`] ?? (key === 'Exit' ? match?.[`${side}PenaltyLevel`] : 0)) || 0
      return <div key={key} className={`ikatv26-penalty-card ${level > 0 ? 'has-penalty' : 'no-penalty'} ${level >= 4 ? 'is-hansoku' : ''}`}>
        <span>{label}</span>
        <strong>{penaltyLabel(match, side, key)}</strong>
      </div>
    })}
  </div>
}

export function TatamiKumiteBroadcast2026({ payload, matName, match, sideTheme, fullscreenControl }) {
  const finished = match.status === 'done' && Boolean(match.winnerId)
  const redWins = finished && match.winnerId === match.redResolvedId
  const blueWins = finished && match.winnerId === match.blueResolvedId
  const fantom = sideTheme.discipline === 'fantom'
  const rightIsWhite = sideTheme.mode === 'red-white'
  const category = `${tvCompetition(payload.competition?.name || '')} • ${tvCategory(payload.state?.category || '')}`
  return <main className="tatami-screen ikatv26 ikatv26-kumite" data-tv-view="scoreboard">
    {fullscreenControl}
    <TvTop tournament={payload.tournament?.name} matName={matName} category={category} stage={finished ? 'BOUT FINISHED' : `${tvRound(match.roundName)} • BOUT ${match.matchNo}`}/>
    <section className="ikatv26-kumite-board">
      <div className="ikatv26-kumite-col red">
        <div className="ikatv26-identity-label">{sideTheme.red.code}</div>
        {!fantom && <div className="ikatv26-techniques"><TechniqueCount match={match} side="red" kind="Ippon" label="IP"/><TechniqueCount match={match} side="red" kind="Wazari" label="WA"/></div>}
        <div className="ikatv26-bigscore">{Number(match.redScore || 0)}</div>
        <Penalties match={match} side="red"/>
      </div>
      <div className="ikatv26-kumite-middle">
        <span>{finished ? 'BOUT FINISHED' : match.timerRunning ? 'TIMER RUNNING' : 'TIMER STOPPED'}</span>
        <strong>{padTime(match.remaining)}</strong>
        <div className="ikatv26-center-logo"><b>IKA</b><span>POLAND</span></div>
      </div>
      <div className={`ikatv26-kumite-col ${rightIsWhite ? 'white' : 'blue'}`}>
        <div className="ikatv26-identity-label">{sideTheme.blue.code}</div>
        {!fantom && <div className="ikatv26-techniques"><TechniqueCount match={match} side="blue" kind="Ippon" label="IP"/><TechniqueCount match={match} side="blue" kind="Wazari" label="WA"/></div>}
        <div className="ikatv26-bigscore">{Number(match.blueScore || 0)}</div>
        <Penalties match={match} side="blue"/>
      </div>
    </section>
    <section className="ikatv26-fighters">
      <BroadcastCompetitor person={match.redAthlete} side="red" score={match.redScore} isWinner={redWins}/>
      <BroadcastCompetitor person={match.blueAthlete} side={rightIsWhite ? 'white' : 'blue'} score={match.blueScore} isWinner={blueWins}/>
    </section>
    <footer className="ikatv26-footer"><strong>IKA <b>POLAND</b></strong><span>{finished ? 'WINNER CONFIRMED' : 'LIVE SCOREBOARD'}</span></footer>
  </main>
}
