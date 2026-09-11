import React from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/Layout'
import { db } from '../lib/demoStore'
import { useAuth } from '../lib/AuthContext'

export default function OrganizerPanel() {
  const { user } = useAuth()
  const tournament = db.getTournament()
  const hasTournament = Boolean(tournament.created)
  const organizerClub = db.getClubForOwner(user.id)
  const organizerAthletes = organizerClub ? db.getAthletesForClub(organizerClub.id) : []

  return (
    <DashboardLayout title="Zawody" organizer showHeadingActions={false}>
      <section className="organizer-start-screen">
        <div className="organizer-start-card">
          <span className="eyebrow">IKA Poland</span>
          <h2>Panel organizatora zawodów</h2>
          <p>Organizator ma jednocześnie własny profil klubu. Najpierw możesz dodać zawodników do swojego klubu, a przy tworzeniu zawodów zobaczysz wyłącznie swoich zawodników do zgłoszenia.</p>
          <div className="organizer-primary-actions">
            <Link className="btn btn-outline organizer-create-btn" to="/organizator/klub">{organizerClub ? `Mój klub • ${organizerAthletes.length} zawodników` : "+ Utwórz mój klub"}</Link>
            <Link className="btn btn-primary organizer-create-btn" to="/organizator/nowe-zawody">+ Stwórz zawody</Link>
            <Link className="btn btn-outline organizer-create-btn" to="/klasyfikacja">Klasyfikacja LIVE</Link>
          </div>
        </div>

        {hasTournament && (
          <Link className="current-tournament-card" to="/organizator/zawody">
            <div>
              <span className="eyebrow">Aktualnie utworzone zawody</span>
              <h3>{tournament.name}</h3>
              <p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p>
            </div>
            <span className="current-tournament-open">Otwórz zawody →</span>
          </Link>
        )}
      </section>
    </DashboardLayout>
  )
}
