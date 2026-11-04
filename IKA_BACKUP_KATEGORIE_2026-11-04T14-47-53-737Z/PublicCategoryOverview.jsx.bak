import React, { useMemo, useState } from 'react'
import './PublicCategoryOverview.css'

const normalize = value => String(value || '').toLocaleLowerCase('pl').trim()
const sameCategory = (row, cat) => Boolean(row && cat) && (
  (row.categoryId && cat.id && row.categoryId === cat.id) ||
  (row.competitionId === cat.competitionId && (row.category || row.name) === cat.name)
)

function categoryStatus(cat, matches, sessions, entries) {
  const bouts = matches.filter(row => sameCategory(row, cat))
  const kata = sessions.filter(row => sameCategory(row, cat))
  const hasEntries = entries.some(row => sameCategory(row, cat))
  const isActive = bouts.some(row => row.status === 'active') ||
    kata.some(row => row.status === 'active' || row.phase === 'scores' && row.status !== 'completed')
  if (isActive) return 'active'
  const boutsCompleted = bouts.length > 0 && bouts.every(row => row.status === 'done')
  const kataCompleted = kata.length > 0 && kata.every(row => row.status === 'completed')
  if (boutsCompleted || kataCompleted) return 'done'
  const boutsStarted = bouts.some(row => row.status === 'done')
  const kataStarted = kata.some(row => (row.results || []).some(result => result.status === 'done') ||
    (row.preliminaryResults || []).some(result => result.status === 'done'))
  if (boutsStarted || kataStarted) return 'active'
  return hasEntries ? 'scheduled' : 'not-ready'
}

const statuses = {
  'scheduled': { label: 'Zaplanowana', order: 1 },
  'active': { label: 'W trakcie', order: 0 },
  'done': { label: 'Zakończona', order: 2 },
  'not-ready': { label: 'Brak zgłoszeń', order: 3 },
}

export default function PublicCategoryOverview({ data }) {
  const [mat, setMat] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const allMats = useMemo(() => Array.from(
    { length: Math.max(1, Number(data.tournament?.matCount) || 1) },
    (_, i) => `Tatami ${i + 1}`
  ), [data.tournament?.matCount])
  const competitions = useMemo(() => new Map((data.competitions || []).map(c => [c.id, c])), [data.competitions])
  const rows = useMemo(() => (data.categories || []).map(cat => {
    const slot = (data.schedule || []).find(row => sameCategory(row, cat))
    const bout = (data.matches || []).find(row => sameCategory(row, cat))
    const session = (data.sessions || []).find(row => sameCategory(row, cat))
    const resolvedMat = slot?.mat || cat.preferredMat || bout?.mat || session?.mat || 'Nieprzypisane'
    const state = categoryStatus(cat, data.matches || [], data.sessions || [], data.entries || [])
    const athleteIds = new Set((data.entries || []).filter(row => sameCategory(row, cat)).map(row => row.athleteId).filter(Boolean))
    const matches = (data.matches || []).filter(row => sameCategory(row, cat))
    const completed = matches.filter(row => row.status === 'done').length
    return {
      id: cat.id || `${cat.competitionId}|${cat.name}`,
      name: cat.name,
      competition: competitions.get(cat.competitionId)?.name || 'Konkurencja',
      mat: resolvedMat,
      start: slot?.startTime || '',
      athletes: athleteIds.size,
      status: state,
      progress: matches.length ? `${completed}/${matches.length} walk` : null,
    }
  }).sort((a, b) => statuses[a.status].order - statuses[b.status].order ||
    a.mat.localeCompare(b.mat, 'pl', { numeric: true }) ||
    a.start.localeCompare(b.start) || a.name.localeCompare(b.name, 'pl')), [data.categories, data.schedule, data.matches, data.sessions, data.entries, data.competitions, competitions])

  const filtered = rows.filter(row =>
    (mat === 'all' || row.mat === mat) &&
    (status === 'all' || row.status === status) &&
    normalize(`${row.name} ${row.competition} ${row.mat}`).includes(normalize(query))
  )

  return (
    <section className="ika-public-categories" aria-labelledby="ika-public-categories-title">
      <div className="ika-public-categories-heading">
        <div>
          <span>PROGRAM ZAWODÓW</span>
          <h2 id="ika-public-categories-title">Kategorie i tatami</h2>
          <p>Wszystkie kategorie turnieju: zaplanowane, rozgrywane i zakończone. Statusy aktualizują się automatycznie.</p>
        </div>
        <strong>{rows.length} kategorii</strong>
      </div>
      <div className="ika-public-categories-legend" aria-label="Legenda kolorów">
        {Object.entries(statuses).map(([key, item]) => <span className={`ika-category-tag status-${key}`} key={key}>{item.label}</span>)}
      </div>
      <div className="ika-public-categories-filters">
        <label>Wyszukaj kategorię
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Kata, kumite, fantom..." />
        </label>
        <label>Tatami
          <select value={mat} onChange={e => setMat(e.target.value)}>
            <option value="all">Wszystkie tatami</option>
            {allMats.map(item => <option value={item} key={item}>{item}</option>)}
            {rows.some(row => row.mat === 'Nieprzypisane') && <option value="Nieprzypisane">Nieprzypisane</option>}
          </select>
        </label>
        <label>Status
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">Wszystkie statusy</option>
            {Object.entries(statuses).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="ika-public-categories-list">
        {filtered.map(row => (
          <article className={`ika-public-category-row status-${row.status}`} key={row.id}>
            <div className="ika-public-category-main">
              <strong>{row.name}</strong>
              <span>{row.competition}</span>
            </div>
            <div className="ika-public-category-meta">
              <span>{row.mat}</span>
              {row.start && <span>Planowany start: {row.start}</span>}
              <span>{row.athletes} zawodników</span>
              {row.progress && <span>{row.progress}</span>}
            </div>
            <span className={`ika-category-tag status-${row.status}`}>{statuses[row.status].label}</span>
          </article>
        ))}
        {!filtered.length && <p className="ika-public-category-empty">Brak kategorii spełniających wybrane kryteria.</p>}
      </div>
    </section>
  )
}
