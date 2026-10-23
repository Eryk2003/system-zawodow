import OrganizerRoleManager from '../components/OrganizerRoleManager.jsx'
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/Layout'
import { db } from '../lib/demoStore'
import { deleteClubPrivateState } from '../lib/cloudSync'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/I18nContext.jsx'

export default function OrganizerPanel() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const [tick, setTick] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const tournament = db.getTournament()
  const hasTournament = Boolean(tournament.created)
  const clubs = useMemo(() => db.getClubs(), [tick])
  const athletes = useMemo(() => db.getAthletes(), [tick])
  const organizerClub = db.getClubForOwner(user.id)
  const organizerAthletes = organizerClub ? db.getAthletesForClub(organizerClub.id) : []
  const en = language === 'en'

  const removeClub = async (club) => {
    if (!confirm(en ? `Delete club “${club.name}” and all its athletes and entries? Existing brackets will be cleared.` : `Usunąć klub „${club.name}” razem ze wszystkimi zawodnikami i zgłoszeniami? Istniejące drabinki zostaną wyczyszczone.`)) return
    setMessage(''); setError('')
    try {
      if (user.authProvider === 'supabase' && club.ownerId && !String(club.ownerId).startsWith('usr_')) await deleteClubPrivateState(club.ownerId)
      db.deleteClub(club.id)
      setTick((v) => v + 1)
      setMessage(en ? 'Club deleted.' : 'Klub został usunięty z systemu.')
    } catch (e) { setError(e.message || 'Nie udało się usunąć klubu.') }
  }

  return <DashboardLayout title={en ? 'Events' : 'Zawody'} organizer showHeadingActions={false}>
    <section className="organizer-start-screen">
      <div className="organizer-start-card"><span className="eyebrow">IKA Poland</span><h2>{en ? 'Competition organizer panel' : 'Panel organizatora zawodów'}</h2><p>{en ? 'Create events, manage clubs and run the competition.' : 'Twórz zawody, zarządzaj klubami i prowadź cały turniej.'}</p><div className="organizer-primary-actions"><Link className="btn btn-outline organizer-create-btn" to="/organizator/klub">{organizerClub ? `${en ? 'My club' : 'Mój klub'} • ${organizerAthletes.length}` : (en ? '+ Create my club' : '+ Utwórz mój klub')}</Link><Link className="btn btn-primary organizer-create-btn" to="/organizator/nowe-zawody">{en ? '+ Create event' : '+ Stwórz zawody'}</Link><Link className="btn btn-outline organizer-create-btn" to="/klasyfikacja">{en ? 'LIVE rankings' : 'Klasyfikacja LIVE'}</Link></div></div>
      {hasTournament && <Link className="current-tournament-card" to="/organizator/zawody"><div><span className="eyebrow">{en ? 'Current event — visible to clubs' : 'Aktualnie utworzone zawody - widoczne dla klubów'}</span><h3>{tournament.name}</h3><p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p></div><span className="current-tournament-open">{en ? 'Open event →' : 'Otwórz zawody →'}</span></Link>}
    </section>

    <OrganizerRoleManager />

    <section className="panel-section organizer-club-management"><div className="panel-section-head"><div><span className="eyebrow">{en ? 'Administration' : 'Administracja'}</span><h2>{en ? 'Registered clubs' : 'Zarejestrowane kluby'}</h2><p>{en ? 'The organizer may remove a club together with its athletes and entries.' : 'Organizator może usunąć klub razem z jego zawodnikami i zgłoszeniami.'}</p></div><strong>{clubs.length}</strong></div>
      {message && <div className="alert alert-success">{message}</div>}{error && <div className="alert alert-error">{error}</div>}
      {!clubs.length ? <div className="empty-state compact"><h3>{en ? 'No clubs yet' : 'Brak klubów'}</h3></div> : <div className="organizer-club-list">{clubs.map((club)=>{ const count=athletes.filter((a)=>a.clubId===club.id).length; const own=club.id===organizerClub?.id; return <article key={club.id}><div><strong>{club.name || 'Klub'}</strong><span>{club.city || '-'} • {count} {en ? 'athletes' : 'zawodników'}</span><small>{club.email || ''}</small></div>{own ? <span className="status status-active">{en ? 'ORGANIZER CLUB' : 'KLUB ORGANIZATORA'}</span> : <button type="button" className="btn btn-danger btn-sm" onClick={()=>removeClub(club)}>{en ? 'Delete club' : 'Usuń klub'}</button>}</article>})}</div>}
    </section>
  </DashboardLayout>
}
