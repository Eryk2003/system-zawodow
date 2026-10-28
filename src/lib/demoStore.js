import { DEFAULT_COMPETITIONS, DEFAULT_TOURNAMENT } from './defaults.js'
import { queueCloudWrite } from './cloudSync.js'
import { getKumiteWinRule } from './kumiteRules.js'
import { MAX_BRACKET_ATHLETES, planOpeningRound } from './bracketUtils.js'

const KEYS = {
  accounts: 'ika_accounts_v1',
  session: 'ika_session_v1',
  clubs: 'ika_clubs_v1',
  athletes: 'ika_athletes_v1',
  competitions: 'ika_competitions_v1',
  entries: 'ika_entries_v1',
  tournament: 'ika_tournament_v1',
  live: 'ika_live_v1',
  trainingGroups: 'ika_training_groups_v2',
  news: 'ika_news_v2',
  matches: 'ika_matches_v2',
  matStates: 'ika_mat_states_v2',
  schedule: 'ika_schedule_v3',
  tournamentCategories: 'ika_tournament_categories_v1',
  kataSessions: 'ika_kata_sessions_v1',
}

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
  queueCloudWrite(key, value)
}
const uid = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
const emit = (event = 'ika:data') => window.dispatchEvent(new Event(event))

export function ensureSeed() {
  if (!localStorage.getItem(KEYS.accounts)) {
    write(KEYS.accounts, [
      {
        id: 'organizer_demo',
        email: 'admin@ikapoland.demo',
        password: 'IKA12345',
        fullName: 'Administrator IKA Poland',
        role: 'organizer',
      },
    ])
  }
  if (!localStorage.getItem(KEYS.competitions)) {
    write(KEYS.competitions, DEFAULT_COMPETITIONS)
  } else {
    // Uzupełnia katalog o nowe konkurencje w kolejnych etapach bez kasowania danych użytkownika.
    const saved = read(KEYS.competitions, [])
    const savedIds = new Set(saved.map((item) => item.id))
    const missing = DEFAULT_COMPETITIONS.filter((item) => !savedIds.has(item.id))
    if (missing.length) write(KEYS.competitions, [...saved, ...missing])
  }
  if (!localStorage.getItem(KEYS.clubs)) write(KEYS.clubs, [])
  if (!localStorage.getItem(KEYS.athletes)) write(KEYS.athletes, [])
  if (!localStorage.getItem(KEYS.entries)) write(KEYS.entries, [])
  if (!localStorage.getItem(KEYS.tournament)) write(KEYS.tournament, DEFAULT_TOURNAMENT)
  if (!localStorage.getItem(KEYS.live)) write(KEYS.live, null)
  if (!localStorage.getItem(KEYS.trainingGroups)) write(KEYS.trainingGroups, [])
  if (!localStorage.getItem(KEYS.news)) write(KEYS.news, [])
  if (!localStorage.getItem(KEYS.matches)) write(KEYS.matches, [])
  if (!localStorage.getItem(KEYS.matStates)) write(KEYS.matStates, {})
  if (!localStorage.getItem(KEYS.schedule)) write(KEYS.schedule, [])
  if (!localStorage.getItem(KEYS.tournamentCategories)) write(KEYS.tournamentCategories, [])
  if (!localStorage.getItem(KEYS.kataSessions)) write(KEYS.kataSessions, [])
}

export function getSession() {
  ensureSeed()
  const id = read(KEYS.session, null)
  if (!id) return null
  return read(KEYS.accounts, []).find((a) => a.id === id) || null
}

export function registerAccount({ email, password, fullName }) {
  ensureSeed()
  const accounts = read(KEYS.accounts, [])
  if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new Error('Konto z tym adresem e-mail już istnieje.')
  }
  const account = { id: uid('usr'), email: email.trim(), password, fullName: fullName.trim(), role: 'club' }
  accounts.push(account)
  write(KEYS.accounts, accounts)
  write(KEYS.session, account.id)
  return account
}

export function loginAccount({ email, password }) {
  ensureSeed()
  const account = read(KEYS.accounts, []).find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  )
  if (!account) throw new Error('Nieprawidłowy e-mail lub hasło.')
  write(KEYS.session, account.id)
  return account
}

export function logoutAccount() {
  localStorage.removeItem(KEYS.session)
}

function roundName(slotCount, preliminary = false) {
  if (preliminary) return 'Runda wstępna'
  const matchCount = slotCount / 2
  if (matchCount === 1) return 'Finał'
  if (matchCount === 2) return 'Półfinał'
  if (matchCount === 4) return 'Ćwierćfinał'
  if (matchCount === 8) return '1/8 finału'
  if (matchCount === 16) return '1/16 finału'
  if (matchCount === 32) return '1/32 finału'
  if (matchCount === 64) return '1/64 finału'
  return `Runda ${matchCount}`
}

function resolveMatchParticipant(match, side, matches) {
  const directId = side === 'red' ? match.redAthleteId : match.blueAthleteId
  if (directId) return directId
  const sourceId = side === 'red' ? match.redSourceMatchId : match.blueSourceMatchId
  if (!sourceId) return null
  return matches.find((m) => m.id === sourceId)?.winnerId || null
}

export function resolveMatch(match, matches = read(KEYS.matches, [])) {
  return {
    ...match,
    redResolvedId: resolveMatchParticipant(match, 'red', matches),
    blueResolvedId: resolveMatchParticipant(match, 'blue', matches),
  }
}

export function getComputedRemaining(match) {
  if (!match) return 0
  const base = Number.isFinite(match.timerRemaining) ? match.timerRemaining : Number(match.boutSeconds || DEFAULT_TOURNAMENT.boutSeconds)
  if (!match.timerRunning || !match.timerStartedAt) return Math.max(0, base)
  const elapsed = Math.floor((Date.now() - match.timerStartedAt) / 1000)
  return Math.max(0, base - elapsed)
}

function saveMatchInternal(nextMatch) {
  const matches = read(KEYS.matches, [])
  const idx = matches.findIndex((m) => m.id === nextMatch.id)
  if (idx >= 0) matches[idx] = nextMatch
  else matches.push(nextMatch)
  write(KEYS.matches, matches)
  return nextMatch
}

function setMatStateInternal(mat, patch) {
  const states = read(KEYS.matStates, {})
  states[mat] = { ...(states[mat] || {}), mat, ...patch, updatedAt: Date.now() }
  write(KEYS.matStates, states)
  return states[mat]
}

function scheduleGroupKey(competitionId, category) {
  return `${competitionId || ''}|||${(category || '').trim()}`
}

function timeToSeconds(value) {
  const parts = String(value || '09:00').split(':').map(Number)
  const hours = parts[0]
  const minutes = parts[1]
  const seconds = parts[2] || 0
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return 9 * 60 * 60
  return Math.max(0, Math.min(24 * 60 * 60 - 1, hours * 3600 + minutes * 60 + seconds))
}

function secondsToTime(value, forceSeconds = false) {
  const normalized = Math.max(0, Math.round(value)) % (24 * 60 * 60)
  const hours = Math.floor(normalized / 3600)
  const minutes = Math.floor((normalized % 3600) / 60)
  const seconds = normalized % 60
  const base = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return forceSeconds || seconds ? `${base}:${String(seconds).padStart(2, '0')}` : base
}

function getCategoryBoutSeconds(categoryRecord, tournament) {
  const categorySeconds = Number(categoryRecord?.boutSeconds)
  if (Number.isFinite(categorySeconds) && categorySeconds > 0) return Math.max(1, Math.round(categorySeconds))

  const tournamentSeconds = Number(tournament?.boutSeconds)
  if (Number.isFinite(tournamentSeconds) && tournamentSeconds > 0) return Math.max(1, Math.round(tournamentSeconds))

  const tournamentMinutes = Number(tournament?.avgBoutMinutes)
  if (Number.isFinite(tournamentMinutes) && tournamentMinutes > 0) return Math.max(1, Math.round(tournamentMinutes * 60))

  return Number(DEFAULT_TOURNAMENT.boutSeconds) || 120
}

function estimateScheduleTiming(entryCount, competition, tournament, categoryRecord) {
  const boutSeconds = getCategoryBoutSeconds(categoryRecord, tournament)
  const boutCount = competition?.group === 'Kumite' ? Math.max(1, entryCount - 1) : Math.max(1, entryCount)
  const durationSeconds = Math.max(1, boutCount * boutSeconds)
  return {
    boutSeconds,
    boutCount,
    durationSeconds,
    durationMinutes: Math.round((durationSeconds / 60) * 100) / 100,
  }
}

function normalizeMatName(mat, matCount) {
  const count = Math.max(1, Number(matCount) || 1)
  const parsed = Number(String(mat || '').match(/\d+/)?.[0] || 1)
  const safe = Math.max(1, Math.min(count, Number.isFinite(parsed) ? parsed : 1))
  return `Tatami ${safe}`
}

/* ETAP 87 - stala mata kategorii ma pierwszenstwo przed automatycznym harmonogramem. */
function findEarliestFreeSlot(reservationsByMat, duration, tournamentStart, matCount, requiredMat = null) {
  let best = null
  for (let index = 0; index < matCount; index += 1) {
    const mat = `Tatami ${index + 1}`
    if (requiredMat && mat !== requiredMat) continue
    const reservations = [...(reservationsByMat[mat] || [])].sort((a, b) => a.start - b.start)
    let candidate = tournamentStart
    for (const reservation of reservations) {
      if (candidate + duration <= reservation.start) break
      if (candidate < reservation.end) candidate = reservation.end
    }
    if (!best || candidate < best.start || (candidate === best.start && index < best.index)) {
      best = { mat, index, start: candidate }
    }
  }
  return best || { mat: 'Tatami 1', index: 0, start: tournamentStart }
}

function syncEntriesWithSchedule(schedule) {
  const slotsByKey = new Map(schedule.map((slot) => [slot.groupKey, slot]))
  const entries = read(KEYS.entries, [])
  const competitions = read(KEYS.competitions, DEFAULT_COMPETITIONS)
  const categories = read(KEYS.tournamentCategories, [])
  const matches = read(KEYS.matches, [])
  const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }

  const groupEntries = new Map()
  entries.forEach((entry) => {
    const key = scheduleGroupKey(entry.competitionId, entry.category)
    if (!groupEntries.has(key)) groupEntries.set(key, [])
    groupEntries.get(key).push(entry)
  })
  groupEntries.forEach((items) => items.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)))

  const synced = entries.map((entry) => {
    const key = scheduleGroupKey(entry.competitionId, entry.category)
    const slot = slotsByKey.get(key)
    if (!slot) return { ...entry, estimatedStart: '', mat: '', scheduleSlotId: null }

    const competition = competitions.find((item) => item.id === entry.competitionId)
    const categoryRecord = categories.find((item) =>
      item.id === entry.categoryId || (item.competitionId === entry.competitionId && item.name === entry.category)
    )
    const boutSeconds = Number(slot.boutSeconds) || getCategoryBoutSeconds(categoryRecord, tournament)
    const startSeconds = timeToSeconds(slot.startTime)
    const items = groupEntries.get(key) || []
    let sequenceIndex = Math.max(0, items.findIndex((item) => item.id === entry.id))

    if (competition?.group === 'Kumite') {
      const categoryMatches = matches
        .filter((match) =>
          match.competitionId === entry.competitionId &&
          match.category === entry.category &&
          (!entry.categoryId || !match.categoryId || match.categoryId === entry.categoryId)
        )
        .sort((a, b) => Number(a.queueOrder || 0) - Number(b.queueOrder || 0))
      const firstOwnMatch = categoryMatches.find((match) =>
        match.redAthleteId === entry.athleteId || match.blueAthleteId === entry.athleteId
      )
      if (firstOwnMatch) sequenceIndex = Math.max(0, Number(firstOwnMatch.queueOrder || 1) - 1)
      else sequenceIndex = Math.floor(sequenceIndex / 2)
    }

    return {
      ...entry,
      estimatedStart: secondsToTime(startSeconds + sequenceIndex * boutSeconds, true),
      mat: slot.mat,
      scheduleSlotId: slot.id,
    }
  })
  write(KEYS.entries, synced)
  return synced
}

function regenerateScheduleInternal() {
  const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
  const entries = read(KEYS.entries, [])
  const competitions = read(KEYS.competitions, DEFAULT_COMPETITIONS)
  const categories = read(KEYS.tournamentCategories, [])
  const existing = read(KEYS.schedule, [])
  const existingByKey = new Map(existing.map((slot) => [slot.groupKey || scheduleGroupKey(slot.competitionId, slot.category), slot]))
  const grouped = new Map()

  entries.forEach((entry) => {
    if (!entry.competitionId || !String(entry.category || '').trim()) return
    const key = scheduleGroupKey(entry.competitionId, entry.category)
    if (!grouped.has(key)) grouped.set(key, { key, competitionId: entry.competitionId, category: entry.category.trim(), categoryId: entry.categoryId || null, entries: [] })
    grouped.get(key).entries.push(entry)
  })

  const groups = [...grouped.values()].sort((a, b) => {
    const oldA = existingByKey.get(a.key)
    const oldB = existingByKey.get(b.key)
    const orderA = Number.isFinite(oldA?.order) ? oldA.order : Math.min(...a.entries.map((e) => e.createdAt || Number.MAX_SAFE_INTEGER))
    const orderB = Number.isFinite(oldB?.order) ? oldB.order : Math.min(...b.entries.map((e) => e.createdAt || Number.MAX_SAFE_INTEGER))
    return orderA - orderB || a.category.localeCompare(b.category, 'pl')
  })

  const matCount = Math.max(1, Number(tournament.matCount) || 1)
  const tournamentStart = timeToSeconds(tournament.startTime || '09:00')
  const reservationsByMat = {}
  for (let i = 1; i <= matCount; i += 1) reservationsByMat[`Tatami ${i}`] = []

  const schedule = []
  const manualGroups = groups.filter((group) => existingByKey.get(group.key)?.manual)
  manualGroups.forEach((group) => {
    const old = existingByKey.get(group.key)
    const competition = competitions.find((item) => item.id === group.competitionId)
    const categoryRecord = categories.find((item) =>
      item.id === group.categoryId || (item.competitionId === group.competitionId && item.name === group.category)
    )
    const timing = estimateScheduleTiming(group.entries.length, competition, tournament, categoryRecord)
    const assignedMat = categoryRecord?.preferredMat || null
    const mat = assignedMat ? normalizeMatName(assignedMat, matCount) : normalizeMatName(old.mat, matCount)
    const start = timeToSeconds(old.startTime || tournament.startTime)
    const slot = {
      ...old,
      id: old.id || uid('slot'),
      groupKey: group.key,
      competitionId: group.competitionId,
      category: group.category,
      categoryId: group.categoryId || categoryRecord?.id || null,
      mat,
      startTime: secondsToTime(start),
      endTime: secondsToTime(start + timing.durationSeconds, true),
      durationSeconds: timing.durationSeconds,
      durationMinutes: timing.durationMinutes,
      boutSeconds: timing.boutSeconds,
      athleteCount: group.entries.length,
      estimatedBoutCount: timing.boutCount,
      manual: true,
      order: Number.isFinite(old.order) ? old.order : schedule.length,
    }
    schedule.push(slot)
    reservationsByMat[mat].push({ start, end: start + timing.durationSeconds, slotId: slot.id })
  })

  const autoGroups = groups.filter((group) => !existingByKey.get(group.key)?.manual)
  autoGroups.forEach((group, index) => {
    const old = existingByKey.get(group.key)
    const competition = competitions.find((item) => item.id === group.competitionId)
    const categoryRecord = categories.find((item) =>
      item.id === group.categoryId || (item.competitionId === group.competitionId && item.name === group.category)
    )
    const timing = estimateScheduleTiming(group.entries.length, competition, tournament, categoryRecord)
    const assignedMat = categoryRecord?.preferredMat || null
    const requiredMat = assignedMat ? normalizeMatName(assignedMat, matCount) : null
    const placement = findEarliestFreeSlot(reservationsByMat, timing.durationSeconds, tournamentStart, matCount, requiredMat)
    const slot = {
      ...(old || {}),
      id: old?.id || uid('slot'),
      groupKey: group.key,
      competitionId: group.competitionId,
      category: group.category,
      categoryId: group.categoryId || categoryRecord?.id || null,
      mat: placement.mat,
      startTime: secondsToTime(placement.start),
      endTime: secondsToTime(placement.start + timing.durationSeconds, true),
      durationSeconds: timing.durationSeconds,
      durationMinutes: timing.durationMinutes,
      boutSeconds: timing.boutSeconds,
      athleteCount: group.entries.length,
      estimatedBoutCount: timing.boutCount,
      manual: false,
      order: Number.isFinite(old?.order) ? old.order : manualGroups.length + index,
    }
    schedule.push(slot)
    reservationsByMat[placement.mat].push({ start: placement.start, end: placement.start + timing.durationSeconds, slotId: slot.id })
  })

  const sorted = schedule.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.mat.localeCompare(b.mat, 'pl', { numeric: true }) || a.order - b.order)
  write(KEYS.schedule, sorted)
  syncEntriesWithSchedule(sorted)
  return sorted
}


function normalizeKataScore(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(parsed)) return null
  return Math.round(Math.max(0, Math.min(10, parsed)) * 100) / 100
}

function calculateKataFinalScore(scores = [], judgeCount = 3) {
  const count = judgeCount === 5 ? 5 : 3
  const normalized = Array.from({ length: count }, (_, index) => normalizeKataScore(scores[index]))
  if (normalized.some((value) => value == null)) return null
  const rawTotal = Math.round(normalized.reduce((sum, value) => sum + value, 0) * 100) / 100
  let countedIndexes = normalized.map((_, index) => index)
  let droppedIndexes = []
  if (count === 5) {
    let minIndex = 0
    let maxIndex = 0
    normalized.forEach((value, index) => {
      if (value < normalized[minIndex]) minIndex = index
      if (value > normalized[maxIndex]) maxIndex = index
    })
    if (minIndex === maxIndex) maxIndex = normalized.findIndex((_, index) => index !== minIndex)
    droppedIndexes = [minIndex, maxIndex]
    countedIndexes = countedIndexes.filter((index) => !droppedIndexes.includes(index))
  }
  const finalScore = Math.round(countedIndexes.reduce((sum, index) => sum + normalized[index], 0) * 100) / 100
  return { scores: normalized, rawTotal, finalScore, countedIndexes, droppedIndexes }
}

function kataAthleteInfo(athleteId, athletes, clubs) {
  const athlete = athletes.find((item) => item.id === athleteId)
  if (!athlete) return null
  const club = clubs.find((item) => item.id === athlete.clubId)
  return {
    ...athlete,
    athleteId,
    athleteName: `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim(),
    clubId: club?.id || athlete.clubId || null,
    clubName: club?.shortName || club?.name || 'Bez klubu',
  }
}

function buildTournamentPodiums() {
  const allMatches = read(KEYS.matches, [])
  const athletes = read(KEYS.athletes, [])
  const clubs = read(KEYS.clubs, [])
  const competitions = read(KEYS.competitions, DEFAULT_COMPETITIONS)
  const categories = read(KEYS.tournamentCategories, [])
  const groups = new Map()

  allMatches.forEach((match) => {
    const key = match.categoryId || `${match.competitionId || ''}|||${match.category || ''}|||${match.mat || ''}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(match)
  })

  const podiums = []
  groups.forEach((matches) => {
    if (!matches.length) return
    const maxRound = Math.max(...matches.map((match) => Number(match.roundIndex || 0)))
    const finalMatch = matches.find((match) => Number(match.roundIndex || 0) === maxRound)
    if (!finalMatch || finalMatch.status !== 'done' || !finalMatch.winnerId) return

    const finalResolved = resolveMatch(finalMatch, allMatches)
    const firstId = finalMatch.winnerId
    const secondId = finalResolved.redResolvedId === firstId ? finalResolved.blueResolvedId : finalResolved.redResolvedId
    if (!firstId || !secondId) return

    let thirdIds = []
    if (maxRound > 0) {
      thirdIds = matches
        .filter((match) => Number(match.roundIndex || 0) === maxRound - 1 && match.status === 'done' && match.winnerId)
        .map((match) => {
          const resolved = resolveMatch(match, allMatches)
          return resolved.redResolvedId === match.winnerId ? resolved.blueResolvedId : resolved.redResolvedId
        })
        .filter(Boolean)
        .filter((athleteId, index, list) => list.indexOf(athleteId) === index && athleteId !== firstId && athleteId !== secondId)
        .slice(0, 2)
    }

    const category = categories.find((item) => item.id === finalMatch.categoryId) || null
    const competition = competitions.find((item) => item.id === finalMatch.competitionId) || null
    const athleteInfo = (athleteId) => {
      const athlete = athletes.find((item) => item.id === athleteId)
      if (!athlete) return null
      const club = clubs.find((item) => item.id === athlete.clubId)
      return {
        athleteId,
        athleteName: `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim(),
        clubId: club?.id || athlete.clubId || null,
        clubName: club?.name || 'Bez klubu',
      }
    }

    const placements = [
      { place: 1, points: 6, clubPoints: 6, ...athleteInfo(firstId) },
      { place: 2, points: 4, clubPoints: 4, ...athleteInfo(secondId) },
      ...thirdIds.map((athleteId) => ({ place: 3, points: 2, clubPoints: 2, ...athleteInfo(athleteId) })),
    ].filter((item) => item.athleteId)

    podiums.push({
      key: finalMatch.categoryId || `${finalMatch.competitionId}|||${finalMatch.category}`,
      categoryId: finalMatch.categoryId || null,
      categoryName: category?.name || finalMatch.category || 'Kategoria',
      competitionId: finalMatch.competitionId,
      competitionName: competition?.name || 'Konkurencja',
      mat: finalMatch.mat || '',
      placements,
      completedAt: finalMatch.completedAt || finalMatch.updatedAt || finalMatch.timerStartedAt || 0,
    })
  })

  const kataSessions = read(KEYS.kataSessions, [])
  kataSessions.forEach((session) => {
    if (session.status !== 'completed') return
    const completed = (session.results || [])
      .filter((result) => result.status === 'done' && Number.isFinite(Number(result.finalScore)))
      .sort((a, b) => Number(b.finalScore) - Number(a.finalScore) || Number(b.rawTotal || 0) - Number(a.rawTotal || 0) || Number(a.completedAt || 0) - Number(b.completedAt || 0))
    if (!completed.length) return
    const category = categories.find((item) => item.id === session.categoryId) || null
    const competition = competitions.find((item) => item.id === session.competitionId) || null
    const top = completed.slice(0, 3)
    const placements = top.map((result, index) => {
      const info = kataAthleteInfo(result.athleteId, athletes, clubs)
      const place = index + 1
      return info ? {
        place,
        points: place === 1 ? 6 : place === 2 ? 4 : 2,
        clubPoints: place === 1 ? 6 : place === 2 ? 4 : 2,
        finalScore: result.finalScore,
        rawTotal: result.rawTotal,
        ...info,
      } : null
    }).filter(Boolean)
    podiums.push({
      key: session.categoryId || `${session.competitionId}|||${session.category}`,
      categoryId: session.categoryId || null,
      categoryName: category?.name || session.category || 'Kategoria',
      competitionId: session.competitionId,
      competitionName: competition?.name || 'Kata',
      mat: session.mat || '',
      placements,
      completedAt: session.completedAt || 0,
      source: 'kata',
    })
  })

  return podiums
}

function buildLiveRankings() {
  const podiums = buildTournamentPodiums()
  const athleteMap = new Map()
  const clubMap = new Map()

  podiums.forEach((podium) => {
    podium.placements.forEach((result) => {
      if (!athleteMap.has(result.athleteId)) {
        athleteMap.set(result.athleteId, {
          athleteId: result.athleteId,
          athleteName: result.athleteName,
          clubId: result.clubId,
          clubName: result.clubName,
          points: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          podiums: 0,
        })
      }
      const athleteRow = athleteMap.get(result.athleteId)
      athleteRow.points += result.points
      athleteRow.podiums += 1
      if (result.place === 1) athleteRow.gold += 1
      if (result.place === 2) athleteRow.silver += 1
      if (result.place === 3) athleteRow.bronze += 1

      const clubKey = result.clubId || `club:${result.clubName}`
      if (!clubMap.has(clubKey)) {
        clubMap.set(clubKey, {
          clubId: result.clubId,
          clubName: result.clubName,
          points: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          podiums: 0,
        })
      }
      const clubRow = clubMap.get(clubKey)
      clubRow.points += result.clubPoints ?? (result.place === 1 ? 6 : result.place === 2 ? 4 : 2)
      clubRow.podiums += 1
      if (result.place === 1) clubRow.gold += 1
      if (result.place === 2) clubRow.silver += 1
      if (result.place === 3) clubRow.bronze += 1
    })
  })

  // Klasyfikacja zawodników jest medalowa dokładnie jak klasyfikacja klubowa: najpierw złote, potem srebrne i brązowe medale.
  // Punkty 6/4/2 pokazują dorobek zawodnika, ale nie wyprzedzają liczby medali wyższego koloru.
  const athleteSorter = (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.points - a.points || String(a.athleteName).localeCompare(String(b.athleteName), 'pl')
  // Klasyfikacja klubowa jest medalowa: najpierw liczba złotych, potem srebrnych i brązowych.
  // Punkty 6/4/2 są widocznym dorobkiem klubu, ale nie mogą przeskoczyć klubu z większą liczbą złotych medali.
  const clubSorter = (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.points - a.points || String(a.clubName).localeCompare(String(b.clubName), 'pl')
  const athletes = [...athleteMap.values()].sort(athleteSorter).map((row, index) => ({ ...row, place: index + 1 }))
  const clubs = [...clubMap.values()].sort(clubSorter).map((row, index) => ({ ...row, place: index + 1 }))

  return { athletes, clubs, podiums, updatedAt: Date.now() }
}

/* ETAP 89 - bezklikalna zmiana kategorii po zakończeniu konkurencji.
   Zapisany harmonogram jest źródłem kolejności; żadnych automatycznych losowań. */
const AUTO_CATEGORY_PODIUM_MS = 26000
const AUTO_CATEGORY_INTRO_MS = 10000

function sameScheduledCategory(slot, category) {
  if (!slot || !category) return false
  if (category.categoryId && slot.categoryId) return slot.categoryId === category.categoryId
  return slot.competitionId === category.competitionId && slot.category === category.category
}

function nextPreparedCategoryOnMat(mat, completed) {
  const timetable = read(KEYS.schedule, [])
    .filter((slot) => slot.mat === mat)
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')) || Number(a.order || 0) - Number(b.order || 0))
  const currentIndex = timetable.findIndex((slot) => sameScheduledCategory(slot, completed))
  if (currentIndex < 0) return null
  const matches = read(KEYS.matches, [])
  const kataSessions = read(KEYS.kataSessions, [])
  for (const slot of timetable.slice(currentIndex + 1)) {
    const same = (item) => item.mat === mat && sameScheduledCategory(item, slot)
    const categoryMatches = matches.filter(same)
    if (categoryMatches.length) {
      const finalRound = Math.max(...categoryMatches.map((m) => Number(m.roundIndex || 0)))
      const finalMatches = categoryMatches.filter((m) => Number(m.roundIndex || 0) === finalRound)
      if (finalMatches.every((m) => m.status === 'done' && m.winnerId)) continue
      return {
        competitionId: slot.competitionId, category: slot.category, categoryId: slot.categoryId || null,
        mat, kind: 'kumite', mode: 'bracket', kataSessionId: null,
      }
    }
    const kata = kataSessions.find(same)
    if (kata) {
      if (kata.status === 'completed') continue
      return {
        competitionId: slot.competitionId, category: slot.category, categoryId: slot.categoryId || null,
        mat, kind: 'kata', mode: 'kata-list', kataSessionId: kata.id,
      }
    }
    // Nie przeskakuj kategorii, której organizator jeszcze nie przygotował.
    return null
  }
  return null
}

function canPreserveMatSelection(mat, competitionId, category, categoryId) {
  const previous = read(KEYS.matStates, {})[mat]
  if (!previous?.competitionId) return false
  if (sameScheduledCategory(previous, { competitionId, category, categoryId })) return false
  // Generowanie następnej drabinki/listy nie może przerwać trwającej lub oczekującej kategorii.
  const matches = read(KEYS.matches, [])
  const sessions = read(KEYS.kataSessions, [])
  return matches.some((m) => m.mat === mat && sameScheduledCategory(m, previous)) ||
    sessions.some((s) => s.mat === mat && sameScheduledCategory(s, previous)) ||
    Boolean(previous.autoTransition)
}

function autoTransitionSnapshot(state, now = Date.now()) {
  const transition = state?.autoTransition
  if (!transition?.next || state?.breakActive || !['podium', 'kata-final'].includes(state?.mode) || !Number.isFinite(Number(transition.announceAt))) return null
  const start = Number(transition.announceAt)
  const end = start + AUTO_CATEGORY_INTRO_MS
  return {
    ...transition,
    secondsLeft: Math.max(0, Math.ceil((end - now) / 1000)),
    showing: now >= start && now < end,
    finished: now >= end,
  }
}

export const db = {
  getCompetitions: () => read(KEYS.competitions, DEFAULT_COMPETITIONS),
  getOrganizerAccount: () => read(KEYS.accounts, []).find((account) => account.role === 'organizer') || null,
  saveCompetitions: (items) => { write(KEYS.competitions, items); emit() },
  getTournament: () => ({ ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }),
  getVisibleTournamentForClubs: () => {
    const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
    return tournament.created && tournament.visibleToClubs !== false ? tournament : null
  },
  saveTournament: (item) => { write(KEYS.tournament, item); regenerateScheduleInternal(); emit() },
  createTournament: (item) => {
    const next = {
      ...DEFAULT_TOURNAMENT,
      ...item,
      id: item.id || uid('tournament'),
      created: true,
      status: 'preparation',
      visibleToClubs: true,
      publishedAt: Date.now(),
      createdAt: Date.now(),
    }
    write(KEYS.tournament, next)
    // Nowe zawody zaczynają z czystym harmonogramem, drabinkami i ekranami LIVE.
    write(KEYS.entries, [])
    write(KEYS.matches, [])
    write(KEYS.matStates, {})
    write(KEYS.schedule, [])
    write(KEYS.live, null)
    write(KEYS.tournamentCategories, [])
    write(KEYS.kataSessions, [])
    emit()
    return next
  },
  getTournamentCategories: () => read(KEYS.tournamentCategories, []),
  saveTournamentCategory: (category) => {
    if (!['K', 'M', 'X'].includes(category.gender)) throw new Error('Wybierz płeć kategorii: Kobieta, Mężczyzna albo Mieszana.')
    const items = read(KEYS.tournamentCategories, [])
    const next = {
      ...category,
      id: category.id || uid('cat'),
      name: String(category.name || '').trim(),
      competitionId: category.competitionId || '',
      gender: category.gender,
      preferredMat: category.preferredMat || null,
      minAge: category.minAge === '' || category.minAge == null ? null : Number(category.minAge),
      maxAge: category.maxAge === '' || category.maxAge == null ? null : Number(category.maxAge),
      boutSeconds: category.boutSeconds === '' || category.boutSeconds == null ? null : Math.max(1, Math.round(Number(category.boutSeconds))),
      createdAt: category.createdAt || Date.now(),
    }
    const idx = items.findIndex((item) => item.id === next.id)
    if (idx >= 0) items[idx] = next
    else items.push(next)
    write(KEYS.tournamentCategories, items)
    const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
    const competitionIds = [...new Set([...(tournament.competitionIds || []), next.competitionId].filter(Boolean))]
    write(KEYS.tournament, { ...tournament, competitionIds })
    emit()
    return next
  },
  /* ETAP 87 - bezpieczny import wielu kategorii jednym zapisem danych. */
  importElite2027Categories: (templates, allowedCompetitionIds = []) => {
    const allowed = new Set(allowedCompetitionIds)
    const items = read(KEYS.tournamentCategories, [])
    const existingKeys = new Set(items.map((item) => `${item.competitionId}|||${item.code || item.name}`.toLocaleLowerCase('pl')))
    let added = 0
    let skipped = 0
    for (const template of templates) {
      if (!allowed.has(template.competitionId) || !['K', 'M', 'X'].includes(template.gender)) { skipped += 1; continue }
      const key = `${template.competitionId}|||${template.code || template.name}`.toLocaleLowerCase('pl')
      const byName = items.some((item) => item.competitionId === template.competitionId && item.name.toLocaleLowerCase('pl') === template.name.toLocaleLowerCase('pl'))
      if (existingKeys.has(key) || byName) { skipped += 1; continue }
      existingKeys.add(key)
      items.push({
        ...template, id: uid('cat'),
        minAge: template.minAge ?? null, maxAge: template.maxAge ?? null,
        boutSeconds: template.boutSeconds ?? null, preferredMat: null,
        createdAt: Date.now(),
      })
      added += 1
    }
    if (added) {
      write(KEYS.tournamentCategories, items)
      const tournament = db.getTournament()
      write(KEYS.tournament, { ...tournament, competitionIds: [...new Set([...(tournament.competitionIds || []), ...allowed])] })
      emit()
    }
    return { added, skipped }
  },
  /* ETAP 87 - przypisanie tatami do kategorii; blokada po rozpoczeciu rozgrywek. */
  assignCategoryMat: (categoryId, preferredMat) => {
    const tournament = db.getTournament()
    const allowedMats = Array.from({ length: Math.max(1, Number(tournament.matCount) || 1) }, (_, index) => `Tatami ${index + 1}`)
    if (preferredMat && !allowedMats.includes(preferredMat)) throw new Error('Wybrane tatami nie istnieje w tych zawodach.')
    const categories = read(KEYS.tournamentCategories, [])
    const index = categories.findIndex((category) => category.id === categoryId)
    if (index < 0) throw new Error('Nie znaleziono kategorii.')
    const category = categories[index]
    if ((category.preferredMat || null) === (preferredMat || null)) return category
    const isRelated = (row) => row.categoryId === categoryId || (row.competitionId === category.competitionId && row.category === category.name)
    if (read(KEYS.matches, []).some(isRelated) || read(KEYS.kataSessions, []).some(isRelated)) {
      throw new Error('Tatami jest zablokowane po losowaniu drabinki lub utworzeniu listy kata. Nie można przenosić rozpoczętej kategorii.')
    }
    categories[index] = { ...category, preferredMat: preferredMat || null }
    write(KEYS.tournamentCategories, categories)
    const schedule = read(KEYS.schedule, [])
    write(KEYS.schedule, schedule.map((slot) => isRelated(slot) ? { ...slot, manual: false } : slot))
    regenerateScheduleInternal()
    emit()
    return categories[index]
  },
  deleteTournamentCategory: (categoryId) => {
    const categories = read(KEYS.tournamentCategories, [])
    const target = categories.find((item) => item.id === categoryId)
    const nextCategories = categories.filter((item) => item.id !== categoryId)
    write(KEYS.tournamentCategories, nextCategories)
    if (target) {
      write(KEYS.entries, read(KEYS.entries, []).filter((entry) => entry.categoryId !== categoryId && !(entry.competitionId === target.competitionId && entry.category === target.name)))
      write(KEYS.matches, read(KEYS.matches, []).filter((match) => match.categoryId !== categoryId && !(match.competitionId === target.competitionId && match.category === target.name)))
      write(KEYS.kataSessions, read(KEYS.kataSessions, []).filter((session) => session.categoryId !== categoryId))
    }
    // Usunięcie kategorii nie usuwa samej konkurencji z zawodów.
    // Organizator może mieć wybraną konkurencję jeszcze bez żadnej kategorii.
    const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
    write(KEYS.tournament, { ...tournament, competitionIds: tournament.competitionIds || [] })
    regenerateScheduleInternal()
    emit()
  },
  setCategoryAthletesForClub: (categoryId, clubId, athleteIds) => {
    const category = read(KEYS.tournamentCategories, []).find((item) => item.id === categoryId)
    if (!category) throw new Error('Nie znaleziono kategorii.')
    const clubAthletes = new Set(read(KEYS.athletes, []).filter((athlete) => athlete.clubId === clubId).map((athlete) => athlete.id))
    const selected = new Set((athleteIds || []).filter((athleteId) => clubAthletes.has(athleteId)))
    const entries = read(KEYS.entries, [])
    const belongsToCategory = (entry) => entry.categoryId === categoryId || (entry.competitionId === category.competitionId && entry.category === category.name)
    const ownExisting = entries.filter((entry) => belongsToCategory(entry) && clubAthletes.has(entry.athleteId))
    const byAthlete = new Map(ownExisting.map((entry) => [entry.athleteId, entry]))
    const untouched = entries.filter((entry) => !belongsToCategory(entry) || !clubAthletes.has(entry.athleteId))
    const ownNext = [...selected].map((athleteId) => {
      const old = byAthlete.get(athleteId)
      return {
        ...(old || {}),
        id: old?.id || uid('entry'),
        athleteId,
        competitionId: category.competitionId,
        category: category.name,
        categoryId,
        status: old?.status || 'scheduled',
        createdAt: old?.createdAt || Date.now(),
      }
    })
    write(KEYS.entries, [...untouched, ...ownNext])
    write(KEYS.matches, read(KEYS.matches, []).filter((match) => !(match.categoryId === categoryId || (match.competitionId === category.competitionId && match.category === category.name))))
    write(KEYS.kataSessions, read(KEYS.kataSessions, []).filter((session) => session.categoryId !== categoryId))
    regenerateScheduleInternal()
    emit()
    return ownNext
  },
  setCategoryAthletes: (categoryId, athleteIds) => {
    const category = read(KEYS.tournamentCategories, []).find((item) => item.id === categoryId)
    if (!category) throw new Error('Nie znaleziono kategorii.')
    const selected = new Set(athleteIds || [])
    const entries = read(KEYS.entries, [])
    const existingForCategory = entries.filter((entry) => entry.categoryId === categoryId || (entry.competitionId === category.competitionId && entry.category === category.name))
    const byAthlete = new Map(existingForCategory.map((entry) => [entry.athleteId, entry]))
    const untouched = entries.filter((entry) => !(entry.categoryId === categoryId || (entry.competitionId === category.competitionId && entry.category === category.name)))
    const nextForCategory = [...selected].map((athleteId) => {
      const old = byAthlete.get(athleteId)
      return {
        ...(old || {}),
        id: old?.id || uid('entry'),
        athleteId,
        competitionId: category.competitionId,
        category: category.name,
        categoryId,
        status: old?.status || 'scheduled',
        createdAt: old?.createdAt || Date.now(),
      }
    })
    write(KEYS.entries, [...untouched, ...nextForCategory])
    // Zmiana składu kategorii unieważnia wcześniejsze losowanie tej kategorii.
    write(KEYS.matches, read(KEYS.matches, []).filter((match) => !(match.categoryId === categoryId || (match.competitionId === category.competitionId && match.category === category.name))))
    write(KEYS.kataSessions, read(KEYS.kataSessions, []).filter((session) => session.categoryId !== categoryId))
    regenerateScheduleInternal()
    emit()
    return nextForCategory
  },
  getClubs: () => read(KEYS.clubs, []),
  getClubForOwner: (ownerId) => read(KEYS.clubs, []).find((c) => c.ownerId === ownerId) || null,
  saveClub: (club) => {
    const clubs = read(KEYS.clubs, [])
    const next = { ...club, id: club.id || uid('club') }
    const idx = clubs.findIndex((c) => c.id === next.id)
    if (idx >= 0) clubs[idx] = next
    else clubs.push(next)
    write(KEYS.clubs, clubs)
    emit()
    return next
  },
  deleteClub: (clubId) => {
    const clubs = read(KEYS.clubs, [])
    const target = clubs.find((club) => club.id === clubId)
    if (!target) return null
    const athleteIds = new Set(read(KEYS.athletes, []).filter((athlete) => athlete.clubId === clubId).map((athlete) => athlete.id))
    write(KEYS.clubs, clubs.filter((club) => club.id !== clubId))
    write(KEYS.athletes, read(KEYS.athletes, []).filter((athlete) => athlete.clubId !== clubId))
    write(KEYS.entries, read(KEYS.entries, []).filter((entry) => !athleteIds.has(entry.athleteId)))
    // Skład zawodników się zmienił, więc istniejące losowania trzeba utworzyć ponownie.
    write(KEYS.matches, [])
    write(KEYS.kataSessions, [])
    regenerateScheduleInternal()
    emit()
    return target
  },
  getAthletes: () => read(KEYS.athletes, []),
  getAthletesForClub: (clubId) => read(KEYS.athletes, []).filter((a) => a.clubId === clubId),
  saveAthlete: (athlete) => {
    if (!['K', 'M'].includes(athlete.gender)) throw new Error('Wybierz płeć: Kobieta albo Mężczyzna.')
    const items = read(KEYS.athletes, [])
    const next = { ...athlete, id: athlete.id || uid('ath') }
    const idx = items.findIndex((a) => a.id === next.id)
    if (idx >= 0) items[idx] = next
    else items.push(next)
    write(KEYS.athletes, items)
    emit()
    return next
  },
  deleteAthlete: (id) => {
    write(KEYS.athletes, read(KEYS.athletes, []).filter((a) => a.id !== id))
    write(KEYS.entries, read(KEYS.entries, []).filter((e) => e.athleteId !== id))
    regenerateScheduleInternal()
    emit()
  },
  getEntries: () => read(KEYS.entries, []),
  saveEntry: (entry) => {
    const items = read(KEYS.entries, [])
    const next = { ...entry, id: entry.id || uid('entry'), createdAt: entry.createdAt || Date.now() }
    const idx = items.findIndex((e) => e.id === next.id)
    if (idx >= 0) items[idx] = next
    else items.push(next)
    write(KEYS.entries, items)
    regenerateScheduleInternal()
    emit()
    return read(KEYS.entries, []).find((e) => e.id === next.id) || next
  },
  deleteEntry: (id) => {
    write(KEYS.entries, read(KEYS.entries, []).filter((e) => e.id !== id))
    regenerateScheduleInternal()
    emit()
  },
  getSchedule: () => {
    const schedule = read(KEYS.schedule, [])
    if (!schedule.length && read(KEYS.entries, []).length) return regenerateScheduleInternal()
    return schedule
  },
  regenerateSchedule: () => { const next = regenerateScheduleInternal(); emit(); return next },
  updateScheduleSlot: (id, patch) => {
    const items = read(KEYS.schedule, [])
    const idx = items.findIndex((slot) => slot.id === id)
    if (idx < 0) return null
    const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
    const oldSlot = items[idx]
    if (patch.mat && patch.mat !== oldSlot.mat && oldSlot.categoryId) {
      db.assignCategoryMat(oldSlot.categoryId, normalizeMatName(patch.mat, tournament.matCount))
      const updated = read(KEYS.schedule, [])
      items.splice(0, items.length, ...updated)
    }
    const newIdx = items.findIndex((slot) => slot.id === id)
    if (newIdx < 0) throw new Error('Nie znaleziono pozycji harmonogramu po przypisaniu tatami.')
    items[newIdx] = {
      ...items[newIdx],
      ...patch,
      mat: patch.mat ? normalizeMatName(patch.mat, tournament.matCount) : items[newIdx].mat,
      manual: true,
      updatedAt: Date.now(),
    }
    write(KEYS.schedule, items)
    const next = regenerateScheduleInternal()
    emit()
    return next.find((slot) => slot.id === id) || null
  },
  resetScheduleSlotAuto: (id) => {
    const items = read(KEYS.schedule, [])
    const idx = items.findIndex((slot) => slot.id === id)
    if (idx < 0) return null
    const categoryId = items[idx]?.categoryId
    if (categoryId) {
      const categories = read(KEYS.tournamentCategories, [])
      const catIndex = categories.findIndex((category) => category.id === categoryId)
      if (catIndex >= 0 && categories[catIndex].preferredMat) {
        db.assignCategoryMat(categoryId, null)
        return read(KEYS.schedule, []).find((slot) => slot.id === id) || null
      }
    }
    items[idx] = { ...items[idx], manual: false, updatedAt: Date.now() }
    write(KEYS.schedule, items)
    const next = regenerateScheduleInternal()
    emit()
    return next.find((slot) => slot.id === id) || null
  },
  getLive: () => read(KEYS.live, null),
  setLive: (entryId) => { write(KEYS.live, entryId); emit('ika:live') },
  clearLive: () => { write(KEYS.live, null); emit('ika:live') },

  getTrainingGroups: () => read(KEYS.trainingGroups, []),
  saveTrainingGroup: (group) => {
    const items = read(KEYS.trainingGroups, [])
    const next = { ...group, id: group.id || uid('group') }
    const idx = items.findIndex((g) => g.id === next.id)
    if (idx >= 0) items[idx] = next
    else items.push(next)
    write(KEYS.trainingGroups, items)
    emit()
    return next
  },
  deleteTrainingGroup: (id) => { write(KEYS.trainingGroups, read(KEYS.trainingGroups, []).filter((g) => g.id !== id)); emit() },

  getNews: () => read(KEYS.news, []).sort((a, b) => `${b.date || ''}${b.createdAt || 0}`.localeCompare(`${a.date || ''}${a.createdAt || 0}`)),
  saveNewsItem: (item) => {
    const items = read(KEYS.news, [])
    const next = { ...item, id: item.id || uid('news'), createdAt: item.createdAt || Date.now() }
    const idx = items.findIndex((n) => n.id === next.id)
    if (idx >= 0) items[idx] = next
    else items.push(next)
    write(KEYS.news, items)
    emit()
    return next
  },
  deleteNewsItem: (id) => { write(KEYS.news, read(KEYS.news, []).filter((n) => n.id !== id)); emit() },

  getTournamentPodiums: () => buildTournamentPodiums(),
  getLiveRankings: () => buildLiveRankings(),
  getMatches: () => read(KEYS.matches, []),
  getMatchesForMat: (mat) => read(KEYS.matches, []).filter((m) => m.mat === mat),
  getMatStates: () => read(KEYS.matStates, {}),
  getMatState: (mat) => read(KEYS.matStates, {})[mat] || null,
  getCategoryAutoTransition: (mat) => autoTransitionSnapshot(read(KEYS.matStates, {})[mat]),
  processCategoryAutoTransition: (mat) => {
    const states = read(KEYS.matStates, {})
    const state = states[mat]
    const transition = state?.autoTransition
    if (!transition || state.breakActive || state.mode === 'break') return state || null
    // Ręczne przełączenie kategorii albo rozpoczęcie walki ma pierwszeństwo.
    if (!sameScheduledCategory(state, transition.from) ||
        !['podium', 'kata-final'].includes(state.mode)) return state
    const next = nextPreparedCategoryOnMat(mat, transition.from)
    if (!next) {
      if (!transition.next) return state
      // Usunięta drabinka/lista: anuluj nieaktualną zapowiedź.
      const cleared = { ...state, autoTransition: { ...transition, next: null, announceAt: null }, updatedAt: Date.now() }
      write(KEYS.matStates, { ...states, [mat]: cleared })
      emit()
      return cleared
    }
    const now = Date.now()
    if (!transition.next || !sameScheduledCategory(transition.next, next)) {
      const announceAt = Math.max(now, Number(transition.completedAt || now) + AUTO_CATEGORY_PODIUM_MS)
      const updated = { ...state, autoTransition: { ...transition, next, announceAt }, updatedAt: now }
      write(KEYS.matStates, { ...states, [mat]: updated })
      emit()
      return updated
    }
    const timer = autoTransitionSnapshot(state, now)
    if (!timer?.finished) return state
    // Nie przenoś panelu, gdy na tatami trwa inna aktywna walka.
    if (read(KEYS.matches, []).some((m) => m.mat === mat && m.status === 'active')) return state
    const destination = timer.next
    const updated = {
      ...state,
      mode: destination.mode, competitionId: destination.competitionId,
      category: destination.category, categoryId: destination.categoryId,
      kataSessionId: destination.kataSessionId, currentMatchId: null,
      lastCompletedMatchId: null, podiumShownAt: null, kataCategoryCompleted: false,
      kataFinalAthleteId: null, kataFinalShownAt: null,
      autoTransition: null, transitionAuto: true, updatedAt: now,
    }
    write(KEYS.matStates, { ...states, [mat]: updated })
    emit()
    return updated
  },
  setMatState: (mat, patch) => { const next = setMatStateInternal(mat, patch); emit(); return next },
  /* ETAP 86B - przerwa osobno na kazdym tatami */
  setMatBreakMode: (mat, enabled) => {
    const tournament = db.getTournament()
    const matCount = Math.max(1, Number(tournament?.matCount) || 1)
    const validMats = Array.from({ length: matCount }, (_, index) => `Tatami ${index + 1}`)
    if (!validMats.includes(mat)) throw new Error('Nieprawidlowe tatami.')

    if (enabled && db.getMatches().some((match) => match.mat === mat && match.status === 'active' && match.timerRunning)) {
      throw new Error('Najpierw zatrzymaj zegar aktywnej walki na tym tatami.')
    }
    const states = read(KEYS.matStates, {})
    const before = states[mat] || { mat }
    const isOnBreak = Boolean(before.breakActive || before.mode === 'break')
    if (isOnBreak === Boolean(enabled)) return before
    const previousMode = before.mode === 'break' ? (before.breakPreviousMode || 'bracket') : (before.mode || 'bracket')
    const pausedFor = !enabled && before.autoTransition?.pausedAt
      ? Math.max(0, Date.now() - Number(before.autoTransition.pausedAt)) : 0
    const nextAutoTransition = before.autoTransition ? {
      ...before.autoTransition,
      pausedAt: enabled ? Date.now() : null,
      announceAt: before.autoTransition.announceAt == null ? null : Number(before.autoTransition.announceAt) + pausedFor,
    } : before.autoTransition
    const next = {
      ...before,
      mat,
      breakActive: Boolean(enabled),
      breakPreviousMode: enabled ? previousMode : null,
      mode: enabled ? 'break' : previousMode,
      autoTransition: nextAutoTransition,
      updatedAt: Date.now(),
    }
    write(KEYS.matStates, { ...states, [mat]: next })
    emit()
    return next
  },

  getKataSessions: () => read(KEYS.kataSessions, []),
  getKataSession: (sessionId) => read(KEYS.kataSessions, []).find((session) => session.id === sessionId) || null,
  getKataSessionForCategory: (categoryId) => read(KEYS.kataSessions, []).find((session) => session.categoryId === categoryId) || null,
  generateKataStartList: ({ competitionId, category, mat, categoryId = null, judgeCount = 3, shuffle = true }) => {
    const entries = read(KEYS.entries, []).filter(
      (entry) => entry.competitionId === competitionId && entry.category === category && entry.mat === mat && (!categoryId || entry.categoryId === categoryId),
    )
    const athleteIds = [...new Set(entries.map((entry) => entry.athleteId).filter(Boolean))]
    if (!athleteIds.length) throw new Error('Dodaj co najmniej jednego zawodnika do kategorii kata.')
    if (shuffle) {
      for (let index = athleteIds.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[athleteIds[index], athleteIds[randomIndex]] = [athleteIds[randomIndex], athleteIds[index]]
      }
    }
    const count = Number(judgeCount) === 5 ? 5 : 3
    const sessions = read(KEYS.kataSessions, []).filter((session) => !(categoryId ? session.categoryId === categoryId : session.competitionId === competitionId && session.category === category && session.mat === mat))
    const next = {
      id: uid('kata'), competitionId, category, categoryId, mat, judgeCount: count,
      order: athleteIds, currentIndex: 0, currentAthleteId: athleteIds[0] || null, lastAthleteId: null,
      status: 'ready', phase: 'list', createdAt: Date.now(), completedAt: null,
      results: athleteIds.map((athleteId, index) => ({
        athleteId, order: index + 1, status: 'pending', kataName: '', scores: Array(count).fill(null), finalScore: null, rawTotal: null,
        countedIndexes: [], droppedIndexes: [], completedAt: null,
      })),
    }
    write(KEYS.kataSessions, [...sessions, next])
    if (!canPreserveMatSelection(mat, competitionId, category, categoryId)) {
      setMatStateInternal(mat, {
        mode: 'kata-list', competitionId, category, categoryId, kataSessionId: next.id,
        currentMatchId: null, kataFinalShownAt: null, kataFinalAthleteId: null, kataNextAthleteId: athleteIds[0] || null,
        autoTransition: null,
      })
    }
    emit()
    return next
  },
  setKataJudgeCount: (sessionId, judgeCount) => {
    const sessions = read(KEYS.kataSessions, [])
    const index = sessions.findIndex((session) => session.id === sessionId)
    if (index < 0) return null
    const count = Number(judgeCount) === 5 ? 5 : 3
    const session = sessions[index]
    if ((session.results || []).some((result) => result.status === 'done')) throw new Error('Nie można zmienić liczby sędziów po zapisaniu pierwszej oceny.')
    const next = {
      ...session, judgeCount: count,
      results: (session.results || []).map((result) => ({ ...result, scores: Array(count).fill(null), countedIndexes: [], droppedIndexes: [] })),
    }
    sessions[index] = next
    write(KEYS.kataSessions, sessions)
    emit()
    return next
  },
  startKataAthlete: (sessionId) => {
    const sessions = read(KEYS.kataSessions, [])
    const index = sessions.findIndex((session) => session.id === sessionId)
    if (index < 0) return null
    const session = sessions[index]
    const resultIndex = (session.results || []).findIndex((result, idx) => idx >= Number(session.currentIndex || 0) && result.status !== 'done')
    const fallbackIndex = (session.results || []).findIndex((result) => result.status !== 'done')
    const currentIndex = resultIndex >= 0 ? resultIndex : fallbackIndex
    if (currentIndex < 0) throw new Error('Wszyscy zawodnicy w tej kategorii zostali już ocenieni.')
    const current = session.results[currentIndex]
    const results = session.results.map((result, idx) => idx === currentIndex ? { ...result, status: 'active' } : result.status === 'active' ? { ...result, status: 'pending' } : result)
    const next = { ...session, results, currentIndex, currentAthleteId: current.athleteId, status: 'active', phase: 'athlete' }
    sessions[index] = next
    write(KEYS.kataSessions, sessions)
    setMatStateInternal(session.mat, {
      mode: 'kata-athlete', competitionId: session.competitionId, category: session.category, categoryId: session.categoryId || null,
      kataSessionId: session.id, kataFinalShownAt: null, kataFinalAthleteId: null, kataNextAthleteId: current.athleteId,
    })
    emit()
    return next
  },
  kataWhistle: (sessionId) => {
    const sessions = read(KEYS.kataSessions, [])
    const index = sessions.findIndex((session) => session.id === sessionId)
    if (index < 0) return null
    const session = sessions[index]
    const current = session.results?.[session.currentIndex]
    if (!current || current.status === 'done') throw new Error('Najpierw wybierz zawodnika do oceny.')
    const next = { ...session, status: 'active', phase: 'scores', currentAthleteId: current.athleteId }
    sessions[index] = next
    write(KEYS.kataSessions, sessions)
    setMatStateInternal(session.mat, {
      mode: 'kata-scores', competitionId: session.competitionId, category: session.category, categoryId: session.categoryId || null,
      kataSessionId: session.id, kataCurrentAthleteId: current.athleteId, kataScoresShownAt: Date.now(),
    })
    emit()
    return next
  },
  updateKataName: (sessionId, kataName) => {
    const sessions = read(KEYS.kataSessions, [])
    const index = sessions.findIndex((session) => session.id === sessionId)
    if (index < 0) return null
    const session = sessions[index]
    const currentIndex = Number(session.currentIndex || 0)
    const result = session.results?.[currentIndex]
    if (!result || result.status === 'done') return session
    const cleanName = String(kataName || '').slice(0, 80)
    const results = session.results.map((item, idx) => idx === currentIndex ? { ...item, kataName: cleanName } : item)
    const next = { ...session, results }
    sessions[index] = next
    write(KEYS.kataSessions, sessions)
    setMatStateInternal(session.mat, {
      kataSessionId: session.id,
      kataCurrentAthleteId: result.athleteId,
      kataName: cleanName,
    })
    emit()
    return next
  },
  updateKataJudgeScore: (sessionId, judgeIndex, value) => {
    const sessions = read(KEYS.kataSessions, [])
    const index = sessions.findIndex((session) => session.id === sessionId)
    if (index < 0) return null
    const session = sessions[index]
    const currentIndex = Number(session.currentIndex || 0)
    const result = session.results?.[currentIndex]
    if (!result || result.status === 'done') return session
    const scoreIndex = Number(judgeIndex)
    if (scoreIndex < 0 || scoreIndex >= Number(session.judgeCount || 3)) return session
    const score = value === '' || value == null ? null : String(value).replace(',', '.')
    const scores = [...(result.scores || Array(session.judgeCount).fill(null))]
    scores[scoreIndex] = score
    const results = session.results.map((item, idx) => idx === currentIndex ? { ...item, scores } : item)
    const next = { ...session, results, phase: 'scores' }
    sessions[index] = next
    write(KEYS.kataSessions, sessions)
    setMatStateInternal(session.mat, { mode: 'kata-scores', kataSessionId: session.id, kataCurrentAthleteId: result.athleteId })
    emit()
    return next
  },
  finalizeKataScore: (sessionId) => {
    const sessions = read(KEYS.kataSessions, [])
    const index = sessions.findIndex((session) => session.id === sessionId)
    if (index < 0) return null
    const session = sessions[index]
    const currentIndex = Number(session.currentIndex || 0)
    const result = session.results?.[currentIndex]
    if (!result) return null
    const calculation = calculateKataFinalScore(result.scores, session.judgeCount)
    if (!calculation) throw new Error(`Wpisz oceny wszystkich ${session.judgeCount} sędziów.`)
    const completedResult = { ...result, ...calculation, status: 'done', completedAt: Date.now() }
    const results = session.results.map((item, idx) => idx === currentIndex ? completedResult : item)
    const nextIndex = results.findIndex((item, idx) => idx > currentIndex && item.status !== 'done')
    const fallbackIndex = results.findIndex((item) => item.status !== 'done')
    const pendingIndex = nextIndex >= 0 ? nextIndex : fallbackIndex
    const hasNext = pendingIndex >= 0
    const nextAthleteId = hasNext ? results[pendingIndex].athleteId : null
    const now = Date.now()
    const next = {
      ...session, results, lastAthleteId: result.athleteId,
      currentIndex: hasNext ? pendingIndex : currentIndex, currentAthleteId: nextAthleteId,
      status: hasNext ? 'active' : 'completed', phase: hasNext ? 'transition' : 'completed',
      completedAt: hasNext ? null : now,
    }
    sessions[index] = next
    write(KEYS.kataSessions, sessions)
    setMatStateInternal(session.mat, {
      mode: 'kata-final', competitionId: session.competitionId, category: session.category, categoryId: session.categoryId || null,
      kataSessionId: session.id, kataFinalAthleteId: result.athleteId, kataFinalShownAt: now, kataNextAthleteId: nextAthleteId,
      kataCategoryCompleted: !hasNext,
      autoTransition: !hasNext ? {
        from: { competitionId: session.competitionId, category: session.category, categoryId: session.categoryId || null },
        completedAt: now, next: null, announceAt: null,
      } : null,
    })
    emit()
    return next
  },
  showKataList: (sessionId) => {
    const session = read(KEYS.kataSessions, []).find((item) => item.id === sessionId)
    if (!session) return null
    setMatStateInternal(session.mat, {
      mode: 'kata-list', competitionId: session.competitionId, category: session.category, categoryId: session.categoryId || null,
      kataSessionId: session.id, kataNextAthleteId: session.currentAthleteId || null,
    })
    emit()
    return session
  },
  resetKataSession: (sessionId) => {
    const sessions = read(KEYS.kataSessions, [])
    const target = sessions.find((session) => session.id === sessionId)
    write(KEYS.kataSessions, sessions.filter((session) => session.id !== sessionId))
    if (target) setMatStateInternal(target.mat, { mode: 'kata-list', competitionId: target.competitionId, category: target.category, categoryId: target.categoryId || null, kataSessionId: null })
    emit()
  },

  generateBracket: ({ competitionId, category, mat, categoryId = null, shuffle = true }) => {
    const entries = read(KEYS.entries, []).filter(
      (e) => e.competitionId === competitionId && e.category === category && e.mat === mat && (!categoryId || e.categoryId === categoryId),
    )
    const athleteIds = [...new Set(entries.map((e) => e.athleteId).filter(Boolean))]
    if (athleteIds.length < 2) throw new Error('Do utworzenia drabinki kumite potrzeba co najmniej 2 zawodników.')
    if (athleteIds.length > MAX_BRACKET_ATHLETES) throw new Error(`Jedna drabinka może mieć maksymalnie ${MAX_BRACKET_ATHLETES} zawodników.`)

    if (shuffle) {
      for (let i = athleteIds.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[athleteIds[i], athleteIds[j]] = [athleteIds[j], athleteIds[i]]
      }
    }

    const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
    const categoryRecord = read(KEYS.tournamentCategories, []).find((item) =>
      item.id === categoryId || (item.competitionId === competitionId && item.name === category)
    )
    const categoryBoutSeconds = getCategoryBoutSeconds(categoryRecord, tournament)

    const allMatches = read(KEYS.matches, []).filter(
      (m) => !(m.competitionId === competitionId && m.category === category && m.mat === mat),
    )
    const created = []
    let queueOrder = 1
    let roundIndex = 0
    let slots = []
    const openingPlan = planOpeningRound(athleteIds)
    const { bracketSize } = openingPlan

    // Dla niepełnej potęgi 2 powstaje wyłącznie tyle REALNYCH walk
    // wstępnych, ile jest konieczne. Wolne losy są rozłożone równomiernie
    // w teoretycznej pierwszej rundzie i od razu przechodzą do kolejnej.
    if (openingPlan.opening) {
      const prelimRoundId = uid('round')
      let prelimNo = 1
      slots = openingPlan.opening.map((slot) => {
        if (slot.type === 'bye') return { athleteId: slot.athleteId }
        const match = {
          id: uid('match'), competitionId, category, categoryId, mat, roundId: prelimRoundId, roundIndex,
          roundName: 'Runda wstępna', matchNo: prelimNo++, queueOrder: queueOrder++,
          bracketPosition: slot.position, bracketSize,
          redAthleteId: slot.redAthleteId, blueAthleteId: slot.blueAthleteId,
          redSourceMatchId: null, blueSourceMatchId: null, winnerId: null,
          redScore: 0, blueScore: 0, redPenaltyLevel: 0, bluePenaltyLevel: 0, redWazariCount: 0, redIpponCount: 0, blueWazariCount: 0, blueIpponCount: 0, redExitPenaltyLevel: 0, redBehaviorPenaltyLevel: 0, blueExitPenaltyLevel: 0, blueBehaviorPenaltyLevel: 0,
          boutSeconds: categoryBoutSeconds, status: 'scheduled',
        }
        created.push(match)
        return { sourceMatchId: match.id }
      })
      roundIndex += 1
    } else {
      slots = athleteIds.map((athleteId) => ({ athleteId }))
    }

    while (slots.length >= 2) {
      const thisRoundSlots = slots
      const roundId = uid('round')
      const name = roundName(thisRoundSlots.length)
      const nextSlots = []
      for (let i = 0; i < thisRoundSlots.length; i += 2) {
        const red = thisRoundSlots[i]
        const blue = thisRoundSlots[i + 1]
        const match = {
          id: uid('match'), competitionId, category, categoryId, mat, roundId, roundIndex,
          roundName: name, matchNo: i / 2 + 1, queueOrder: queueOrder++,
          bracketPosition: i / 2, bracketSize,
          redAthleteId: red?.athleteId || null, blueAthleteId: blue?.athleteId || null,
          redSourceMatchId: red?.sourceMatchId || null, blueSourceMatchId: blue?.sourceMatchId || null,
          winnerId: null, redScore: 0, blueScore: 0, redPenaltyLevel: 0, bluePenaltyLevel: 0, redWazariCount: 0, redIpponCount: 0, blueWazariCount: 0, blueIpponCount: 0, redExitPenaltyLevel: 0, redBehaviorPenaltyLevel: 0, blueExitPenaltyLevel: 0, blueBehaviorPenaltyLevel: 0,
          boutSeconds: categoryBoutSeconds, status: 'scheduled',
        }
        created.push(match)
        nextSlots.push({ sourceMatchId: match.id })
      }
      slots = nextSlots
      roundIndex += 1
    }

    write(KEYS.matches, [...allMatches, ...created])
    syncEntriesWithSchedule(read(KEYS.schedule, []))
    if (!canPreserveMatSelection(mat, competitionId, category, categoryId)) {
      setMatStateInternal(mat, { mode: 'bracket', competitionId, category, categoryId, currentMatchId: null, lastCompletedMatchId: null, autoTransition: null })
    }
    emit()
    return created
  },

  startMatch: (matchId) => {
    const matches = read(KEYS.matches, [])
    const raw = matches.find((m) => m.id === matchId)
    if (!raw) return null
    const match = resolveMatch(raw, matches)
    if (!match.redResolvedId || !match.blueResolvedId) throw new Error('Ta walka nie jest jeszcze gotowa - czeka na wynik wcześniejszej walki.')
    const tournament = db.getTournament()
    const categoryRecord = read(KEYS.tournamentCategories, []).find((item) =>
      item.id === raw.categoryId || (item.competitionId === raw.competitionId && item.name === raw.category)
    )
    const boutSeconds = Number(raw.boutSeconds) || getCategoryBoutSeconds(categoryRecord, tournament)
    const next = {
      ...raw,
      boutSeconds,
      status: 'active',
      redScore: raw.redScore || 0,
      blueScore: raw.blueScore || 0,
      timerRemaining: Number.isFinite(raw.timerRemaining) ? raw.timerRemaining : boutSeconds,
      // ETAP 55: rozpoczęcie walki przygotowuje tablicę, ale NIE uruchamia zegara.
      // Czas rusza dopiero po osobnym kliknięciu START CZASU w panelu sędziego.
      timerStartedAt: null,
      timerRunning: false,
    }
    matches.forEach((m, idx) => {
      if (m.mat === raw.mat && m.status === 'active' && m.id !== raw.id) matches[idx] = { ...m, status: 'scheduled', timerRunning: false, timerStartedAt: null }
    })
    const idx = matches.findIndex((m) => m.id === next.id)
    matches[idx] = next
    write(KEYS.matches, matches)
    setMatStateInternal(raw.mat, { mode: 'scoreboard', competitionId: raw.competitionId, category: raw.category, categoryId: raw.categoryId || null, currentMatchId: raw.id, autoTransition: null })
    emit()
    return next
  },

  pauseMatch: (matchId) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null
    const next = { ...match, timerRemaining: getComputedRemaining(match), timerRunning: false, timerStartedAt: null }
    saveMatchInternal(next)
    emit()
    return next
  },

  resumeMatch: (matchId) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null
    if (match.status !== 'active') throw new Error('Czas można uruchomić tylko podczas aktywnej walki.')
    const remaining = getComputedRemaining(match)
    if (remaining <= 0) throw new Error('Czas wynosi 00:00. Cofnij czas albo zresetuj zegar.')
    const next = { ...match, timerRemaining: remaining, timerRunning: true, timerStartedAt: Date.now() }
    saveMatchInternal(next)
    emit()
    return next
  },

  adjustMatchTime: (matchId, deltaSeconds) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null
    if (match.status !== 'active') throw new Error('Czas można korygować tylko podczas aktywnej walki.')
    const boutSeconds = Math.max(1, Number(match.boutSeconds || DEFAULT_TOURNAMENT.boutSeconds) || 1)
    const current = getComputedRemaining(match)
    const nextRemaining = Math.max(0, Math.min(boutSeconds, current + Number(deltaSeconds || 0)))
    const next = {
      ...match,
      timerRemaining: nextRemaining,
      timerStartedAt: match.timerRunning ? Date.now() : null,
    }
    saveMatchInternal(next)
    emit()
    return next
  },

  resetMatchTimer: (matchId) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null
    if (match.status !== 'active') throw new Error('Zegar można zresetować tylko podczas aktywnej walki.')
    const boutSeconds = Math.max(1, Number(match.boutSeconds || DEFAULT_TOURNAMENT.boutSeconds) || 1)
    const next = { ...match, timerRemaining: boutSeconds, timerRunning: false, timerStartedAt: null }
    saveMatchInternal(next)
    emit()
    return next
  },

  changePenalty: (matchId, side, type, level) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null

    if (match.status === 'done' || match.winnerId) {
      throw new Error('Walka została już zakończona. Nie można zmieniać kar.')
    }
    if (match.status !== 'active') {
      throw new Error('Kary można zmieniać tylko podczas aktywnej walki.')
    }

    const penaltyType = typeof type === 'number' && level === undefined ? 'exit' : String(type || 'exit')
    const requestedLevel = typeof type === 'number' && level === undefined ? type : level
    const nextLevel = Math.max(0, Math.min(4, Number(requestedLevel || 0)))
    const key = side === 'red'
      ? (penaltyType === 'behavior' ? 'redBehaviorPenaltyLevel' : 'redExitPenaltyLevel')
      : (penaltyType === 'behavior' ? 'blueBehaviorPenaltyLevel' : 'blueExitPenaltyLevel')

    const next = { ...match, [key]: nextLevel }
    next.redPenaltyLevel = Math.max(Number(next.redPenaltyLevel || 0), Number(next.redExitPenaltyLevel || 0), Number(next.redBehaviorPenaltyLevel || 0))
    next.bluePenaltyLevel = Math.max(Number(next.bluePenaltyLevel || 0), Number(next.blueExitPenaltyLevel || 0), Number(next.blueBehaviorPenaltyLevel || 0))
    saveMatchInternal(next)

    if (nextLevel === 4) {
      const resolved = resolveMatch(next, read(KEYS.matches, []))
      const winnerId = side === 'red' ? resolved.blueResolvedId : resolved.redResolvedId
      if (winnerId) {
        return db.finishMatch(matchId, winnerId, { automatic: true, reason: 'HANSOKU' })
      }
    }

    emit()
    return next
  },

  changeTechniqueScore: (matchId, side, technique, countDelta) => {
    if (!['red', 'blue'].includes(side) || !['wazari', 'ippon'].includes(technique) || ![-1, 1].includes(countDelta)) {
      throw new Error('Nieprawidlowa zmiana wyniku technicznego.')
    }
    const matches = read(KEYS.matches, [])
    const match = matches.find((item) => item.id === matchId)
    if (!match) return null
    if (match.status === 'done' || match.winnerId) {
      throw new Error('Walka zostala juz zakonczona. Nie mozna zmieniac punktow.')
    }
    if (match.status !== 'active') {
      throw new Error('Punkty mozna zmieniac tylko podczas aktywnej walki.')
    }

    const key = side + (technique === 'wazari' ? 'WazariCount' : 'IpponCount')
    const scoreKey = side === 'red' ? 'redScore' : 'blueScore'
    const awardedPoints = technique === 'wazari' ? 1 : 2
    const existingCount = Math.max(0, Math.floor(Number(match[key] || 0)))
    if (countDelta < 0 && !existingCount) return match
    const nextScore = Math.max(0, Number(match[scoreKey] || 0) + countDelta * awardedPoints)
    const next = {
      ...match,
      [key]: existingCount + countDelta,
      [scoreKey]: nextScore,
    }
    saveMatchInternal(next)

    if (countDelta > 0) {
      const competition = read(KEYS.competitions, []).find((item) => item.id === match.competitionId) || null
      const winRule = getKumiteWinRule(competition)
      if (winRule && nextScore >= winRule.targetScore) {
        const resolved = resolveMatch(next, read(KEYS.matches, []))
        const winnerId = side === 'red' ? resolved.redResolvedId : resolved.blueResolvedId
        if (winnerId) return db.finishMatch(matchId, winnerId, { automatic: true, reason: winRule.title })
      }
    }

    emit()
    return next
  },

  changeScore: (matchId, side, delta) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null

    // Po zakończeniu walki wynik jest zamknięty. Chroni to także przed
    // szybkim podwójnym kliknięciem, zmianą z innej karty albo urządzenia.
    if (match.status === 'done' || match.winnerId) {
      throw new Error('Walka została już zakończona. Nie można zmieniać punktów.')
    }
    if (match.status !== 'active') {
      throw new Error('Punkty można zmieniać tylko podczas aktywnej walki.')
    }
    if (![1, 2, -1, -2].includes(delta)) return match

    const key = side === 'red' ? 'redScore' : 'blueScore'
    const nextScore = Math.round((Math.max(0, Number(match[key] || 0) + delta) + Number.EPSILON) * 10) / 10
    const next = { ...match, [key]: nextScore }
    saveMatchInternal(next)

    // Zasady Shobu z Systemu Akademii w aktualnej skali punktów:
    // Ippon Shobu = 2 pkt, Nihon Shobu = 4 pkt, Sanbon Shobu = 6 pkt.
    // Po osiągnięciu progu walka kończy się natychmiast i zwycięzca
    // automatycznie przechodzi do kolejnej rundy.
    if (delta > 0) {
      const competition = read(KEYS.competitions, []).find((item) => item.id === match.competitionId) || null
      const winRule = getKumiteWinRule(competition)

      if (winRule && nextScore >= winRule.targetScore) {
        const resolved = resolveMatch(next, read(KEYS.matches, []))
        const winnerId = side === 'red' ? resolved.redResolvedId : resolved.blueResolvedId
        if (winnerId) {
          return db.finishMatch(matchId, winnerId, { automatic: true, reason: winRule.title })
        }
      }
    }

    emit()
    return next
  },

  finishMatch: (matchId, winnerId, options = {}) => {
    const matches = read(KEYS.matches, [])
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null
    if (match.status === 'done' || match.winnerId) return match
    const resolved = resolveMatch(match, matches)
    if (![resolved.redResolvedId, resolved.blueResolvedId].includes(winnerId)) throw new Error('Wybierz zwycięzcę tej walki.')
    const next = {
      ...match, winnerId, status: 'done', timerRemaining: getComputedRemaining(match), timerRunning: false, timerStartedAt: null, completedAt: Date.now(), automaticFinish: Boolean(options.automatic), finishReason: options.reason || null,
    }
    const idx = matches.findIndex((m) => m.id === matchId)
    matches[idx] = next
    write(KEYS.matches, matches)

    const categoryMatches = matches.filter((item) => {
      if (match.categoryId) return item.categoryId === match.categoryId && item.mat === match.mat
      return item.competitionId === match.competitionId && item.category === match.category && item.mat === match.mat
    })
    const maxRound = categoryMatches.length ? Math.max(...categoryMatches.map((item) => Number(item.roundIndex || 0))) : Number(match.roundIndex || 0)
    const categoryFinished = Number(match.roundIndex || 0) === maxRound && next.status === 'done'

    setMatStateInternal(match.mat, {
      mode: categoryFinished ? 'podium' : 'bracket',
      competitionId: match.competitionId,
      category: match.category,
      categoryId: match.categoryId || null,
      currentMatchId: null,
      lastCompletedMatchId: match.id,
      podiumShownAt: categoryFinished ? next.completedAt : null,
      autoTransition: categoryFinished ? {
        from: { competitionId: match.competitionId, category: match.category, categoryId: match.categoryId || null },
        completedAt: next.completedAt, next: null, announceAt: null,
      } : null,
    })
    emit()
    return next
  },

  resetBracket: ({ competitionId, category, mat }) => {
    write(KEYS.matches, read(KEYS.matches, []).filter((m) => !(m.competitionId === competitionId && m.category === category && m.mat === mat)))
    setMatStateInternal(mat, { mode: 'bracket', competitionId, category, currentMatchId: null, lastCompletedMatchId: null, autoTransition: null })
    emit()
  },

  parentLookup: (fullName) => buildParentLookup(fullName),
  parentLookupById: (athleteId) => buildParentLookupByAthleteId(athleteId),
  ensureAthleteStartNumbers: () => {
    const tournament = { ...DEFAULT_TOURNAMENT, ...read(KEYS.tournament, DEFAULT_TOURNAMENT) }
    const deadline = tournament.registrationDeadline ? new Date(tournament.registrationDeadline).getTime() : NaN
    if (!Number.isFinite(deadline) || deadline > Date.now()) {
      throw new Error('Identyfikatory są dostępne dopiero po zamknięciu zgłoszeń.')
    }

    const entries = read(KEYS.entries, [])
    const athletes = read(KEYS.athletes, [])
    const registeredIds = [...new Set(entries.map((entry) => entry.athleteId).filter(Boolean))]
      .sort((a, b) => {
        const aa = athletes.find((item) => item.id === a)
        const bb = athletes.find((item) => item.id === b)
        const an = `${aa?.lastName || ''} ${aa?.firstName || ''}`.trim()
        const bn = `${bb?.lastName || ''} ${bb?.firstName || ''}`.trim()
        return an.localeCompare(bn, 'pl')
      })

    const current = { ...(tournament.athleteStartNumbers || {}) }
    const used = new Set(Object.values(current).map((value) => Number(value)).filter(Number.isFinite))
    let nextNumber = 1
    let changed = false

    registeredIds.forEach((athleteId) => {
      if (current[athleteId]) return
      while (used.has(nextNumber)) nextNumber += 1
      current[athleteId] = nextNumber
      used.add(nextNumber)
      nextNumber += 1
      changed = true
    })

    if (changed || !tournament.athleteStartNumbers) {
      write(KEYS.tournament, { ...tournament, athleteStartNumbers: current })
      emit()
    }
    return current
  },
  publicTatamiLookup: (mat) => buildPublicTatamiLookup(mat),
}

export function buildParentLookup(fullName) {
  ensureSeed()
  const normalized = fullName.trim().toLocaleLowerCase('pl')
  if (!normalized) return []
  const queryTokens = normalized.split(/\s+/).filter(Boolean)
  const athletes = db.getAthletes().filter((a) => {
    const haystack = `${a.firstName} ${a.lastName}`.trim().toLocaleLowerCase('pl')
    return queryTokens.every((token) => haystack.includes(token))
  })
  const entries = db.getEntries()
  const comps = db.getCompetitions()
  const clubs = db.getClubs()
  const matches = db.getMatches()
  const matStates = db.getMatStates()
  const tournament = db.getTournament()

  return athletes.map((athlete) => ({
    athlete: {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      name: `${athlete.firstName} ${athlete.lastName}`,
      photo: athlete.photo || '',
      club: clubs.find((c) => c.id === athlete.clubId)?.name || '',
    },
    entries: entries
      .filter((e) => e.athleteId === athlete.id)
      .map((entry) => {
        const related = matches
          .filter((m) => m.competitionId === entry.competitionId && m.category === entry.category && m.mat === entry.mat)
          .sort((a, b) => a.queueOrder - b.queueOrder)
        const resolved = related.map((m) => resolveMatch(m, matches))
        const nextMatch = resolved.find((m) => m.status !== 'done' && [m.redResolvedId, m.blueResolvedId].includes(athlete.id)) || null
        const hasLost = resolved.some((m) => m.status === 'done' && [m.redResolvedId, m.blueResolvedId].includes(athlete.id) && m.winnerId !== athlete.id)
        const hasFinishedMatch = resolved.some((m) => m.status === 'done' && [m.redResolvedId, m.blueResolvedId].includes(athlete.id))
        let fightsRemaining = null
        let liveStatus = entry.status || 'scheduled'
        let liveLabel = 'Oczekuje'
        if (nextMatch) {
          fightsRemaining = related.filter((m) => m.status !== 'done' && m.queueOrder < nextMatch.queueOrder).length
          if (nextMatch.status === 'active') { fightsRemaining = 0; liveStatus = 'active'; liveLabel = 'Trwa teraz' }
          else if (fightsRemaining === 0) { liveStatus = 'called'; liveLabel = 'Następna walka' }
          else if (fightsRemaining <= 2) { liveStatus = 'called'; liveLabel = 'Przygotuj się' }
          else { liveStatus = 'scheduled'; liveLabel = 'Oczekuje' }
        } else if (hasLost || hasFinishedMatch || entry.status === 'done') {
          liveStatus = 'done'
          liveLabel = 'Zakończona'
        }

        const matState = matStates[entry.mat] || null
        const activeEntryOnMat = entries.find((e) => e.mat === entry.mat && e.status === 'active')
        const currentCompetitionId = matState?.competitionId || activeEntryOnMat?.competitionId
        const currentCategory = matState?.category || activeEntryOnMat?.category
        const currentCompetition = currentCompetitionId ? comps.find((c) => c.id === currentCompetitionId) : null
        let dynamicEstimate = entry.estimatedStart || ''
        let etaMinutes = null
        const today = new Date().toISOString().slice(0, 10)
        const scheduledProjection = entry.estimatedStart
          ? new Date(`${tournament.date}T${entry.estimatedStart}`).getTime()
          : 0

        if (Number.isInteger(fightsRemaining) && liveStatus !== 'active' && liveStatus !== 'done' && tournament.date === today && nextMatch) {
          const beforeOwnMatch = resolved.filter((m) =>
            m.status !== 'done' && Number(m.queueOrder || 0) < Number(nextMatch.queueOrder || 0)
          )
          const waitSeconds = beforeOwnMatch.reduce((sum, m) => {
            if (m.status === 'active') return sum + getComputedRemaining(m)
            return sum + Math.max(1, Number(m.boutSeconds || nextMatch.boutSeconds || tournament.boutSeconds || DEFAULT_TOURNAMENT.boutSeconds))
          }, 0)
          const liveProjection = Date.now() + waitSeconds * 1000
          const projection = Math.max(liveProjection, scheduledProjection || 0)
          dynamicEstimate = new Date(projection).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
          etaMinutes = Math.max(0, Math.ceil((projection - Date.now()) / 60000))
        } else if (liveStatus !== 'active' && liveStatus !== 'done' && scheduledProjection) {
          etaMinutes = Math.max(0, Math.ceil((scheduledProjection - Date.now()) / 60000))
        }
        if (liveStatus === 'active') {
          dynamicEstimate = 'TERAZ'
          etaMinutes = 0
        }

        return {
          ...entry,
          competitionName: comps.find((c) => c.id === entry.competitionId)?.name || 'Konkurencja',
          fightsRemaining,
          liveStatus,
          liveLabel,
          dynamicEstimate,
          etaMinutes,
          currentOnMat: currentCompetition ? `${currentCompetition.name}${currentCategory ? ` • ${currentCategory}` : ''}` : 'Brak aktywnej konkurencji',
        }
      })
      .sort((a, b) => (a.estimatedStart || '').localeCompare(b.estimatedStart || '')),
  }))
}



export function buildParentLookupByAthleteId(athleteId) {
  ensureSeed()
  const athlete = db.getAthletes().find((item) => item.id === athleteId)
  if (!athlete) return []
  return buildParentLookup(`${athlete.firstName} ${athlete.lastName}`)
    .filter((row) => row.athlete.id === athleteId)
}

export function buildPublicTatamiLookup(mat) {
  ensureSeed()
  const normalizedMat = String(mat || '').trim()
  if (!normalizedMat) return []

  const athletes = db.getAthletes()
  const entries = db.getEntries().filter((entry) => entry.mat === normalizedMat)
  const rows = []

  entries.forEach((entry) => {
    const athlete = athletes.find((item) => item.id === entry.athleteId)
    if (!athlete) return
    const lookup = buildParentLookup(`${athlete.firstName} ${athlete.lastName}`)
      .find((item) => item.athlete.id === athlete.id)
    const decorated = lookup?.entries.find((item) => item.id === entry.id)
    if (!decorated || decorated.liveStatus === 'done') return
    rows.push({ athlete: lookup.athlete, entry: decorated })
  })

  return rows
    .sort((a, b) => {
      if (a.entry.liveStatus === 'active' && b.entry.liveStatus !== 'active') return -1
      if (b.entry.liveStatus === 'active' && a.entry.liveStatus !== 'active') return 1
      const etaA = Number.isFinite(a.entry.etaMinutes) ? a.entry.etaMinutes : Number.MAX_SAFE_INTEGER
      const etaB = Number.isFinite(b.entry.etaMinutes) ? b.entry.etaMinutes : Number.MAX_SAFE_INTEGER
      return etaA - etaB || String(a.entry.dynamicEstimate || a.entry.estimatedStart || '').localeCompare(String(b.entry.dynamicEstimate || b.entry.estimatedStart || ''))
    })
    .slice(0, 20)
}

export function getLivePayload() {
  ensureSeed()
  const entryId = db.getLive()
  if (!entryId) return null
  const entry = db.getEntries().find((e) => e.id === entryId)
  if (!entry) return null
  const athlete = db.getAthletes().find((a) => a.id === entry.athleteId)
  if (!athlete) return null
  const club = db.getClubs().find((c) => c.id === athlete.clubId)
  const competition = db.getCompetitions().find((c) => c.id === entry.competitionId)
  return { entry, athlete, club, competition, tournament: db.getTournament() }
}

export function getTatamiPayload(mat) {
  ensureSeed()
  const matches = db.getMatchesForMat(mat).sort((a, b) => a.queueOrder - b.queueOrder)
  const state = db.getMatState(mat)
  const allMatches = db.getMatches()
  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const competitions = db.getCompetitions()
  const kataSessions = db.getKataSessions()
  const relevant = state?.competitionId
    ? matches.filter((m) => m.competitionId === state.competitionId && m.category === state.category)
    : matches
  const resolved = relevant.map((m) => resolveMatch(m, allMatches))
  let current = state?.currentMatchId ? resolved.find((m) => m.id === state.currentMatchId) : resolved.find((m) => m.status === 'active')
  /* ETAP 74: prezentacja zwyciezcy ostatniej walki */
  const lastCompletedMatch = state?.lastCompletedMatchId
    ? resolved.find((match) => match.id === state.lastCompletedMatchId && match.status === 'done' && match.winnerId)
    : null
  const winnerDisplayActive = Boolean(
    lastCompletedMatch && (!current || current.status !== 'active') &&
    Date.now() - Number(lastCompletedMatch.completedAt || 0) >= 0 &&
    Date.now() - Number(lastCompletedMatch.completedAt || 0) < 12000
  )
  const next = resolved.find((m) => m.status !== 'done' && m.redResolvedId && m.blueResolvedId) || null
  const hydrate = (id) => {
    const athlete = athletes.find((a) => a.id === id)
    const club = athlete ? clubs.find((c) => c.id === athlete.clubId) : null
    return athlete ? { ...athlete, clubName: club?.shortName || club?.name || '' } : null
  }
  const podium = buildTournamentPodiums().find((item) => {
    if (state?.categoryId) return item.categoryId === state.categoryId
    return item.competitionId === state?.competitionId && item.categoryName === state?.category && item.mat === mat
  }) || null

  const kataSession = (state?.kataSessionId ? kataSessions.find((session) => session.id === state.kataSessionId) : null)
    || kataSessions.find((session) => session.mat === mat && (!state?.competitionId || session.competitionId === state.competitionId) && (!state?.category || session.category === state.category))
    || null

  let displayMode = state?.mode || 'bracket'
  const autoNext = !state?.breakActive && displayMode !== 'break' ? autoTransitionSnapshot(state) : null
  if (winnerDisplayActive && (displayMode === 'bracket' || displayMode === 'podium')) {
    current = lastCompletedMatch
    displayMode = 'scoreboard'
  }
  if (state?.mode === 'kata-final' && kataSession) {
    const elapsed = Math.max(0, Date.now() - Number(state.kataFinalShownAt || Date.now()))
    if (elapsed < 5000) displayMode = 'kata-final'
    else if (elapsed < 9000) displayMode = 'kata-list'
    else displayMode = state.kataCategoryCompleted ? 'podium' : 'kata-athlete'
  }

  if (autoNext?.showing) displayMode = 'next-category'

  const kataResults = kataSession ? (kataSession.results || []).map((result) => ({
    ...result, athlete: hydrate(result.athleteId),
  })) : []
  const currentKataResult = kataSession
    ? kataResults.find((result) => result.athleteId === (displayMode === 'kata-final' ? state?.kataFinalAthleteId : kataSession.currentAthleteId)) || null
    : null
  const finalKataResult = kataSession ? kataResults.find((result) => result.athleteId === state?.kataFinalAthleteId) || null : null
  const nextKataResult = kataSession ? kataResults.find((result) => result.athleteId === (state?.kataNextAthleteId || kataSession.currentAthleteId)) || null : null

  return {
    mat,
    state,
    displayMode,
    autoNext,
    tournament: db.getTournament(),
    competition: competitions.find((c) => c.id === state?.competitionId) || null,
    matches: resolved,
    podium,
    kata: kataSession ? {
      session: kataSession,
      results: kataResults,
      currentResult: currentKataResult,
      finalResult: finalKataResult,
      nextResult: nextKataResult,
      judgeCount: kataSession.judgeCount || 3,
    } : null,
    currentMatch: current ? { ...current, redAthlete: hydrate(current.redResolvedId), blueAthlete: hydrate(current.blueResolvedId), remaining: getComputedRemaining(current) } : null,
    nextMatch: next ? { ...next, redAthlete: hydrate(next.redResolvedId), blueAthlete: hydrate(next.blueResolvedId) } : null,
  }
}
