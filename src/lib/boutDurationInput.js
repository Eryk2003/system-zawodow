// ETAP 84: M:SS input for event bout duration; pure functions for safe conversion.
export function parseBoutDuration(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const match = /^(\d+)(?::(\d{0,2}))?$/.exec(text)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2] || 0)
  if (!Number.isSafeInteger(minutes) || seconds > 59) return null
  const total = minutes * 60 + seconds
  return Number.isSafeInteger(total) ? total : null
}

export function boutDurationFromSeconds(value) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Typing 1 immediately yields "1:"; typing 30 afterwards yields "1:30".
// When deleting the colon with Backspace, do not reinsert it automatically.
export function formatBoutDurationTyping(value, isDeleting = false) {
  const raw = String(value ?? '').trim().replace(/[.,]/g, ':').replace(/[^0-9:]/g, '')
  if (!raw) return ''
  const firstColon = raw.indexOf(':')
  if (firstColon !== -1) {
    const minutes = raw.slice(0, firstColon).slice(0, 4)
    const seconds = raw.slice(firstColon + 1).replace(/:/g, '').slice(0, 2)
    return minutes ? `${minutes}:${seconds}` : ''
  }
  const minutes = raw.slice(0, 4)
  return minutes ? minutes + (isDeleting ? '' : ':') : ''
}
