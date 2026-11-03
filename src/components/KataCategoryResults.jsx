import React from 'react'
import { db, getKataCombinedResults } from '../lib/demoStore'

// Wyłącznie publiczna klasyfikacja zakończonej kategorii kata.
// Nie zmienia identyfikatorów QR ani widoku telewizora.
const formatted = value => value == null ? '-' : Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 2 })

export default function KataCategoryResults({ podium }) {
  const session = db.getKataSessions().find(item => item.status === 'completed' && (
    (podium.categoryId && item.categoryId === podium.categoryId) ||
    (!podium.categoryId && item.competitionId === podium.competitionId && item.category === podium.categoryName && item.mat === podium.mat)
  ))
  if (!session) return null

  const athletes = db.getAthletes()
  const clubs = db.getClubs()
  const scores = getKataCombinedResults(session)
  if (!scores.length) return null

  return (
    <details className="ika-public-kata-details" style={{ marginTop: 14, borderTop: '1px solid #424959', paddingTop: 12 }}>
      <summary style={{ cursor: 'pointer', color: '#f5f7fb', fontWeight: 800, padding: '8px 0' }}>
        Pełne wyniki kata - {scores.length} zawodników
      </summary>
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {scores.map((item, index) => {
          const athlete = athletes.find(person => person.id === item.athleteId)
          const club = clubs.find(row => row.id === athlete?.clubId)
          const athleteName = athlete ? `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() : 'Zawodnik'
          return (
            <div key={item.athleteId} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, background: '#222735', border: '1px solid #424959', borderRadius: 9, padding: '10px 12px', color: '#f5f7fb' }}>
              <strong>{index + 1}.</strong>
              <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                <strong style={{ overflowWrap: 'anywhere' }}>{athleteName}</strong>
                <small style={{ color: '#bdc7d9' }}>{club?.shortName || club?.name || ''}</small>
              </div>
              <strong style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatted(item.totalScore)}</strong>
            </div>
          )
        })}
      </div>
      <p style={{ color: '#bdc7d9', fontSize: 12, marginTop: 8 }}>Wynik końcowy zgodny z zasadami punktacji tej konkurencji.</p>
    </details>
  )
}
