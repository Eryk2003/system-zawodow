import React, { useEffect, useState } from 'react'
import { db } from '../lib/demoStore'

// ETAP 102: sterowanie przerwa dotyczy wylacznie tatami przypisanego do sedziego.
export default function TatamiBreakControl({ mat }) {
  const readStatus = () => {
    const state = db.getMatState(mat)
    return {
      paused: Boolean(state?.breakActive || state?.mode === 'break'),
      clockRunning: db.getMatches().some((match) => match.mat === mat && match.status === 'active' && match.timerRunning),
      hasPoster: Boolean(db.getTournament()?.poster),
    }
  }
  const [status, setStatus] = useState(readStatus)
  const [error, setError] = useState('')

  useEffect(() => {
    const refresh = () => setStatus(readStatus())
    refresh()
    window.addEventListener('ika:data', refresh)
    window.addEventListener('storage', refresh)
    const interval = window.setInterval(refresh, 2000)
    return () => {
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(interval)
    }
  }, [mat])

  const toggle = () => {
    try {
      setError('')
      db.setMatBreakMode(mat, !status.paused)
      setStatus(readStatus())
    } catch (e) {
      setError(e?.message || 'Nie udało się zmienić trybu przerwy.')
    }
  }

  const cannotStart = !status.paused && status.clockRunning
  const description = status.paused
    ? `${mat}: plakat zawodów na TV. Kliknij, aby wznowić.`
    : cannotStart
      ? 'Przed przerwą zatrzymaj zegar aktywnej walki.'
      : status.hasPoster
        ? `${mat}: włącz przerwę i pokaż plakat na TV.`
        : 'Nie dodano plakatu. TV pokaże angielski ekran BREAK.'

  return (
    <div className={`ika102-break-control ${status.paused ? 'is-active' : ''}`}>
      <button
        className={`btn ika102-break-button ${status.paused ? 'ika102-resume-button' : ''}`}
        type="button"
        onClick={toggle}
        disabled={cannotStart}
        aria-pressed={status.paused}
        title={description}
      >
        {status.paused ? 'WZNÓW TATAMI' : 'PRZERWA NA TATAMI'}
      </button>
      {status.paused && <span className="ika102-break-status" role="status">PRZERWA - PLAKAT NA TV</span>}
      {error && <span className="ika102-break-error" role="alert">{error}</span>}
    </div>
  )
}
