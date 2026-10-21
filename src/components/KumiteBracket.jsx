import React, { useMemo } from 'react'
import { resolveMatch } from '../lib/demoStore'

const scoreText = (value) => String(Number(value || 0)).replace('.', ',')

function boutCode(roundName, matchNo, queueOrder) {
  if (roundName === 'Ćwierćfinał') return `ĆF${matchNo}`
  if (roundName === 'Półfinał') return `PF${matchNo}`
  if (roundName === 'Finał') return 'F'
  if (roundName === '1/8 finału') return `1/8-${matchNo}`
  if (roundName === '1/16 finału') return `1/16-${matchNo}`
  return `W${queueOrder || matchNo}`
}

function statusLabel(match) {
  if (match.status === 'active') return 'AKTUALNA'
  if (match.status === 'done') return 'ZAKOŃCZONA'
  if (match.redResolvedId && match.blueResolvedId) return 'GOTOWA'
  return 'OCZEKUJE'
}

export default function KumiteBracket({
  matches = [],
  athletes = [],
  clubs = [],
  sideTheme,
  variant = 'panel',
  highlightMatchId = null,
}) {
  const resolved = useMemo(
    () => matches.map((match) => resolveMatch(match, matches)),
    [matches],
  )

  const rounds = useMemo(() => {
    const map = new Map()
    resolved.forEach((match) => {
      const key = `${match.roundIndex}-${match.roundName}`
      if (!map.has(key)) {
        map.set(key, {
          index: Number(match.roundIndex || 0),
          name: match.roundName,
          matches: [],
        })
      }
      map.get(key).matches.push(match)
    })

    return [...map.values()]
      .map((round) => ({
        ...round,
        matches: round.matches.sort((a, b) => Number(a.matchNo || 0) - Number(b.matchNo || 0)),
      }))
      .sort((a, b) => a.index - b.index)
  }, [resolved])

  const gridRows = useMemo(() => {
    if (!rounds.length) return 2
    return Math.max(
      2,
      ...rounds.map((round) => round.matches.length * 2 ** (round.index + 1)),
    )
  }, [rounds])

  const athleteInfo = (id) => {
    const athlete = athletes.find((item) => item.id === id)
    if (!athlete) return { name: 'Oczekiwanie na zwycięzcę', club: '' }
    const club = clubs.find((item) => item.id === athlete.clubId)
    return {
      name: `${athlete.firstName} ${athlete.lastName}`,
      club: club?.shortName || club?.name || '',
    }
  }

  const leftLabel = sideTheme?.red?.code || 'AKA'
  const rightLabel = sideTheme?.blue?.code || (sideTheme?.mode === 'red-white' ? 'SHIRO' : 'AO')
  const rightColorClass = sideTheme?.mode === 'red-white' ? 'shiro' : 'ao'

  if (!rounds.length) return null

  return (
    <div
      className={`academy-bracket academy-bracket-${variant}`}
      style={{ '--academy-bracket-rows': gridRows }}
    >
      {rounds.map((round, roundPosition) => {
        const span = 2 ** (round.index + 1)
        const isLastRound = roundPosition === rounds.length - 1
        const completed = round.matches.filter((match) => match.status === 'done').length

        return (
          <section className="academy-bracket-round" key={`${round.index}-${round.name}`}>
            <header className="academy-bracket-round-head">
              <div>
                <span>{round.name}</span>
                <strong>{round.name}</strong>
              </div>
              <em>{completed}/{round.matches.length}</em>
            </header>

            <div className="academy-bracket-round-grid">
              {round.matches.map((match, matchIndex) => {
                const rowStart = (Number(match.matchNo || matchIndex + 1) - 1) * span + 1
                const red = athleteInfo(match.redResolvedId)
                const blue = athleteInfo(match.blueResolvedId)
                const redWinner = Boolean(match.winnerId && match.winnerId === match.redResolvedId)
                const blueWinner = Boolean(match.winnerId && match.winnerId === match.blueResolvedId)
                const pairTop = matchIndex % 2 === 0
                const isHighlighted = Boolean(highlightMatchId && match.id === highlightMatchId)

                return (
                  <div
                    className={`academy-bracket-slot ${pairTop ? 'pair-top' : 'pair-bottom'} ${isLastRound ? 'last-round' : ''}`}
                    style={{ gridRow: `${rowStart} / span ${span}` }}
                    key={match.id}
                  >
                    {roundPosition > 0 && <i className="academy-bracket-connector-in" aria-hidden="true" />}
                    <article
                      className={`academy-bracket-match academy-bracket-match-${match.status} ${isHighlighted ? 'academy-bracket-match-next' : ''}`}
                      data-match-id={match.id}
                    >
                      <div className="academy-bracket-match-head">
                        <span>{boutCode(round.name, match.matchNo, match.queueOrder)}</span>
                        <em>{isHighlighted ? 'NASTĘPNA WALKA' : statusLabel(match)}</em>
                      </div>

                      <div className={`academy-bracket-player academy-bracket-player-aka ${redWinner ? 'winner' : ''}`}>
                        <span className="academy-bracket-player-side">{leftLabel}</span>
                        <div>
                          <strong>{red.name}</strong>
                          {red.club && <small>{red.club}</small>}
                        </div>
                        <b>{match.redResolvedId ? scoreText(match.redScore) : '-'}</b>
                      </div>

                      <div className={`academy-bracket-player academy-bracket-player-${rightColorClass} ${blueWinner ? 'winner' : ''}`}>
                        <span className="academy-bracket-player-side">{rightLabel}</span>
                        <div>
                          <strong>{blue.name}</strong>
                          {blue.club && <small>{blue.club}</small>}
                        </div>
                        <b>{match.blueResolvedId ? scoreText(match.blueScore) : '-'}</b>
                      </div>
                    </article>
                    {!isLastRound && <i className="academy-bracket-connector-out" aria-hidden="true" />}
                    {!isLastRound && pairTop && <i className="academy-bracket-connector-pair" aria-hidden="true" />}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
