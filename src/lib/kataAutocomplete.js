// ETAP 93: szybkie podpowiedzi nazw kata podczas pisania.
// Wyświetlamy unikalne nazwy oraz style, w których występują.
export function normalizeKataSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function searchKataCatalog(query, groups = [], maxResults = 9) {
  const normalizedQuery = normalizeKataSearch(query)
  if (!normalizedQuery) return []

  const unique = new Map()
  for (const group of groups) {
    for (const name of group.names || []) {
      const key = normalizeKataSearch(name)
      if (!key) continue
      if (!unique.has(key)) unique.set(key, { name, styles: [] })
      const item = unique.get(key)
      if (group.style && !item.styles.includes(group.style)) item.styles.push(group.style)
    }
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  return [...unique.values()]
    .filter((item) => {
      const haystack = normalizeKataSearch(`${item.name} ${item.styles.join(' ')}`)
      return tokens.every((token) => haystack.includes(token))
    })
    .sort((left, right) => {
      const rank = (item) => {
        const name = normalizeKataSearch(item.name)
        if (name === normalizedQuery) return 0
        if (name.startsWith(normalizedQuery)) return 1
        if (name.split(' ').some((part) => part.startsWith(normalizedQuery))) return 2
        if (name.includes(normalizedQuery)) return 3
        return 4
      }
      return rank(left) - rank(right) || left.name.localeCompare(right.name, 'pl')
    })
    .slice(0, Math.max(1, Math.min(30, Number(maxResults) || 9)))
}
