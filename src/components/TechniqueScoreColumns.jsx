import React from 'react'

// The +1 control awards ONE occurrence of the selected technique.
// WAZARI contributes one match point; IPPON contributes two match points.
export const getTechniqueCount = (match, side, technique) => {
  const suffix = technique === 'ippon' ? 'IpponCount' : 'WazariCount'
  const key = `${side === 'blue' ? 'blue' : 'red'}${suffix}`
  return Math.max(0, Math.floor(Number(match?.[key] || 0)))
}

export default function TechniqueScoreColumns({ match, side, mode = 'judge', onChange }) {
  return (
    <div className={`technique-score-grid technique-score-grid-${mode}`} aria-label="Wazari i Ippon">
      {[
        ['wazari', 'WAZARI', '1 pkt'],
        ['ippon', 'IPPON', '2 pkt'],
      ].map(([technique, label, points]) => {
        const count = getTechniqueCount(match, side, technique)
        return (
          <div className="technique-score-column" key={technique}>
            <span className="technique-score-label">{label}</span>
            <strong className="technique-score-count">{count}</strong>
            {mode !== 'tv' && onChange && (
              <div className="technique-score-actions">
                <button type="button" className="technique-score-add" onClick={() => onChange(side, technique, 1)} aria-label={`Dodaj ${label}`}>
                  +1
                </button>
                <button type="button" className="technique-score-minus" disabled={!count} onClick={() => onChange(side, technique, -1)} aria-label={`Cofnij ${label}`}>
                  −1
                </button>
              </div>
            )}
            <small>{points}</small>
          </div>
        )
      })}
    </div>
  )
}
