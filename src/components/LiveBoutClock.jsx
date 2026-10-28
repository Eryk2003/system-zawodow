// ETAP 91 - odseparowany zegar czasu walki
import React, { useEffect, useState } from 'react'

const remainingSeconds = (match, fallbackSeconds) => {
  if (!match) return Math.max(0, Math.floor(Number(fallbackSeconds) || 0))
  const base = Number.isFinite(match.timerRemaining)
    ? match.timerRemaining
    : Number(match.boutSeconds || fallbackSeconds || 0)
  if (!match.timerRunning || !match.timerStartedAt) return Math.max(0, Math.floor(base))
  const elapsed = Math.floor((Date.now() - Number(match.timerStartedAt)) / 1000)
  return Math.max(0, Math.floor(base) - elapsed)
}

function LiveBoutClock({ match, fallbackSeconds = 0, className = '' }) {
  const [remaining, setRemaining] = useState(() => remainingSeconds(match, fallbackSeconds))
  const id = match?.id
  const running = Boolean(match?.timerRunning)
  const startedAt = match?.timerStartedAt
  const base = match?.timerRemaining
  const boutSeconds = match?.boutSeconds

  useEffect(() => {
    const update = () => {
      const next = remainingSeconds(match, fallbackSeconds)
      setRemaining((previous) => previous === next ? previous : next)
    }
    update()
    if (!running) return undefined
    // 200 ms dotyczy tylko tekstu zegara, nie calego ekranu i drabinki.
    const interval = window.setInterval(update, 200)
    return () => window.clearInterval(interval)
  }, [id, running, startedAt, base, boutSeconds, fallbackSeconds])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  return <strong className={className} aria-live="off">{mm}:{ss}</strong>
}

export default React.memo(LiveBoutClock)
