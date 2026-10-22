export const MAX_BRACKET_ATHLETES = 128

export function nextBracketSize(count) {
  const value = Math.max(2, Math.ceil(Number(count) || 0))
  let size = 2
  while (size < value) size *= 2
  return size
}

// Rozkłada wolne losy możliwie równomiernie pomiędzy wszystkie pary
// teoretycznej pierwszej rundy. Dzięki temu BYE nie kumulują się w
// jednym fragmencie drabinki.
export function balancedByePositions(pairCount, byeCount) {
  const total = Math.max(0, Math.floor(Number(pairCount) || 0))
  const count = Math.max(0, Math.min(total, Math.floor(Number(byeCount) || 0)))
  if (!count) return []
  const positions = []
  const used = new Set()

  for (let index = 0; index < count; index += 1) {
    let position = Math.floor(((index + 0.5) * total) / count)
    position = Math.max(0, Math.min(total - 1, position))
    while (used.has(position) && position < total - 1) position += 1
    while (used.has(position) && position > 0) position -= 1
    used.add(position)
    positions.push(position)
  }

  return positions.sort((a, b) => a - b)
}

export function planOpeningRound(athleteIds = []) {
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (ids.length < 2) throw new Error('Do utworzenia drabinki kumite potrzeba co najmniej 2 zawodników.')
  if (ids.length > MAX_BRACKET_ATHLETES) {
    throw new Error(`Jedna drabinka może mieć maksymalnie ${MAX_BRACKET_ATHLETES} zawodników.`)
  }

  const bracketSize = nextBracketSize(ids.length)
  const pairCount = bracketSize / 2
  const byeCount = bracketSize - ids.length

  if (!byeCount) {
    return {
      bracketSize,
      byeCount: 0,
      pairCount,
      opening: null,
    }
  }

  const byeSet = new Set(balancedByePositions(pairCount, byeCount))
  const opening = []
  let cursor = 0

  for (let position = 0; position < pairCount; position += 1) {
    if (byeSet.has(position)) {
      opening.push({
        position,
        type: 'bye',
        athleteId: ids[cursor++],
      })
    } else {
      opening.push({
        position,
        type: 'match',
        redAthleteId: ids[cursor++],
        blueAthleteId: ids[cursor++],
      })
    }
  }

  if (cursor !== ids.length) throw new Error('Nie udało się poprawnie rozłożyć zawodników w drabince.')

  return {
    bracketSize,
    byeCount,
    pairCount,
    opening,
  }
}
