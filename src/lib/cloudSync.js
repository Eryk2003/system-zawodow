import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const cloudSyncConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('TWOJ-PROJEKT') &&
  !SUPABASE_ANON_KEY.includes('TWOJ_ANON_KEY'),
)

export const supabase = cloudSyncConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null

// Dane zawodów, klubów i zgłoszeń są synchronizowane przez wspólny stan.
// Konta klubów korzystają z Supabase Auth (e-mail + hasło), dzięki czemu ten sam
// klub może zalogować się na komputerze, laptopie i telefonie. Konto organizatora
// demonstracyjnego pozostaje lokalne jako konto administracyjne projektu.
export const CLOUD_KEYS = new Set([
  'ika_clubs_v1',
  'ika_athletes_v1',
  'ika_competitions_v1',
  'ika_entries_v1',
  'ika_tournament_v1',
  'ika_live_v1',
  'ika_training_groups_v2',
  'ika_news_v2',
  'ika_matches_v2',
  'ika_mat_states_v2',
  'ika_schedule_v3',
  'ika_tournament_categories_v1',
  'ika_kata_sessions_v1',
])

const pending = new Map()
let channel = null
let suppressCloudWrite = false
let initialized = false

const dispatchRefresh = (key) => {
  window.dispatchEvent(new Event('ika:data'))
  if (key === 'ika_live_v1' || key === 'ika_mat_states_v2' || key === 'ika_matches_v2' || key === 'ika_kata_sessions_v1') {
    window.dispatchEvent(new Event('ika:live'))
  }
  window.dispatchEvent(new CustomEvent('ika:cloud', { detail: { key, at: Date.now() } }))
}

const applyRemoteValue = (key, value) => {
  if (!CLOUD_KEYS.has(key)) return
  suppressCloudWrite = true
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } finally {
    suppressCloudWrite = false
  }
  dispatchRefresh(key)
}

async function upsertNow(key, value) {
  if (!supabase || !CLOUD_KEYS.has(key)) return
  try {
    const { error } = await supabase
      .from('app_shared_state')
      .upsert({ state_key: key, state_value: value, updated_at: new Date().toISOString() }, { onConflict: 'state_key' })
    if (error) console.warn('[IKA cloud] zapis nieudany:', key, error.message)
  } catch (error) {
    console.warn('[IKA cloud] zapis nieudany:', key, error?.message || error)
  }
}

export function queueCloudWrite(key, value) {
  if (!cloudSyncConfigured || suppressCloudWrite || !CLOUD_KEYS.has(key)) return
  if (pending.has(key)) clearTimeout(pending.get(key))
  const delay = key === 'ika_mat_states_v2' ? 350 : 120
  pending.set(key, setTimeout(() => {
    pending.delete(key)
    upsertNow(key, value)
  }, delay))
}

async function hydrateFromCloud() {
  const { data, error } = await supabase
    .from('app_shared_state')
    .select('state_key,state_value,updated_at')
    .in('state_key', [...CLOUD_KEYS])

  if (error) throw error

  const cloudByKey = new Map((data || []).map((row) => [row.state_key, row]))
  for (const key of CLOUD_KEYS) {
    const remote = cloudByKey.get(key)
    if (remote) {
      applyRemoteValue(key, remote.state_value)
      continue
    }
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      await upsertNow(key, JSON.parse(raw))
    } catch {
      // Pomiń pojedynczą uszkodzoną wartość lokalną.
    }
  }
}

function subscribeRealtime() {
  if (!supabase || channel) return
  channel = supabase
    .channel('ika-system-zawodow-shared-state')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_shared_state' },
      (payload) => {
        const row = payload.new || payload.old
        if (!row?.state_key || !CLOUD_KEYS.has(row.state_key)) return
        if (payload.eventType === 'DELETE') return
        applyRemoteValue(row.state_key, row.state_value)
      },
    )
    .subscribe()
}

export async function initializeCloudSync() {
  if (initialized || !cloudSyncConfigured || !supabase) return { enabled: cloudSyncConfigured }
  initialized = true
  try {
    await hydrateFromCloud()
    subscribeRealtime()
    window.dispatchEvent(new CustomEvent('ika:cloud-ready', { detail: { enabled: true } }))
    return { enabled: true }
  } catch (error) {
    console.warn('[IKA cloud] synchronizacja nie została uruchomiona:', error?.message || error)
    window.dispatchEvent(new CustomEvent('ika:cloud-ready', { detail: { enabled: false, error: error?.message } }))
    return { enabled: false, error }
  }
}
