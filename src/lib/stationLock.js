// IKA Poland: przypisanie komputera do tatami BEZ kodu PIN.
// Jest to wyłącznie ograniczenie interfejsu przeglądarki, a nie autoryzacja Supabase.
const KEY = 'ika_station_binding_v1'
const EVENT = 'ika:station-binding-changed'

export function readStationBinding() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    if (!parsed || typeof parsed.mat !== 'string' || !/^Tatami \d+$/.test(parsed.mat)) return null
    return { mat: parsed.mat }
  } catch { return null }
}

export function bindStation(mat) {
  if (!/^Tatami \d+$/.test(String(mat || ''))) throw new Error('Wybierz tatami.')
  window.localStorage.setItem(KEY, JSON.stringify({ mat }))
  window.dispatchEvent(new Event(EVENT))
}

export function releaseStation() {
  window.localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(EVENT))
  return true
}

export const STATION_EVENT = EVENT
