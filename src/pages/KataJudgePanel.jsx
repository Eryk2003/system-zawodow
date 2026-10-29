import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { db } from '../lib/demoStore'
import { openTatamiTvWindow } from '../lib/tvWindow'
import { KATA_GROUPS } from '../lib/kataCatalog'
import { searchKataCatalog } from '../lib/kataAutocomplete'
/* ETAP 93 - wyszukiwanie kata z podpowiedziami */
/* ETAP 92 - lista kata i gwizdek otwierajacy oceny */

const scoreText = (value) => value == null ? '-' : String(Number(value)).replace('.', ',')

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
  /* ika95-score-drafts: wpisywanie cyfry bez niepotrzebnego zapisu do bazy */
  const [scoreDrafts,setScoreDrafts] = useState({})
  const scoreInputRefs = useRef([])
  const finalScoreButtonRef = useRef(null)
  const whistleFocusPending = useRef(false)
  const [kataQuery, setKataQuery] = useState('')
  const [kataMenuOpen, setKataMenuOpen] = useState(false)
  const [kataHighlightedIndex, setKataHighlightedIndex] = useState(-1)
  const kataInputRef = useRef(null)
  const kataMatches = useMemo(() => searchKataCatalog(kataQuery, KATA_GROUPS, 9), [kataQuery])

  const refresh = () => setRefreshKey((value) => value + 1)

  useEffect(() => {
    const handle = () => refresh()
    window.addEventListener('storage', handle)
    window.addEventListener('ika:data', handle)
    const interval = setInterval(() => { db.processCategoryAutoTransition(matName); handle() }, 1200)
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

  // Przy zmianie zawodnika podpowiadanie zaczyna od zapisanej nazwy kata.
  // W trakcie pisania nie odswiezamy calego panelu ani nie wysylamy kazdego znaku do Supabase.
  useEffect(() => {
    setScoreDrafts({})
    setKataQuery(current?.kataName || '')
    setKataMenuOpen(false)
    setKataHighlightedIndex(-1)
    whistleFocusPending.current = false
  }, [session?.id, current?.athleteId])

  // Po gwizdku formularz ocen otwiera sie i od razu ustawia kursor w polu sedziego nr 1.
  // W razie odswiezania TV lub danych z chmury nie przechwytujemy fokusu ponownie.
  useEffect(() => {
    if (!whistleFocusPending.current || session?.phase !== 'scores' || current?.status !== 'active') return undefined
    whistleFocusPending.current = false
    const frame = window.requestAnimationFrame(() => {
      const input = scoreInputRefs.current[0]
      input?.focus()
      input?.select?.()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [session?.id, session?.phase, current?.status, current?.athleteId, refreshKey])

  if (!session) {
    return (
      <main className="judge-screen judge-empty">
        <div className="judge-topbar"><div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>Panel sędziego kata • {matName}</span></div></div>
        <section className="judge-empty-card"><h1>Brak listy startowej kata</h1><p>Najpierw utwórz listę startową dla kategorii kata w centrum zawodów.</p><a className="btn btn-primary" href="/organizator/zawody">Wróć do zawodów</a></section>
      </main>
    )
  }

  const started = current?.status === 'active'
  const scoresOpen = session.phase === 'scores' && started
  const isCompleteJudgeScore = (value) => /^\d\.\d$/.test(String(value ?? ''))
  const allScoresEntered = scoresOpen && (current.scores || []).slice(0, session.judgeCount).every(isCompleteJudgeScore)
    && !Object.values(scoreDrafts).some(value=>value != null && !isCompleteJudgeScore(value))

  const handleJudgeScoreChange = (index, rawValue) => {
    const digits = String(rawValue ?? '').replace(/\D/g,'')
    const complete = digits.length >= 2
    const formatted = digits.length === 0 ? '' : digits.length === 1 ? digits[0]+'.' : digits[0]+'.'+digits[1]
    if (!complete) {
      setScoreDrafts(prev=>({ ...prev,[index]:formatted }))
      if (!digits && current?.scores?.[index] != null) run(()=>db.updateKataJudgeScore(session.id,index,''))
      return
    }
    setScoreDrafts(prev=>{ const next={...prev}; delete next[index]; return next })
    run(()=>db.updateKataJudgeScore(session.id,index,formatted))
    window.requestAnimationFrame(()=>{
      if (index+1 < session.judgeCount) {
        scoreInputRefs.current[index+1]?.focus()
        scoreInputRefs.current[index+1]?.select?.()
      } else finalScoreButtonRef.current?.focus()
    })
  }
  const handleJudgeScoreKeyDown = (index,event) => {
    const displayed = scoreDrafts[index] ?? current?.scores?.[index] ?? ''
    if (event.key==='Backspace' && String(displayed).endsWith('.')) {
      event.preventDefault()
      setScoreDrafts(prev=>({...prev,[index]:''}))
      if (current?.scores?.[index] != null) run(()=>db.updateKataJudgeScore(session.id,index,''))
    }
  }


  const updateKataName = (value) => run(() => db.updateKataName(session.id, value))

  const commitKataName = (value) => {
    const name = String(value || '').trim().slice(0, 80)
    setKataQuery(name)
    setKataMenuOpen(false)
    setKataHighlightedIndex(-1)
    if (name !== String(current?.kataName || '')) updateKataName(name)
  }

  const chooseSuggestedKata = (name) => {
    commitKataName(name)
    kataInputRef.current?.focus()
  }

  const onKataTyping = (event) => {
    const value = event.target.value
    setKataQuery(value)
    setKataMenuOpen(Boolean(value.trim()))
    setKataHighlightedIndex(-1)
  }

  const onKataKeyDown = (event) => {
    if (event.key === 'ArrowDown' && kataMatches.length) {
      event.preventDefault()
      setKataMenuOpen(true)
      setKataHighlightedIndex((index) => index >= kataMatches.length - 1 ? 0 : index + 1)
    } else if (event.key === 'ArrowUp' && kataMatches.length) {
      event.preventDefault()
      setKataMenuOpen(true)
      setKataHighlightedIndex((index) => index <= 0 ? kataMatches.length - 1 : index - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (kataMenuOpen && kataHighlightedIndex >= 0 && kataMatches[kataHighlightedIndex]) {
        chooseSuggestedKata(kataMatches[kataHighlightedIndex].name)
      } else {
        commitKataName(kataQuery)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setKataMenuOpen(false)
      setKataHighlightedIndex(-1)
    }
  }

  const showAthlete = () => run(() => db.startKataAthlete(session.id), 'Zawodnik został pokazany na tablicy TV.')
  const showList = () => run(() => db.showKataList(session.id), 'Na tablicy TV wyświetlana jest lista startowa.')
  const blowWhistle = () => {
    try {
      setError('')
      // Gwizdek dziala od razu, takze gdy zawodnik nie byl jeszcze pokazany na TV.
      if (current?.status !== 'active') db.startKataAthlete(session.id)
      db.kataWhistle(session.id)
      whistleFocusPending.current = true
      whistle()
      setMessage('Gwizdek! Możesz od razu wpisywać oceny — pierwsze pole jest gotowe.')
      refresh()
    } catch (err) {
      whistleFocusPending.current = false
      setError(err.message || 'Nie udało się uruchomić ocen kata.')
    }
  }
  const saveFinal = () => run(() => db.finalizeKataScore(session.id), 'Końcowa ocena zapisana. TV pokaże wynik, potem listę i następnego zawodnika.')

  return (
    <main className="judge-screen kata-judge-screen">
      <header className="judge-topbar kata-judge-topbar">
        <div><strong className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></strong><span>{tournament.name}</span></div>
        <div className="judge-title"><b>PANEL SĘDZIEGO KATA • {matName}</b><span>{competition?.name || 'Kata'} • {session.category}</span></div>
        <div className="judge-actions"><button className="btn btn-outline" type="button" onClick={showList}>Lista na TV</button><a className="btn btn-primary" href={`/tatami/${encodeURIComponent(matName)}`} target="_blank" rel="noreferrer">Otwórz tablicę TV</a></div>
      </header>

      {error && <div className="judge-message error">{error}</div>}

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
              <span className="eyebrow">{session.stageName || 'KATA'} • Zawodnik {Number(session.currentIndex || 0) + 1} z {session.results.length}</span>
              <h1>{currentAthlete.name}</h1>
              <p>{currentAthlete.club}</p>
              <div className="kata-name-field ika93-kata-field">
                <span>Wykonywane kata</span>
                <div className="ika93-kata-combobox">
                  <input
                    ref={kataInputRef}
                    type="text"
                    value={kataQuery}
                    role="combobox"
                    aria-label="Wykonywane kata — wpisz lub wybierz podpowiedź"
                    aria-autocomplete="list"
                    aria-expanded={kataMenuOpen && kataQuery.trim().length > 0}
                    aria-controls="ika93-kata-list"
                    aria-activedescendant={kataMenuOpen && kataHighlightedIndex >= 0 ? `ika93-kata-option-${kataHighlightedIndex}` : undefined}
                    autoComplete="off"
                    disabled={current?.status === 'done'}
                    onFocus={() => setKataMenuOpen(Boolean(kataQuery.trim()))}
                    onChange={onKataTyping}
                    onKeyDown={onKataKeyDown}
                    onBlur={() => commitKataName(kataQuery)}
                    placeholder="Zacznij pisać, np. Bassai..."
                    maxLength={80}
                  />
                  {kataMenuOpen && Boolean(kataQuery.trim()) && (
                    <div className="ika93-kata-dropdown" id="ika93-kata-list" role="listbox" aria-label="Podpowiedzi kata">
                      {kataMatches.length ? kataMatches.map((suggestion, index) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={kataHighlightedIndex === index}
                          id={`ika93-kata-option-${index}`}
                          className={kataHighlightedIndex === index ? 'is-selected' : ''}
                          key={suggestion.name}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseSuggestedKata(suggestion.name)}
                        >
                          <strong>{suggestion.name}</strong>
                          <small>{suggestion.styles.join(' · ')}</small>
                        </button>
                      )) : (
                        <div className="ika93-kata-no-results">Brak kata na liście — możesz wpisać własną nazwę i nacisnąć Enter.</div>
                      )}
                    </div>
                  )}
                </div>
                <small>Zacznij wpisywać nazwę, wybierz podpowiedź myszką albo strzałkami i Enter. Nazwę spoza listy zatwierdź Enter.</small>
              </div>
              <div className="kata-judge-main-actions">
                {!started && <button className="btn btn-primary kata-big-action" onClick={showAthlete}>POKAŻ ZAWODNIKA NA TV</button>}
                {!scoresOpen && <button className="kata-whistle-button" type="button" onClick={blowWhistle}><span>◉</span> GWIZDEK — WPISZ OCENY</button>}
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

            {Number(session.totalRounds || 1) > 1 && (
              <div className="kata-round-box">
                <span>System rund</span>
                <strong>{session.stageName || 'KATA'}</strong>
                <small>{Number(session.roundNumber || 1) === 1 ? 'Po ocenieniu 10 zawodników system wybierze 5 najlepszych do finału.' : 'To jest runda finałowa dla 5 najlepszych zawodników.'}</small>
              </div>
            )}
          </section>

          <section className={`kata-score-entry ${scoresOpen ? 'active' : ''}`}>
            <div className="kata-score-entry-head"><div><span className="eyebrow">Oceny</span><h2>{session.judgeCount} sędziów</h2></div><span>Każda wpisana ocena pojawia się od razu na tablicy TV.</span></div>
            <div className="kata-judge-score-grid">
              {Array.from({ length: session.judgeCount }, (_, index) => (
                <label key={index}>Sędzia {index + 1}<input ref={(element) => { scoreInputRefs.current[index] = element }} className="numeric-input" inputMode="decimal" disabled={!scoresOpen} value={scoreDrafts[index] ?? current?.scores?.[index] ?? ''} onChange={(event) => handleJudgeScoreChange(index, event.target.value)} onKeyDown={(event) => handleJudgeScoreKeyDown(index, event)} maxLength={3} placeholder="-" /></label>
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
        <div className="judge-queue-head"><h3>{Number(session.roundNumber || 1) === 2 ? 'Lista finalistów' : 'Lista uczestników'}</h3><span>Po końcowej ocenie TV pokaże tę listę, a następnie kolejnego zawodnika.</span></div>
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
