import { balancedByePositions, nextBracketSize } from './bracketUtils.js'

/* ETAP 90 - losowanie kumite z rozstawieniem klubowym.
   Kazdy zawodnik wystepuje dokladnie raz, BYE sa zachowane.
   Najpierw minimalizujemy walki klubowe w pierwszej rzeczywistej rundzie,
   potem stopniowo w dalszych rundach (o ile pozwala drabinka).
   Nie mozna zagwarantowac braku walk klubowych az do finalu. */

const shuffleInPlace = (items, random) => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(random() * (i + 1)))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

// Te sloty sa w takiej samej kolejnosci jak w planOpeningRound.
// Numer w kazdym slocie jest indeksem zawodnika w ostatecznej kolejnosci.
function openingSeatGroups(athleteCount) {
  const size = nextBracketSize(athleteCount)
  const pairCount = size / 2
  const byeCount = size - athleteCount
  if (!byeCount) return Array.from({ length: athleteCount }, (_, index) => [index])
  const byes = new Set(balancedByePositions(pairCount, byeCount))
  const seats = []
  let cursor = 0
  for (let position = 0; position < pairCount; position += 1) {
    if (byes.has(position)) seats.push([cursor++])
    else seats.push([cursor++, cursor++])
  }
  if (cursor !== athleteCount) throw new Error('Blad pozycji startowych drabinki.')
  return seats
}

// Zwraca tablice ocen uporzadkowana wg waznosci: 
// rzeczywiste walki rundy wstepnej, potem możliwe spotkania w 1/8, 1/4 ...
function collisionVector(ordered, clubByAthlete, slots, byeCount) {
  const groups = []
  let preliminary = 0
  const byesPerClub = new Map()
  for (const indices of slots) {
    const counts = new Map()
    for (const index of indices) {
      const club = clubByAthlete.get(ordered[index])
      counts.set(club, (counts.get(club) || 0) + 1)
    }
    if (indices.length === 2 && counts.size === 1) preliminary += 1
    if (indices.length === 1) {
      const club = clubByAthlete.get(ordered[indices[0]])
      byesPerClub.set(club, (byesPerClub.get(club) || 0) + 1)
    }
    groups.push(counts)
  }

  const vector = []
  if (byeCount) vector.push(preliminary)
  while (groups.length > 1) {
    let collision = 0
    const next = []
    for (let index = 0; index < groups.length; index += 2) {
      const left = groups[index]
      const right = groups[index + 1]
      const merged = new Map(left)
      for (const [club, count] of right) {
        collision += (left.get(club) || 0) * count
        merged.set(club, (merged.get(club) || 0) + count)
      }
      next.push(merged)
    }
    vector.push(collision)
    groups.splice(0, groups.length, ...next)
  }

  // Przy takich samych zderzeniach preferuj proporcjonalne przydzielanie BYE.
  // Jest to kryterium pomocnicze, nie moze psuc rozdzielenia klubow.
  if (byeCount) {
    const originalCounts = new Map()
    for (const id of ordered) {
      const club = clubByAthlete.get(id)
      originalCounts.set(club, (originalCounts.get(club) || 0) + 1)
    }
    let imbalance = 0
    for (const [club, count] of originalCounts) {
      const awarded = byesPerClub.get(club) || 0
      const deviation = awarded * ordered.length - byeCount * count
      imbalance += deviation * deviation
    }
    vector.push(imbalance)
  }
  return vector
}

function isBetter(left, right) {
  if (!right) return true
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) return true
    if (left[index] > right[index]) return false
  }
  return false
}

// Algorytm najpierw dobiera do walk wstepnych zawodnikow z roznych klubow
// (tam, gdzie to mozliwe), a dopiero potem przydziela wolne losy.
function makeStartOrder(ids, clubByAthlete, slots, random) {
  const groups = new Map()
  for (const id of ids) {
    const club = clubByAthlete.get(id)
    if (!groups.has(club)) groups.set(club, [])
    groups.get(club).push(id)
  }
  for (const members of groups.values()) shuffleInPlace(members, random)

  const chooseClub = (except = null) => {
    const available = [...groups.entries()]
      .filter(([club, members]) => club !== except && members.length)
    if (!available.length) return null
    const maxCount = Math.max(...available.map(([, members]) => members.length))
    const candidates = available.filter(([, members]) => members.length === maxCount)
    return candidates[Math.floor(random() * candidates.length)]?.[0] || null
  }
  const takeOne = (exclude = null) => {
    const preferred = chooseClub(exclude)
    const club = preferred || chooseClub()
    if (!club) throw new Error('Zabraklo zawodnikow podczas losowania.')
    return groups.get(club).pop()
  }

  const matchPairs = []
  const twoPersonSeats = slots.filter((indices) => indices.length === 2).length
  // Gdy sa BYE, walki wstepne musza miec pary z roznych klubow.
  // Gdy nie ma BYE, tworzymy w ten sposob pary pierwszej rundy.
  const pairCount = twoPersonSeats || ids.length / 2
  for (let index = 0; index < pairCount; index += 1) {
    const first = takeOne()
    const second = takeOne(clubByAthlete.get(first))
    matchPairs.push(random() < 0.5 ? [first, second] : [second, first])
  }
  shuffleInPlace(matchPairs, random)
  const remaining = [...groups.values()].flat()
  shuffleInPlace(remaining, random)

  const output = Array(ids.length)
  if (!twoPersonSeats) {
    for (let index = 0; index < matchPairs.length; index += 1) {
      output[2 * index] = matchPairs[index][0]
      output[2 * index + 1] = matchPairs[index][1]
    }
  } else {
    let pairCursor = 0
    let byeCursor = 0
    for (const indices of slots) {
      if (indices.length === 1) output[indices[0]] = remaining[byeCursor++]
      else {
        const pair = matchPairs[pairCursor++]
        output[indices[0]] = pair[0]
        output[indices[1]] = pair[1]
      }
    }
  }
  return output
}

/**
 * Rozstaw zawodnikow kumite wg klubu. Losowosc jest zachowana: kazde ponowne
 * losowanie moze dac inna drabinke, ale unika wczesnych pojedynkow klubowych.
 * Brak numeru klubu oznacza osobne pochodzenie, nie tworzy fikcyjnego klubu.
 *
 * @param {string[]} athleteIds
 * @param {Map<string,string>} clubsByAthleteId
 * @param {() => number} random
 * @returns {string[]}
 */
export function seedBracketByClub(athleteIds, clubsByAthleteId = new Map(), random = Math.random) {
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (ids.length < 2) return ids
  const slots = openingSeatGroups(ids.length)
  const byeCount = nextBracketSize(ids.length) - ids.length
  const clubByAthlete = new Map(ids.map((id) => {
    const clubId = String(clubsByAthleteId.get(id) || '').trim()
    return [id, clubId ? `club:${clubId}` : `unknown:${id}`]
  }))

  const counts = new Map()
  for (const id of ids) {
    const club = clubByAthlete.get(id)
    counts.set(club, (counts.get(club) || 0) + 1)
  }
  // Brak konfliktow klubowych - zwykle losowanie wystarczy.
  if (Math.max(...counts.values()) <= 1 || counts.size === 1) {
    return shuffleInPlace(ids, random)
  }

  const slotMembership = ids.map(() => -1)
  const similarSlots = new Map()
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const indices = slots[slotIndex]
    if (!similarSlots.has(indices.length)) similarSlots.set(indices.length, [])
    similarSlots.get(indices.length).push(indices)
    for (const index of indices) slotMembership[index] = slotIndex
  }

  const attempts = ids.length > 64 ? 4 : ids.length > 32 ? 5 : 7
  const iterations = ids.length > 64 ? 1300 : ids.length > 32 ? 1800 : 1800
  let best = null
  let bestVector = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let order = makeStartOrder(ids, clubByAthlete, slots, random)
    let score = collisionVector(order, clubByAthlete, slots, byeCount)
    if (isBetter(score, bestVector)) {
      best = [...order]
      bestVector = score
    }

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const candidate = [...order]
      if (random() < 0.28) {
        // Zamiana calych par lub BYE zachowuje bezpieczne walki wstepne.
        const sameSize = random() < 0.55 ? 2 : 1
        const choices = similarSlots.get(sameSize) || []
        if (choices.length < 2) continue
        const from = Math.floor(random() * choices.length)
        let to = Math.floor(random() * (choices.length - 1))
        if (to >= from) to += 1
        const a = choices[from]
        const b = choices[to]
        for (let position = 0; position < a.length; position += 1) {
          ;[candidate[a[position]], candidate[b[position]]] = [candidate[b[position]], candidate[a[position]]]
        }
      } else {
        const from = Math.floor(random() * ids.length)
        let to = Math.floor(random() * (ids.length - 1))
        if (to >= from) to += 1
        if (from === to) continue
        ;[candidate[from], candidate[to]] = [candidate[to], candidate[from]]
      }
      const nextScore = collisionVector(candidate, clubByAthlete, slots, byeCount)
      if (isBetter(nextScore, score)) {
        order = candidate
        score = nextScore
        if (isBetter(score, bestVector)) {
          best = [...order]
          bestVector = score
        }
      }
    }
  }
  return best || shuffleInPlace(ids, random)
}
