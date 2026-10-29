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

// ETAP 66: dane publiczne zawodów i dane prywatne klubów są rozdzielone.
// app_shared_state zawiera tylko stan publiczny/organizacyjny zawodów.
// club_private_state przechowuje pełne dane konkretnego klubu i jest chronione RLS.
// public_participant_state jest sanitowanym, publicznym podglądem bez dat urodzenia,
// e-maili rodziców i pozostałych danych prywatnych.
export const PUBLIC_CLOUD_KEYS = new Set([
  'ika_competitions_v1',
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

export const PRIVATE_CLOUD_KEYS = new Set([
  'ika_clubs_v1',
  'ika_athletes_v1',
  'ika_entries_v1',
])

export const CLOUD_KEYS = new Set([...PUBLIC_CLOUD_KEYS, ...PRIVATE_CLOUD_KEYS])

const pending = new Map()
/* ETAP 73: automatyczna synchronizacja co 10 sekund */
/* ETAP 95: szybkie oceny kata i fullscreen */
const inFlightPublicWrites = new Set()
const ika95Queue = new Map()
const ika95LiveKeys = new Set(['ika_kata_sessions_v1','ika_matches_v2','ika_mat_states_v2'])
/* ETAP 106 - ordered live updates and podium TOP3 */
const ika106LastVersion = new Map()
const ika106LocalVersion = new Map()
const ika106LocalChange = (key) => {
  if (!ika95LiveKeys.has(key) || currentIdentity.role !== 'organizer') return
  const next = Math.max(Date.now(), (ika106LastVersion.get(key) || 0) + 1)
  ika106LastVersion.set(key, next)
  ika106LocalVersion.set(key, next)
}
const ika106ParseTime = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}
let ika95LivePollInterval = null
let ika95LivePolling = false
let privateWritesInProgress = 0
let pollingInterval = null
let pollingNow = false
let publicChannel = null
let privateChannel = null
let participantChannel = null
let authSubscription = null
let suppressCloudWrite = false
let initialized = false
let currentIdentity = { userId: null, role: 'public' }
let secureTablesAvailable = null

const isMissingTableError = (error) => {
  const text = String(error?.message || error || '').toLowerCase()
  return error?.code === '42P01' || text.includes('does not exist') || text.includes('could not find the table')
}

const dispatchRefresh = (key = '') => {
  window.dispatchEvent(new Event('ika:data'))
  if (key === 'ika_live_v1' || key === 'ika_mat_states_v2' || key === 'ika_matches_v2' || key === 'ika_kata_sessions_v1') {
    window.dispatchEvent(new Event('ika:live'))
  }
  window.dispatchEvent(new CustomEvent('ika:cloud', { detail: { key, at: Date.now() } }))
}

const applyRemoteValue = (key, value, updatedAt = null) => {
  if (!CLOUD_KEYS.has(key)) return
  // A delayed broadcast or a slower poll may never replace a newer score.
  if (currentIdentity.role === 'organizer' && (pending.has(key) || inFlightPublicWrites.has(key) || ika95Queue.has(key))) return
  const serialized = JSON.stringify(value)
  if (ika95LiveKeys.has(key)) {
    const incoming = ika106ParseTime(updatedAt)
    const current = ika106LastVersion.get(key) || 0
    if (!incoming && current) return // Ignore legacy, unversioned broadcast after newer data.
    if (incoming && incoming < current) return
    if (incoming && incoming === current && localStorage.getItem(key) !== serialized) return
    if (incoming) ika106LastVersion.set(key, Math.max(current, incoming))
  }
  if (localStorage.getItem(key) === serialized) return
  suppressCloudWrite = true
  try { localStorage.setItem(key, serialized) } finally { suppressCloudWrite = false }
  dispatchRefresh(key)
}

const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function resolveIdentity() {
  if (!supabase) return { userId: null, role: 'public' }
  try {
    const { data } = await supabase.auth.getSession()
    const authUser = data?.session?.user
    if (!authUser) return { userId: null, role: 'public' }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()

    if (error) console.warn('[IKA cloud] Nie udało się odczytać roli użytkownika:', error.message)
    return { userId: authUser.id, role: profile?.role === 'organizer' ? 'organizer' : 'club' }
  } catch (error) {
    console.warn('[IKA cloud] Nie udało się ustalić sesji:', error?.message || error)
    return { userId: null, role: 'public' }
  }
}

async function upsertPublicNow(key, value) {
  if (!supabase || !PUBLIC_CLOUD_KEYS.has(key) || currentIdentity.role !== 'organizer') return
  // Only the newest local snapshot is queued. Earlier writes are flushed in order.
  const revision = ika95LiveKeys.has(key)
    ? Math.max(Date.now(), ika106LocalVersion.get(key) || 0, (ika106LastVersion.get(key) || 0) + 1)
    : Date.now()
  if (ika95LiveKeys.has(key)) {
    ika106LastVersion.set(key, revision)
    ika106LocalVersion.set(key, revision)
  }
  ika95Queue.set(key, { value, revision })
  if (inFlightPublicWrites.has(key)) return
  inFlightPublicWrites.add(key)
  try {
    while (ika95Queue.has(key)) {
      const latest = ika95Queue.get(key)
      ika95Queue.delete(key)
      const updatedAt = new Date(latest.revision).toISOString()
      try {
        const { error } = await supabase.from('app_shared_state')
          .upsert({ state_key:key, state_value:latest.value, updated_at:updatedAt }, { onConflict:'state_key' })
        if (error) console.warn('[IKA cloud] zapis publiczny nieudany:', key, error.message)
        else if (ika95LiveKeys.has(key) && publicChannel) {
          Promise.resolve(publicChannel.send({type:'broadcast',event:'ika95-live',payload:{key,value:latest.value,updatedAt}})).catch(()=>{})
        }
      } catch (error) { console.warn('[IKA cloud] zapis publiczny nieudany:',key,error?.message||error) }
    }
  } finally { inFlightPublicWrites.delete(key) }
}

async function fetchPrivateRows() {
  if (!supabase) return { rows: [], error: null }
  const { data, error } = await supabase
    .from('club_private_state')
    .select('owner_id,club,athletes,entries,updated_at')
  if (error) return { rows: [], error }
  return { rows: data || [], error: null }
}

async function fetchPublicParticipantRows() {
  if (!supabase) return { rows: [], error: null }
  const { data, error } = await supabase
    .from('public_participant_state')
    .select('owner_id,club,athletes,entries,updated_at')
  if (error) return { rows: [], error }
  return { rows: data || [], error: null }
}

const aggregateRows = (rows = []) => {
  const clubs = []
  const athletes = []
  const entries = []
  rows.forEach((row) => {
    if (row?.club && typeof row.club === 'object') clubs.push(row.club)
    if (Array.isArray(row?.athletes)) athletes.push(...row.athletes)
    if (Array.isArray(row?.entries)) entries.push(...row.entries)
  })
  return { clubs, athletes, entries }
}

const mergeOwnPrivateIntoPublic = (publicData, privateRows, userId) => {
  const own = privateRows.find((row) => row.owner_id === userId)
  if (!own) return publicData
  const ownClub = own.club && typeof own.club === 'object' ? own.club : null
  const ownClubId = ownClub?.id
  const ownAthletes = Array.isArray(own.athletes) ? own.athletes : []
  const ownAthleteIds = new Set(ownAthletes.map((item) => item.id))

  const clubs = [...publicData.clubs.filter((club) => !ownClubId || club.id !== ownClubId)]
  if (ownClub) clubs.push(ownClub)

  const athletes = [
    ...publicData.athletes.filter((athlete) => !ownClubId || athlete.clubId !== ownClubId),
    ...ownAthletes,
  ]
  const entries = [
    ...publicData.entries.filter((entry) => !ownAthleteIds.has(entry.athleteId)),
    ...(Array.isArray(own.entries) ? own.entries : []),
  ]
  return { clubs, athletes, entries }
}

const applySensitiveAggregate = ({ clubs, athletes, entries }) => {
  suppressCloudWrite = true
  try {
    localStorage.setItem('ika_clubs_v1', JSON.stringify(clubs || []))
    localStorage.setItem('ika_athletes_v1', JSON.stringify(athletes || []))
    localStorage.setItem('ika_entries_v1', JSON.stringify(entries || []))
  } finally {
    suppressCloudWrite = false
  }
  dispatchRefresh('ika_entries_v1')
}

async function hydrateLegacySensitiveState() {
  if (!supabase) return false
  const { data, error } = await supabase
    .from('app_shared_state')
    .select('state_key,state_value')
    .in('state_key', [...PRIVATE_CLOUD_KEYS])
  if (error) return false
  const map = new Map((data || []).map((row) => [row.state_key, row.state_value]))
  if (!map.size) return false
  applySensitiveAggregate({
    clubs: map.get('ika_clubs_v1') || [],
    athletes: map.get('ika_athletes_v1') || [],
    entries: map.get('ika_entries_v1') || [],
  })
  return true
}

async function hydrateSensitiveState() {
  if (!supabase) return

  const publicResult = await fetchPublicParticipantRows()
  if (publicResult.error) {
    if (isMissingTableError(publicResult.error)) {
      secureTablesAvailable = false
      await hydrateLegacySensitiveState()
      return
    }
    throw publicResult.error
  }

  secureTablesAvailable = true
  const publicData = aggregateRows(publicResult.rows)

  if (currentIdentity.role === 'public') {
    applySensitiveAggregate(publicData)
    return
  }

  const privateResult = await fetchPrivateRows()
  if (privateResult.error) throw privateResult.error

  if (currentIdentity.role === 'organizer') {
    applySensitiveAggregate(aggregateRows(privateResult.rows))
    return
  }

  applySensitiveAggregate(mergeOwnPrivateIntoPublic(publicData, privateResult.rows, currentIdentity.userId))
}

async function syncClubPrivateState() {
  if (!supabase || currentIdentity.role !== 'club' || !currentIdentity.userId) return
  if (secureTablesAvailable === false) return syncLegacyPrivateState()

  const clubs = readLocal('ika_clubs_v1', [])
  const ownClub = clubs.find((club) => club.ownerId === currentIdentity.userId) || null
  if (!ownClub) return
  const athletes = readLocal('ika_athletes_v1', []).filter((athlete) => athlete.clubId === ownClub.id)
  const athleteIds = new Set(athletes.map((athlete) => athlete.id))
  const entries = readLocal('ika_entries_v1', []).filter((entry) => athleteIds.has(entry.athleteId))

  const { error } = await supabase
    .from('club_private_state')
    .upsert({
      owner_id: currentIdentity.userId,
      club: ownClub,
      athletes,
      entries,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' })

  if (error) {
    if (isMissingTableError(error)) {
      secureTablesAvailable = false
      return syncLegacyPrivateState()
    }
    console.warn('[IKA cloud] zapis prywatnych danych klubu nieudany:', error.message)
  }
}

async function syncOrganizerPrivateState() {
  if (!supabase || currentIdentity.role !== 'organizer') return
  if (secureTablesAvailable === false) return syncLegacyPrivateState()

  const existingResult = await fetchPrivateRows()
  if (existingResult.error) {
    if (isMissingTableError(existingResult.error)) {
      secureTablesAvailable = false
      return syncLegacyPrivateState()
    }
    console.warn('[IKA cloud] odczyt prywatnych danych klubów nieudany:', existingResult.error.message)
    return
  }

  const clubs = readLocal('ika_clubs_v1', [])
  const athletes = readLocal('ika_athletes_v1', [])
  const entries = readLocal('ika_entries_v1', [])
  const existingByOwner = new Map(existingResult.rows.map((row) => [row.owner_id, row]))

  const rows = []
  clubs.forEach((club) => {
    const ownerId = club.ownerId
    if (!ownerId || typeof ownerId !== 'string' || ownerId.startsWith('usr_')) return
    const clubAthletes = athletes.filter((athlete) => athlete.clubId === club.id)
    const athleteIds = new Set(clubAthletes.map((athlete) => athlete.id))
    rows.push({
      owner_id: ownerId,
      club,
      athletes: clubAthletes,
      entries: entries.filter((entry) => athleteIds.has(entry.athleteId)),
      updated_at: new Date().toISOString(),
    })
  })

  // Nie kasujemy rekordów, których nie ma lokalnie, aby pojedynczy błąd synchronizacji
  // organizatora nie usunął danych klubu. Aktualizujemy wyłącznie rozpoznane rekordy.
  if (!rows.length && existingByOwner.size) return
  if (rows.length) {
    const { error } = await supabase.from('club_private_state').upsert(rows, { onConflict: 'owner_id' })
    if (error) console.warn('[IKA cloud] zapis danych klubów przez organizatora nieudany:', error.message)
  }
}

async function syncLegacyPrivateState() {
  if (!supabase) return
  // Tryb zgodności przed uruchomieniem migracji ETAP 66. Po migracji te klucze są usuwane
  // z app_shared_state i polityki RLS nie pozwalają klubom ich zapisywać.
  for (const key of PRIVATE_CLOUD_KEYS) {
    const value = readLocal(key, [])
    try {
      const { error } = await supabase
        .from('app_shared_state')
        .upsert({ state_key: key, state_value: value, updated_at: new Date().toISOString() }, { onConflict: 'state_key' })
      if (error) console.warn('[IKA cloud legacy] zapis nieudany:', key, error.message)
    } catch (error) {
      console.warn('[IKA cloud legacy] zapis nieudany:', key, error?.message || error)
    }
  }
}

async function syncPrivateNow() {
  privateWritesInProgress += 1
  try {
    if (currentIdentity.role === 'club') return await syncClubPrivateState()
    if (currentIdentity.role === 'organizer') return await syncOrganizerPrivateState()
  } finally {
    privateWritesInProgress -= 1
  }
}

export function queueCloudWrite(key, value) {
  if (!cloudSyncConfigured || suppressCloudWrite || !CLOUD_KEYS.has(key)) return
  ika106LocalChange(key)
  if (pending.has(key)) clearTimeout(pending.get(key))

  if (PRIVATE_CLOUD_KEYS.has(key)) {
    pending.set(key, setTimeout(() => {
      pending.delete(key)
      syncPrivateNow().catch((error) => console.warn('[IKA cloud] prywatna synchronizacja nieudana:', error?.message || error))
    }, 180))
    return
  }

  const delay = key === 'ika_mat_states_v2' ? 350 : 120
  pending.set(key, setTimeout(() => {
    pending.delete(key)
    upsertPublicNow(key, value)
  }, delay))
}

async function hydratePublicState(polling = false) {
  const { data, error } = await supabase
    .from('app_shared_state')
    .select('state_key,state_value,updated_at')
    .in('state_key', [...PUBLIC_CLOUD_KEYS])

  if (error) throw error

  const cloudByKey = new Map((data || []).map((row) => [row.state_key, row]))
  for (const key of PUBLIC_CLOUD_KEYS) {
    // Polling must not revert a locally pending or in-flight score or timer change.
    if (polling && (pending.has(key) || inFlightPublicWrites.has(key))) continue
    const remote = cloudByKey.get(key)
    if (remote) {
      if (polling && localStorage.getItem(key) === JSON.stringify(remote.state_value)) continue
      applyRemoteValue(key, remote.state_value, remote.updated_at)
      continue
    }
    // No bootstrap writes during periodic read-only refresh.
    if (polling) continue
    if (currentIdentity.role !== 'organizer') continue
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      await upsertPublicNow(key, JSON.parse(raw))
    } catch {
      // Pomijamy pojedynczą uszkodzoną wartość lokalną.
    }
  }
}

function unsubscribeRoleChannels() {
  if (privateChannel && supabase) supabase.removeChannel(privateChannel)
  if (participantChannel && supabase) supabase.removeChannel(participantChannel)
  privateChannel = null
  participantChannel = null
}

function subscribePublicState() {
  if (!supabase || publicChannel) return
  publicChannel = supabase
    .channel('ika-system-zawodow-public-state')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_shared_state' },
      (payload) => {
        const row = payload.new || payload.old
        if (!row?.state_key || !PUBLIC_CLOUD_KEYS.has(row.state_key)) return
        if (payload.eventType === 'DELETE') return
        applyRemoteValue(row.state_key, row.state_value, row.updated_at)
      },
    )
    .on('broadcast', { event:'ika95-live' }, ({payload}) => {
      if (ika95LiveKeys.has(payload?.key) && payload.value != null) applyRemoteValue(payload.key,payload.value,payload.updatedAt)
    })
    .subscribe()
}

function subscribeRoleState() {
  if (!supabase || secureTablesAvailable === false) return
  unsubscribeRoleChannels()

  participantChannel = supabase
    .channel(`ika-public-participants-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'public_participant_state' },
      () => {
        hydrateSensitiveState().catch((error) => console.warn('[IKA cloud] odświeżenie publicznych zawodników nieudane:', error?.message || error))
      },
    )
    .subscribe()

  if (currentIdentity.role !== 'public') {
    privateChannel = supabase
      .channel(`ika-private-clubs-${currentIdentity.userId || 'none'}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_private_state' },
        () => {
          hydrateSensitiveState()
            .then(() => {
              // Zmiana zgłoszeń klubu unieważnia lokalny automatyczny harmonogram organizatora.
              // Centrum zawodów przeliczy go ponownie z aktualnych wpisów.
              if (currentIdentity.role === 'organizer') {
                suppressCloudWrite = true
                try { localStorage.setItem('ika_schedule_v3', JSON.stringify([])) } finally { suppressCloudWrite = false }
              }
            })
            .catch((error) => console.warn('[IKA cloud] odświeżenie danych klubowych nieudane:', error?.message || error))
        },
      )
      .subscribe()
  }
}

export async function refreshCloudSyncForSession() {
  if (!cloudSyncConfigured || !supabase) return { enabled: false }
  currentIdentity = await resolveIdentity()
  try {
    await hydratePublicState()
    await hydrateSensitiveState()
    subscribeRoleState()
    window.dispatchEvent(new CustomEvent('ika:cloud-identity', { detail: currentIdentity }))
    return { enabled: true, ...currentIdentity, secure: secureTablesAvailable !== false }
  } catch (error) {
    console.warn('[IKA cloud] odświeżenie sesji nieudane:', error?.message || error)
    return { enabled: false, error }
  }
}

async function pollLatestCompetitionData() {
  if (!initialized || !supabase || pollingNow) return
  pollingNow = true
  try {
    await hydratePublicState(true)
    const privateDirty = privateWritesInProgress > 0 || [...PRIVATE_CLOUD_KEYS].some((key) => pending.has(key))
    if (!privateDirty) await hydrateSensitiveState()
    // React routes refresh without changing URL, focus, scroll, timers or the TV window.
    window.dispatchEvent(new Event('ika:periodic-refresh'))
  } catch (error) {
    console.warn('[IKA cloud] odswiezenie 10 s nieudane:', error?.message || error)
  } finally {
    pollingNow = false
  }
}

// Rezerwowe odswiezanie tylko trzech kluczy wynikow. Realtime ma pierwszenstwo.
async function ika95PollLive() {
  if (!initialized || !supabase || ika95LivePolling) return
  ika95LivePolling = true
  try {
    const { data, error } = await supabase.from('app_shared_state')
      .select('state_key,state_value,updated_at').in('state_key',[...ika95LiveKeys])
    if (error) throw error
    for (const row of data || []) if (ika95LiveKeys.has(row.state_key)) applyRemoteValue(row.state_key,row.state_value,row.updated_at)
  } catch (e) { console.warn('[IKA cloud] szybki odczyt:',e?.message||e) }
  finally { ika95LivePolling = false }
}
function startTenSecondRefresh() {
  if (pollingInterval) return
  pollingInterval = window.setInterval(() => {
    pollLatestCompetitionData().catch(() => {})
  }, 10000)
  if (/^\/(tatami\/|organizator\/(kata-sedzia|sedzia)\/|telebim(?:\/|$))/.test(window.location.pathname)) {
    ika95LivePollInterval = window.setInterval(() => { ika95PollLive().catch(()=>{}) },2000)
  }
}

export async function initializeCloudSync() {
  if (initialized || !cloudSyncConfigured || !supabase) return { enabled: cloudSyncConfigured }
  initialized = true
  try {
    currentIdentity = await resolveIdentity()
    await hydratePublicState()
    await hydrateSensitiveState()
    subscribePublicState()
    subscribeRoleState()
    startTenSecondRefresh()

    const result = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        refreshCloudSyncForSession().catch((error) => console.warn('[IKA cloud] zmiana sesji:', error?.message || error))
      }, 0)
    })
    authSubscription = result?.data?.subscription || null

    window.dispatchEvent(new CustomEvent('ika:cloud-ready', {
      detail: { enabled: true, secure: secureTablesAvailable !== false, role: currentIdentity.role },
    }))
    return { enabled: true, secure: secureTablesAvailable !== false, role: currentIdentity.role }
  } catch (error) {
    console.warn('[IKA cloud] synchronizacja nie została uruchomiona:', error?.message || error)
    window.dispatchEvent(new CustomEvent('ika:cloud-ready', { detail: { enabled: false, error: error?.message } }))
    return { enabled: false, error }
  }
}

export function disposeCloudSync() {
  if (pollingInterval) window.clearInterval(pollingInterval)
  pollingInterval = null
  if (ika95LivePollInterval) window.clearInterval(ika95LivePollInterval)
  ika95LivePollInterval = null
  if (!supabase) return
  if (publicChannel) supabase.removeChannel(publicChannel)
  unsubscribeRoleChannels()
  authSubscription?.unsubscribe?.()
  publicChannel = null
  authSubscription = null
  initialized = false
}


// ETAP 67: organizator może trwale usunąć prywatny rekord klubu z Supabase.
export async function deleteClubPrivateState(ownerId) {
  if (!supabase || currentIdentity.role !== 'organizer') throw new Error('Usuwanie klubu wymaga zalogowanego organizatora Supabase.')
  if (!ownerId) throw new Error('Brak identyfikatora właściciela klubu.')
  const { error } = await supabase.from('club_private_state').delete().eq('owner_id', ownerId)
  if (error) throw new Error(error.message || 'Nie udało się usunąć klubu z Supabase.')
  return true
}
