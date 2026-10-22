import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/Layout'
import { db } from '../lib/demoStore'
import { deleteClubFromCloud } from '../lib/cloudSync'
import { useAuth } from '../lib/AuthContext'

const countryFlag = (country = '') => {
  const normalized = String(country).trim().toLowerCase()
  const known = {
    polska: '🇵🇱', poland: '🇵🇱', niemcy: '🇩🇪', germany: '🇩🇪',
    francja: '🇫🇷', france: '🇫🇷', włochy: '🇮🇹', italy: '🇮🇹',
    hiszpania: '🇪🇸', spain: '🇪🇸', czechy: '🇨🇿', 'czech republic': '🇨🇿', czechia: '🇨🇿',
    słowacja: '🇸🇰', slovakia: '🇸🇰', węgry: '🇭🇺', hungary: '🇭🇺',
    ukraina: '🇺🇦', ukraine: '🇺🇦', litwa: '🇱🇹', lithuania: '🇱🇹',
    łotwa: '🇱🇻', latvia: '🇱🇻', estonia: '🇪🇪', austria: '🇦🇹',
    szwajcaria: '🇨🇭', switzerland: '🇨🇭', belgia: '🇧🇪', belgium: '🇧🇪',
    holandia: '🇳🇱', netherlands: '🇳🇱', rumunia: '🇷🇴', romania: '🇷🇴',
    bułgaria: '🇧🇬', bulgaria: '🇧🇬', chorwacja: '🇭🇷', croatia: '🇭🇷',
    serbia: '🇷🇸', słowenia: '🇸🇮', slovenia: '🇸🇮', portugalia: '🇵🇹', portugal: '🇵🇹',
    irlandia: '🇮🇪', ireland: '🇮🇪', 'wielka brytania': '🇬🇧', 'united kingdom': '🇬🇧',
  }
  return known[normalized] || '🌍'
}

export default function OrganizerPanel() {
  const { user } = useAuth()
  const [dataTick, setDataTick] = useState(0)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deletingClubId, setDeletingClubId] = useState('')

  const tournament = db.getTournament()
  const hasTournament = Boolean(tournament.created)
  const organizerClub = db.getClubForOwner(user.id)
  const organizerAthletes = organizerClub ? db.getAthletesForClub(organizerClub.id) : []
  const clubs = useMemo(() => db.getClubs(), [dataTick])
  const athletes = useMemo(() => db.getAthletes(), [dataTick])

  useEffect(() => {
    const refresh = () => setDataTick((value) => value + 1)
    window.addEventListener('ika:data', refresh)
    window.addEventListener('ika:cloud', refresh)
    return () => {
      window.removeEventListener('ika:data', refresh)
      window.removeEventListener('ika:cloud', refresh)
    }
  }, [])

  const removeClub = async (club) => {
    if (!club || club.id === organizerClub?.id) return
    const count = athletes.filter((athlete) => athlete.clubId === club.id).length
    const accepted = window.confirm(
      `Usunąć klub „${club.name}” z systemu?\n\nZostanie usunięty klub, ${count} zawodników oraz wszystkie ich zgłoszenia do zawodów. Tej operacji nie można cofnąć.`,
    )
    if (!accepted) return

    setDeletingClubId(club.id)
    setDeleteMessage('')
    setDeleteError('')
    try {
      // Najpierw czyścimy lokalne/publiczne powiązania (zgłoszenia, walki, harmonogram),
      // a następnie usuwamy prywatny rekord klubu z Supabase.
      db.deleteClub(club.id)
      if (club.ownerId) await deleteClubFromCloud(club.ownerId)
      setDeleteMessage(`Klub „${club.name}” został usunięty wraz z zawodnikami i zgłoszeniami.`)
      setDataTick((value) => value + 1)
    } catch (error) {
      setDeleteError(`Nie udało się usunąć klubu: ${error?.message || error}`)
    } finally {
      setDeletingClubId('')
    }
  }

  return (
    <DashboardLayout title="Zawody" organizer showHeadingActions={false}>
      <section className="organizer-start-screen">
        <div className="organizer-start-card">
          <span className="eyebrow">IKA Poland</span>
          <h2>Panel organizatora zawodów</h2>
          <p>Organizator ma jednocześnie własny profil klubu. Najpierw możesz dodać zawodników do swojego klubu, a przy tworzeniu zawodów zobaczysz wyłącznie swoich zawodników do zgłoszenia.</p>
          <div className="organizer-primary-actions">
            <Link className="btn btn-outline organizer-create-btn" to="/organizator/klub">{organizerClub ? `Mój klub • ${organizerAthletes.length} zawodników` : '+ Utwórz mój klub'}</Link>
            <Link className="btn btn-primary organizer-create-btn" to="/organizator/nowe-zawody">+ Stwórz zawody</Link>
            <Link className="btn btn-outline organizer-create-btn" to="/klasyfikacja">Klasyfikacja LIVE</Link>
          </div>
        </div>

        {hasTournament && (
          <Link className="current-tournament-card" to="/organizator/zawody">
            <div>
              <span className="eyebrow">Aktualnie utworzone zawody - widoczne dla klubów</span>
              <h3>{tournament.name}</h3>
              <p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p>
            </div>
            <span className="current-tournament-open">Otwórz zawody →</span>
          </Link>
        )}

        <section className="organizer-clubs-panel">
          <div className="organizer-clubs-head">
            <div>
              <span className="eyebrow">Kluby w systemie</span>
              <h2>Zarządzanie klubami</h2>
              <p>Organizator widzi kluby zarejestrowane w systemie. Usunięcie klubu usuwa także jego zawodników oraz zgłoszenia.</p>
            </div>
            <strong>{clubs.length} klubów</strong>
          </div>

          {deleteMessage && <div className="alert alert-success">{deleteMessage}</div>}
          {deleteError && <div className="alert alert-error">{deleteError}</div>}

          {!clubs.length ? (
            <div className="empty-state compact"><h3>Brak klubów</h3><p>Po rejestracji kluby pojawią się tutaj.</p></div>
          ) : (
            <div className="organizer-club-list">
              {clubs.map((club) => {
                const clubAthletes = athletes.filter((athlete) => athlete.clubId === club.id).length
                const isOwn = club.id === organizerClub?.id
                return (
                  <article className="organizer-club-row" key={club.id}>
                    <div className="organizer-club-country" aria-label={club.country || 'Kraj niepodany'}>{countryFlag(club.country)}</div>
                    <div className="organizer-club-info">
                      <strong>{club.name}</strong>
                      <span>{club.shortName || 'Bez skrótu'}{club.city ? ` • ${club.city}` : ''}{club.country ? ` • ${club.country}` : ''}</span>
                      <small>{club.federation ? `Federacja: ${club.federation} • ` : ''}{clubAthletes} zawodników</small>
                    </div>
                    {isOwn ? (
                      <span className="organizer-own-club-badge">KLUB ORGANIZATORA</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={deletingClubId === club.id}
                        onClick={() => removeClub(club)}
                      >
                        {deletingClubId === club.id ? 'Usuwanie…' : 'Usuń klub'}
                      </button>
                    )}
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
