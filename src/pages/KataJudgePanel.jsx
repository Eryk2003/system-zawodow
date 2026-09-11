import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { db } from '../lib/demoStore'

const scoreText = (value) => value == null ? '—' : String(Number(value)).replace('.', ',')

function whistle() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1850, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(2450, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
    setTimeout(() => ctx.close?.(), 500)
  } catch {
    // Dźwięk jest dodatkiem. Punktacja działa również, gdy przeglądarka blokuje Web Audio.
  }
}

export default function KataJudgePanel() {
  const { mat } = useParams()
  const [params] = useSearchParams()
  const matName = decodeURIComponent(mat || 'Tatami 1')
  const requestedSessionId = params.get('sessionId') || ''
  const [refreshKey, setRefreshKey] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const scoreInputRefs = useRef([])
  const finalScoreButtonRef = useRef(null)

  const refresh = () => setRefreshKey((value) => value + 1)

  useEffect(() => {
    const handle = () => refresh()
    window.addEventListener('storage', handle)
    window.addEventListener('ika:data', handle)
    const interval = setInterval(handle, 500)
    return () => {
      window.removeEventListener('storage', handle)
      window.removeEventListener('ika:data', handle)
      clearInterval(interval)
    }
  }, [])

  const sessions = db.getKataSessions()
  const session = sessions.find((item) => item.id === requestedSessionId)
    || sessions.find((item) => item.mat === matName)
    || null
  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const competition = db.getCompetitions().find((item) => item.id === session?.competitionId) || null
  const tournament = db.getTournament()

  const athleteInfo = (athleteId) => {
    const athlete = athletes.find((item) => item.id === athleteId)
    if (!athlete) return { name: 'Nieznany zawodnik', club: '', photo: '' }
    const club = clubs.find((item) => item.id === athlete.clubId)
    return {
      name: `${athlete.firstName} ${athlete.lastName}`,
      club: club?.shortName || club?.name || '',
      photo: athlete.photo || '',
    }
  }

  const orderedResults = useMemo(() => (session?.results || []).slice().sort((a, b) => a.order - b.order), [session, refreshKey])
  const current = session?.results?.[session.currentIndex] || null
  const currentAthlete = athleteInfo(current?.athleteId)
  const completed = orderedResults.filter((result) => result.status === 'done')
  const liveRanking = completed.slice().sort((a, b) => Number(b.finalScore || 0) - Number(a.finalScore || 0) || Number(b.rawTotal || 0) - Number(a.rawTotal || 0))

  const run = (action, success = '') => {
    try {
      setError('')
      action()
      if (success) setMessage(success)
      refresh()
    } catch (err) {
      setError(err.message || 'Nie udało się wykonać operacji.')
    }
  }

  if (!session) {
    return (
      <main className="judge-screen judge-empty">
        <div className="judge-topbar"><div><strong>IKA POLAND</strong><span>Panel sędziego kata • {matName}</span></div></div>
        <section className="judge-empty-card"><h1>Brak listy startowej kata</h1><p>Najpierw utwórz listę startową dla kategorii kata w centrum zawodów.</p><a className="btn btn-primary" href="/organizator/zawody">Wróć do zawodów</a></section>
      </main>
    )
  }

  const started = current?.status === 'active'
  const scoresOpen = session.phase === 'scores' && started
  const isCompleteJudgeScore = (value) => /^\d\.\d$/.test(String(value ?? ''))
  const allScoresEntered = scoresOpen && (current.scores || []).slice(0, session.judgeCount).every(isCompleteJudgeScore)

  const handleJudgeScoreChange = (index, rawValue) => {
    const raw = String(rawValue ?? '').replace(',', '.').replace(/[^0-9.]/g, '')
    const digits = raw.replace(/\D/g, '')
    let formatted = ''
    let complete = false

    if (!digits) {
      formatted = ''
    } else if (digits.length === 1) {
      formatted = `${digits[0]}.`
    } else {
      formatted = `${digits[0]}.${digits[1]}`
      complete = true
    }

    run(() => db.updateKataJudgeScore(session.id, index, formatted))

    if (complete) {
      window.requestAnimationFrame(() => {
        if (index + 1 < session.judgeCount) {
          scoreInputRefs.current[index + 1]?.focus()
          scoreInputRefs.current[index + 1]?.select?.()
        } else {
          finalScoreButtonRef.current?.focus()
        }
      })
    }
  }

  const handleJudgeScoreKeyDown = (index, event) => {
    if (event.key === 'Backspace' && String(current?.scores?.[index] ?? '').endsWith('.')) {
      event.preventDefault()
      run(() => db.updateKataJudgeScore(session.id, index, ''))
    }
  }

  const updateKataName = (value) => run(() => db.updateKataName(session.id, value))
  const showAthlete = () => run(() => db.startKataAthlete(session.id), 'Zawodnik został pokazany na tablicy TV.')
  const showList = () => run(() => db.showKataList(session.id), 'Na tablicy TV wyświetlana jest lista startowa.')
  const blowWhistle = () => {
    whistle()
    run(() => db.kataWhistle(session.id), 'Gwizdek — sędziowie pokazują oceny. Wpisz je poniżej.')
  }
  const saveFinal = () => run(() => db.finalizeKataScore(session.id), 'Końcowa ocena zapisana. TV pokaże wynik, potem listę i następnego zawodnika.')

  return (
    <main className="judge-screen kata-judge-screen">
      <header className="judge-topbar kata-judge-topbar">
        <div><strong>IKA POLAND</strong><span>{tournament.name}</span></div>
        <div className="judge-title"><b>PANEL SĘDZIEGO KATA • {matName}</b><span>{competition?.name || 'Kata'} • {session.category}</span></div>
        <div className="judge-actions"><button className="btn btn-outline" type="button" onClick={showList}>Lista na TV</button><a className="btn btn-primary" href={`/tatami/${encodeURIComponent(matName)}`} target="_blank" rel="noreferrer">Otwórz tablicę TV</a></div>
      </header>

      {(message || error) && <div className={`judge-message ${error ? 'error' : ''}`}>{error || message}</div>}

      {session.status === 'completed' ? (
        <section className="kata-judge-completed">
          <span className="eyebrow">Kategoria zakończona</span>
          <h1>{session.category}</h1>
          <p>Wszyscy zawodnicy zostali ocenieni. Tablica TV po zakończeniu sekwencji wyniku przejdzie na podium.</p>
          <div className="kata-live-ranking">
            {liveRanking.map((result, index) => {
              const info = athleteInfo(result.athleteId)
              return <div key={result.athleteId}><b>{index + 1}</b><strong>{info.name}</strong><span>{info.club}</span><em>{scoreText(result.finalScore)}</em></div>
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="kata-current-athlete">
            <div className="kata-current-photo">
              {currentAthlete.photo ? <img src={currentAthlete.photo} alt={currentAthlete.name} /> : <div>{currentAthlete.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}
            </div>
            <div className="kata-current-copy">
              <span className="eyebrow">Zawodnik {Number(session.currentIndex || 0) + 1} z {session.results.length}</span>
              <h1>{currentAthlete.name}</h1>
              <p>{currentAthlete.club}</p>
              <label className="kata-name-field">
                <span>Wykonywane kata</span>
                <input
                  type="text"
                  value={current?.kataName || ''}
                  disabled={current?.status === 'done'}
                  onChange={(event) => updateKataName(event.target.value)}
                  placeholder="np. Bassai Dai"
                  maxLength={80}
                />
                <small>Nazwa pojawi się również na tablicy TV.</small>
              </label>
              <div className="kata-judge-main-actions">
                {!started && <button className="btn btn-primary kata-big-action" onClick={showAthlete}>POKAŻ ZAWODNIKA NA TV</button>}
                {started && !scoresOpen && <button className="kata-whistle-button" onClick={blowWhistle}><span>◉</span> GWIZDEK — POKAŻ OCENY</button>}
                {scoresOpen && <strong className="kata-score-entry-ready">WPROWADŹ OCENY SĘDZIÓW</strong>}
              </div>
            </div>
            <div className="kata-judge-count-box">
              <span>Liczba sędziów</span>
              <div>
                {[3, 5].map((count) => <button key={count} type="button" className={session.judgeCount === count ? 'active' : ''} disabled={completed.length > 0} onClick={() => run(() => db.setKataJudgeCount(session.id, count), `Ustawiono ${count} sędziów.`)}>{count}</button>)}
              </div>
              <small>{session.judgeCount === 5 ? 'Najwyższa i najniższa ocena są odrzucane.' : 'Końcowa ocena to suma 3 ocen.'}</small>
            </div>
          </section>

          <section className={`kata-score-entry ${scoresOpen ? 'active' : ''}`}>
            <div className="kata-score-entry-head"><div><span className="eyebrow">Oceny</span><h2>{session.judgeCount} sędziów</h2></div><span>Każda wpisana ocena pojawia się od razu na tablicy TV.</span></div>
            <div className="kata-judge-score-grid">
              {Array.from({ length: session.judgeCount }, (_, index) => (
                <label key={index}>Sędzia {index + 1}<input ref={(element) => { scoreInputRefs.current[index] = element }} className="numeric-input" inputMode="decimal" disabled={!scoresOpen} value={current?.scores?.[index] ?? ''} onChange={(event) => handleJudgeScoreChange(index, event.target.value)} onKeyDown={(event) => handleJudgeScoreKeyDown(index, event)} maxLength={3} placeholder="—" /></label>
              ))}
            </div>
            <div className="kata-score-save-row">
              <button ref={finalScoreButtonRef} className="btn btn-primary kata-final-score-button" type="button" disabled={!allScoresEntered} onClick={saveFinal}>ZAPISZ KOŃCOWĄ OCENĘ</button>
              <small>{session.judgeCount === 5 ? 'System odrzuci automatycznie jedną najwyższą i jedną najniższą notę, a następnie zsumuje pozostałe 3.' : 'System zsumuje wszystkie 3 noty.'}</small>
            </div>
          </section>
        </>
      )}

      <section className="judge-queue kata-queue">
        <div className="judge-queue-head"><h3>Lista uczestników</h3><span>Po końcowej ocenie TV pokaże tę listę, a następnie kolejnego zawodnika.</span></div>
        <div className="kata-queue-list">
          {orderedResults.map((result) => {
            const info = athleteInfo(result.athleteId)
            const isCurrent = result.athleteId === current?.athleteId && session.status !== 'completed'
            return <article className={`kata-queue-row ${result.status} ${isCurrent ? 'current' : ''}`} key={result.athleteId}><b>{result.order}</b><div className="kata-queue-person"><strong>{info.name}</strong>{result.kataName && <small>{result.kataName}</small>}</div><span>{info.club}</span><em>{result.status === 'done' ? scoreText(result.finalScore) : isCurrent ? 'TERAZ' : 'OCZEKUJE'}</em></article>
          })}
        </div>
      </section>
    </main>
  )
}
