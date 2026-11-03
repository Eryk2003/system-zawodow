import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/demoStore'
import { bindStation } from '../lib/stationLock.js'

const TABS = [
  { id: 'judges', label: 'Sędziowie' },
  { id: 'schedule', label: 'Harmonogram' },
  { id: 'kata', label: 'Kata' },
  { id: 'kumite', label: 'Kumite' },
  { id: 'tv', label: 'TV i przerwy' },
  { id: 'settings', label: 'Ustawienia' },
]

function categoryForMat(category, mat, competitions, schedule, matches, kataSessions) {
  const competition = competitions.find((item) => item.id === category.competitionId)
  const kind = competition?.group === 'Kata' ? 'kata' : competition?.group === 'Kumite' ? 'kumite' : null
  if (!kind) return null

  const related = (item) => (item.categoryId && item.categoryId === category.id)
    || (item.competitionId === category.competitionId && item.category === category.name)
  const slot = schedule.find(related)
  const bracket = matches.find((item) => related(item) && item.mat === mat)
  const session = kataSessions.find((item) => related(item) && item.mat === mat)
  const plannedMat = slot?.mat || category.preferredMat || ''
  if (plannedMat !== mat && !bracket && !session) return null

  const prepared = kind === 'kata' ? Boolean(session) : Boolean(bracket)
  const label = `${competition?.name || 'Konkurencja'} - ${category.name}`
  return {
    ...category,
    label,
    kind,
    prepared,
    session,
    competition,
    mat,
  }
}

export default function CenterQuickNav({
  tournament, competitions, categories, schedule, matches, kataSessions,
  matStates, matNames, activeTab, onTabChange, onPrepareCategory, onBulkDrawMat,
}) {
  const navigate = useNavigate()
  const [selectedMat, setSelectedMat] = useState('Tatami 1')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [error, setError] = useState('')
  const [stationCode, setStationCode] = useState('')
  const [bulkJudgeCount, setBulkJudgeCount] = useState(3)

  const mat = matNames.includes(selectedMat) ? selectedMat : (matNames[0] || 'Tatami 1')
  const options = useMemo(() => categories
    .map((category) => categoryForMat(category, mat, competitions, schedule, matches, kataSessions))
    .filter(Boolean)
    .sort((a, b) => Number(b.prepared) - Number(a.prepared) || a.label.localeCompare(b.label, 'pl')),
  [categories, mat, competitions, schedule, matches, kataSessions])
  const chosen = options.find((item) => item.id === selectedCategoryId) || options[0] || null
  const preparedCount = options.filter((item) => item.prepared).length

  const switchMat = (nextMat) => {
    setSelectedMat(nextMat)
    setSelectedCategoryId('')
    setError('')
  }

  const switchTab = (tabId) => {
    onTabChange(tabId)
    setError('')
  }

  const openJudge = () => {
    if (!chosen?.prepared) {
      setError('Przed wejściem do panelu sędziego przygotuj drabinkę albo listę startową tej kategorii.')
      return
    }

    const busyMatch = matches.find((item) => item.mat === mat && item.status === 'active'
      && (item.competitionId !== chosen.competitionId || item.category !== chosen.name))
    if (busyMatch) {
      setError(`Na ${mat} trwa już inna walka. Zakończ ją przed zmianą konkurencji.`)
      return
    }

    const anotherKataInScoring = kataSessions.find((item) => item.mat === mat
      && item.id !== chosen.session?.id && item.status === 'active' && item.phase === 'scores')
    if (anotherKataInScoring) {
      setError(`Na ${mat} trwa ocenianie innego kata. Najpierw zakończ wpisywanie ocen.`)
      return
    }

    const previous = db.getMatState(mat) || {}
    if (previous.breakActive || previous.mode === 'break') {
      setError(`Na ${mat} jest włączona przerwa. Wznów TV w zakładce „TV i przerwy”.`)
      return
    }

    try {
      const alreadySelected = previous.competitionId === chosen.competitionId
        && previous.category === chosen.name
        && (chosen.kind !== 'kata' || previous.kataSessionId === chosen.session?.id)

      if (!alreadySelected) {
        const activeFight = matches.find((item) => item.mat === mat
          && item.status === 'active' && item.competitionId === chosen.competitionId
          && item.category === chosen.name)
        const kataMode = chosen.session?.phase === 'scores' ? 'kata-scores'
          : chosen.session?.phase === 'athlete' ? 'kata-athlete'
            : chosen.session?.status === 'completed' ? 'podium' : 'kata-list'

        db.setMatState(mat, {
          ...previous,
          competitionId: chosen.competitionId,
          category: chosen.name,
          categoryId: chosen.id,
          mode: chosen.kind === 'kata' ? kataMode : (activeFight ? 'scoreboard' : 'bracket'),
          kataSessionId: chosen.kind === 'kata' ? chosen.session?.id : null,
          currentMatchId: chosen.kind === 'kumite' ? (activeFight?.id || null) : null,
          lastCompletedMatchId: null,
          autoTransition: null,
          transitionAuto: false,
        })
      }

      const base = `/organizator/panel-sedziego/${encodeURIComponent(mat)}`
      const query = chosen.kind === 'kata'
        ? `?sessionId=${encodeURIComponent(chosen.session.id)}`
        : `?competitionId=${encodeURIComponent(chosen.competitionId)}&category=${encodeURIComponent(chosen.name)}`
      navigate(base + query)
    } catch (err) {
      setError(err?.message || 'Nie można otworzyć panelu sędziego.')
    }
  }

  const prepare = () => {
    if (!chosen) return
    onPrepareCategory(chosen.kind, chosen.id)
    setError('')
  }

  return (
    <>
      {activeTab === 'judges' && <section className="ika94-quickdesk" aria-label="Szybkie przejście do panelu sędziego">
        <div className="ika94-quickdesk-header">
          <div>
            <span className="ika94-eyebrow"><span className="ika-brand-inline"><span className="ika-brand-ika">IKA</span> <span className="ika-brand-poland">POLAND</span></span> · CENTRUM ZAWODÓW</span>
            <h2>Wybierz tatami i konkurencję</h2>
            <p>Bez przewijania: wybierz stanowisko i otwórz właściwy panel sędziego.</p>
          </div>
          <div className="ika94-quickdesk-stats">
            <div><strong>{matNames.length}</strong><small>Tatami</small></div>
            <div><strong>{categories.length}</strong><small>Kategorii</small></div>
            <div><strong>{kataSessions.length + new Set(matches.map((item) => `${item.mat}|${item.competitionId}|${item.category}`)).size}</strong><small>Przygotowanych</small></div>
          </div>
        </div>
        <div className="ika-station-tools" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12, padding:'14px 0', borderTop:'1px solid #434b5d', marginTop:10 }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
            <strong>Losowanie zbiorcze:</strong>
            <select value={bulkJudgeCount} onChange={e => setBulkJudgeCount(Number(e.target.value))} aria-label="Liczba sędziów kata przy losowaniu zbiorczym">
              <option value={3}>Kata: 3 sędziów</option><option value={5}>Kata: 5 sędziów</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={() => onBulkDrawMat?.(mat, bulkJudgeCount)}>
              Losuj wszystkie kategorie - {mat}
            </button>
          </div>
          <details style={{ flex:'1 1 300px' }}>
            <summary style={{ cursor:'pointer', fontWeight:700 }}>Przypisz ten laptop do {mat}</summary>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10, alignItems:'center' }}>
              <input type="password" inputMode="numeric" maxLength={8} value={stationCode}
                onChange={e => setStationCode(e.target.value)} placeholder="Kod organizatora (4-8 cyfr)" aria-label="Kod do odblokowania laptopa" />
              <button type="button" className="btn btn-outline" onClick={() => {
                try { bindStation(mat, stationCode); navigate(`/organizator/panel-sedziego/${encodeURIComponent(mat)}`) }
                catch (e) { setError(e?.message || 'Nie można przypisać laptopa.') }
              }}>Włącz tryb stanowiska</button>
            </div>
            <small style={{ display:'block', marginTop:6 }}>Tryb blokuje pozostałe widoki na tym laptopie. Kod służy do odblokowania przez organizatora.</small>
          </details>
        </div>
        <div className="ika-fast-entry" aria-label="Szybki wybór panelu sędziego">
          <div className="ika-fast-step">
            <strong>1. Wybierz tatami</strong>
            <div className="ika-fast-mats">
              {matNames.map((item) => (
                <button key={item} type="button" className={`ika-fast-tile ${mat === item ? 'is-selected' : ''}`}
                  aria-pressed={mat === item} onClick={() => switchMat(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="ika-fast-step">
            <strong>2. Wybierz przygotowaną konkurencję</strong>
            <div className="ika-fast-categories">
              {options.map((item) => (
                <button key={item.id} type="button"
                  className={`ika-fast-tile ika-fast-category ${chosen?.id === item.id ? 'is-selected' : ''}`}
                  aria-pressed={chosen?.id === item.id}
                  onClick={() => { setSelectedCategoryId(item.id); setError('') }}>
                  <span className="ika-fast-type">{item.kind === 'kata' ? 'KATA' : 'KUMITE'}</span>
                  <span>{item.label}</span>
                  <small>{item.prepared ? 'Gotowa do sędziowania' : 'Wymaga przygotowania'}</small>
                </button>
              ))}
              {!options.length && <p>Brak kategorii przypisanych do {mat}. Przypisz je w Harmonogramie.</p>}
            </div>
          </div>
          <button type="button" className="ika94-open-judge ika-fast-open" disabled={!chosen?.prepared} onClick={openJudge}>
            3. Otwórz panel sędziego - {mat}
          </button>
        </div>
        {chosen ? (
          <div className={`ika94-quickdesk-status ${chosen.prepared ? 'is-ready' : 'is-unprepared'}`}>
            <span>{chosen.prepared ? `Gotowe: ${chosen.kind === 'kata' ? 'lista startowa kata' : 'drabinka kumite'}` : 'Kategoria wymaga przygotowania'}</span>
            {!chosen.prepared && <button type="button" onClick={prepare}>Przejdź do {chosen.kind === 'kata' ? 'losowania kata' : 'losowania drabinki'}</button>}
            <small>{preparedCount} przygotowanych z {options.length} kategorii przypisanych do {mat}</small>
          </div>
        ) : (
          <div className="ika94-quickdesk-status is-unprepared">Brak kategorii dla wybranego tatami. Przypisz kategorię w Harmonogramie.</div>
        )}
        {error && <div className="ika94-quick-error" role="alert">{error}</div>}
      </section>}

      <nav className="ika94-center-tabs" aria-label="Zakładki Centrum Zawodów">
        {TABS.map((tab) => (
          <button key={tab.id} type="button"
            className={`ika94-center-tab ${activeTab === tab.id ? 'active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => switchTab(tab.id)}>{tab.label}</button>
        ))}
      </nav>

      {activeTab === 'judges' && (
        <details className="ika94-mat-overview ika-center-details">
          <summary>Podgląd wszystkich tatami</summary>
          <div className="ika94-mat-overview-head"><h3>Stan tatami</h3><span>Wybierz stanowisko, aby otworzyć odpowiednią konkurencję</span></div>
          <div className="ika94-mat-grid">
            {matNames.map((item) => {
              const state = matStates[item] || {}
              const paused = Boolean(state.breakActive || state.mode === 'break')
              const ongoing = matches.some((match) => match.mat === item && match.status === 'active')
              const prepared = categories.map((category) => categoryForMat(category, item, competitions, schedule, matches, kataSessions)).filter(Boolean)
              return (
                <button key={item} type="button" className={`ika94-mat-card ${item === mat ? 'selected' : ''}`}
                  onClick={() => switchMat(item)}>
                  <strong>{item}</strong>
                  <span>{paused ? 'Przerwa' : ongoing ? 'Walka w toku' : 'Gotowe do obsługi'}</span>
                  <small>{prepared.filter((cat) => cat.prepared).length} przygotowanych konkurencji</small>
                </button>
              )
            })}
          </div>
        </details>
      )}
    </>
  )
}
