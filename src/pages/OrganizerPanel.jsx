import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/Layout'
import { db } from '../lib/demoStore'
import { removeClubFromSystem } from '../lib/cloudSync'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext.jsx'

export default function OrganizerPanel() {
  const { user } = useAuth()
  const { pick } = useLanguage()
  const [tick, setTick] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busyClubId, setBusyClubId] = useState('')
  const tournament = db.getTournament()
  const hasTournament = Boolean(tournament.created)
  const organizerClub = db.getClubForOwner(user.id)
  const organizerAthletes = organizerClub ? db.getAthletesForClub(organizerClub.id) : []
  const clubs = db.getClubs()
  void tick

  const deleteClub = async (club) => {
    if (!club || club.ownerId === user.id) return
    const athleteCount = db.getAthletesForClub(club.id).length
    const confirmation = pick(
      `Usunąć klub „${club.name}”? Zostanie usunięty profil klubu, ${athleteCount} zawodników i ich zgłoszenia. Konto klubu zostanie zablokowane.`,
      `Remove club “${club.name}”? The club profile, ${athleteCount} athletes and their entries will be removed. The club account will be disabled.`,
    )
    if (!window.confirm(confirmation)) return

    setMessage('')
    setError('')
    setBusyClubId(club.id)
    try {
      if (club.ownerId && !String(club.ownerId).startsWith('usr_')) await removeClubFromSystem(club.ownerId)
      db.deleteClub(club.id)
      setMessage(pick(`Klub „${club.name}” został usunięty z systemu.`, `Club “${club.name}” has been removed from the system.`))
      setTick((value) => value + 1)
    } catch (err) {
      setError(err.message || pick('Nie udało się usunąć klubu.', 'Could not remove the club.'))
    } finally {
      setBusyClubId('')
    }
  }

  return (
    <DashboardLayout title={pick('Zawody', 'Competitions')} organizer showHeadingActions={false}>
      <section className="organizer-start-screen">
        <div className="organizer-start-card">
          <span className="eyebrow">IKA Poland</span>
          <h2>{pick('Panel organizatora zawodów', 'Competition organizer panel')}</h2>
          <p>{pick(
            'Organizator ma jednocześnie własny profil klubu. Tutaj tworzysz zawody, przechodzisz do centrum zawodów oraz zarządzasz klubami zarejestrowanymi w systemie.',
            'The organizer also has its own club profile. Create events, open the competition center and manage clubs registered in the system here.',
          )}</p>
          <div className="organizer-primary-actions">
            <Link className="btn btn-outline organizer-create-btn" to="/organizator/klub">{organizerClub ? pick(`Mój klub • ${organizerAthletes.length} zawodników`, `My club • ${organizerAthletes.length} athletes`) : pick('+ Utwórz mój klub', '+ Create my club')}</Link>
            <Link className="btn btn-primary organizer-create-btn" to="/organizator/nowe-zawody">{pick('+ Stwórz zawody', '+ Create event')}</Link>
            <Link className="btn btn-outline organizer-create-btn" to="/klasyfikacja">{pick('Klasyfikacja LIVE', 'LIVE ranking')}</Link>
          </div>
        </div>

        {hasTournament && (
          <Link className="current-tournament-card" to="/organizator/zawody">
            <div>
              <span className="eyebrow">{pick('Aktualnie utworzone zawody - widoczne dla klubów', 'Current event - visible to clubs')}</span>
              <h3>{tournament.name}</h3>
              <p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p>
            </div>
            <span className="current-tournament-open">{pick('Otwórz zawody →', 'Open event →')}</span>
          </Link>
        )}

        <section className="organizer-clubs-panel">
          <div className="panel-section-head">
            <div>
              <span className="eyebrow">{pick('Konta klubów', 'Club accounts')}</span>
              <h2>{pick('Kluby w systemie', 'Clubs in the system')}</h2>
              <p>{pick('Organizator może usunąć klub wraz z jego zawodnikami i zgłoszeniami. Usunięte konto zostanie zablokowane.', 'The organizer can remove a club together with its athletes and entries. The removed account will be disabled.')}</p>
            </div>
            <strong>{clubs.length}</strong>
          </div>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!clubs.length ? (
            <div className="empty-state compact"><h3>{pick('Brak zarejestrowanych klubów', 'No registered clubs')}</h3></div>
          ) : (
            <div className="organizer-club-list">
              {clubs.map((club) => {
                const count = db.getAthletesForClub(club.id).length
                const own = club.ownerId === user.id
                return (
                  <article className="organizer-club-row" key={club.id}>
                    <div><strong>{club.name || pick('Klub bez nazwy', 'Unnamed club')}</strong><span>{club.city || '-'}{club.country ? ` • ${club.country}` : ''}</span></div>
                    <div className="organizer-club-count"><small>{pick('Zawodnicy', 'Athletes')}</small><strong>{count}</strong></div>
                    {own ? <span className="organizer-own-club">{pick('Twój klub', 'Your club')}</span> : <button type="button" className="btn btn-danger btn-sm" disabled={busyClubId === club.id} onClick={() => deleteClub(club)}>{busyClubId === club.id ? pick('Usuwanie…', 'Removing…') : pick('Usuń klub', 'Remove club')}</button>}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>
    </DashboardLayout>
  )
}
