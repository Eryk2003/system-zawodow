// IKA Poland - przypisanie stanowiska w tej przegladarce.
// To blokada interfejsu, nie zamiennik kontroli uprawnien Supabase/RLS.
const KEY = 'ika_station_binding_v1'
const EVENT = 'ika:station-binding-changed'

export function readStationBinding() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    if (!parsed || typeof parsed.mat !== 'string' || !/^Tatami \d+$/.test(parsed.mat)) return null
    return parsed
  } catch { return null }
}

export function bindStation(mat, code) {
  if (!/^Tatami \d+$/.test(String(mat || ''))) throw new Error('Wybierz tatami.')
  const pin = String(code || '').trim()
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Wpisz kod organizatora: od 4 do 8 cyfr.')
  // Wygodne zabezpieczenie przed przypadkowa zmiana stanowiska.
  // Nie sluzy jako mechanizm bezpieczenstwa uprawnien na serwerze.
  window.localStorage.setItem(KEY, JSON.stringify({ mat, pin }))
  window.dispatchEvent(new Event(EVENT))
}

export function releaseStation(code) {
  const binding = readStationBinding()
  if (!binding) return true
  if (String(code || '').trim() !== binding.pin) return false
  window.localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(EVENT))
  return true
}

export const STATION_EVENT = EVENT
