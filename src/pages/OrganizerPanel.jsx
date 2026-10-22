import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/Layout'
import { db } from '../lib/demoStore'
import { deleteClubFromCloud } from '../lib/cloudSync'
import { useAuth } from '../lib/AuthContext'
import { useLanguage } from '../lib/LanguageContext'

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
  const { tr } = useLanguage()
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
      tr(
        `Usunąć klub „${club.name}” z systemu?\n\nZostanie usunięty klub, ${count} zawodników oraz wszystkie ich zgłoszenia do zawodów. Tej operacji nie można cofnąć.`,
        `Delete “${club.name}” from the system?\n\nThe club, ${count} athletes and all of their competition entries will be deleted. This action cannot be undone.`,
      ),
    )
    if (!accepted) return

    setDeletingClubId(club.id)
    setDeleteMessage('')
    setDeleteError('')
    try {
      db.deleteClub(club.id)
      if (club.ownerId) await deleteClubFromCloud(club.ownerId)
      setDeleteMessage(tr(`Klub „${club.name}” został usunięty wraz z zawodnikami i zgłoszeniami.`, `Club “${club.name}” was deleted together with its athletes and entries.`))
      setDataTick((value) => value + 1)
    } catch (error) {
      setDeleteError(`${tr('Nie udało się usunąć klubu', 'Could not delete club')}: ${error?.message || error}`)
    } finally {
      setDeletingClubId('')
    }
  }

  return (
    <DashboardLayout title="Zawody" titleEn="Competitions" organizer showHeadingActions={false}>
      <section className="organizer-start-screen">
        <div className="organizer-start-card">
          <span className="eyebrow">IKA Poland</span>
          <h2>{tr('Panel organizatora zawodów', 'Competition organizer panel')}</h2>
          <p>{tr('Organizator ma jednocześnie własny profil klubu. Najpierw możesz dodać zawodników do swojego klubu, a przy tworzeniu zawodów zobaczysz wyłącznie swoich zawodników do zgłoszenia.', 'The organizer also has a club profile. Add your own athletes first; when creating an event you will only see athletes belonging to your club.')}</p>
          <div className="organizer-primary-actions">
            <Link className="btn btn-outline organizer-create-btn" to="/organizator/klub">{organizerClub ? `${tr('Mój klub', 'My club')} • ${organizerAthletes.length} ${tr('zawodników', 'athletes')}` : tr('+ Utwórz mój klub', '+ Create my club')}</Link>
            <Link className="btn btn-primary organizer-create-btn" to="/organizator/nowe-zawody">{tr('+ Stwórz zawody', '+ Create event')}</Link>
            <Link className="btn btn-outline organizer-create-btn" to="/klasyfikacja">{tr('Klasyfikacja LIVE', 'LIVE rankings')}</Link>
          </div>
        </div>

        {hasTournament && (
          <Link className="current-tournament-card" to="/organizator/zawody">
            <div>
              <span className="eyebrow">{tr('Aktualnie utworzone zawody - widoczne dla klubów', 'Current event - visible to clubs')}</span>
              <h3>{tournament.name}</h3>
              <p>{tournament.date}{tournament.startTime ? ` • ${tournament.startTime}` : ''} • {tournament.venue}</p>
            </div>
            <span className="current-tournament-open">{tr('Otwórz zawody →', 'Open event →')}</span>
          </Link>
        )}

        <section className="organizer-clubs-panel">
          <div className="organizer-clubs-head">
            <div>
              <span className="eyebrow">{tr('Kluby w systemie', 'Clubs in system')}</span>
              <h2>{tr('Zarządzanie klubami', 'Club management')}</h2>
              <p>{tr('Organizator widzi kluby zarejestrowane w systemie. Usunięcie klubu usuwa także jego zawodników oraz zgłoszenia.', 'The organizer can see clubs registered in the system. Deleting a club also removes its athletes and competition entries.')}</p>
            </div>
            <strong>{clubs.length} {tr('klubów', 'clubs')}</strong>
          </div>

          {deleteMessage && <div className="alert alert-success">{deleteMessage}</div>}
          {deleteError && <div className="alert alert-error">{deleteError}</div>}

          {!clubs.length ? (
            <div className="empty-state compact"><h3>{tr('Brak klubów', 'No clubs')}</h3><p>{tr('Po rejestracji kluby pojawią się tutaj.', 'Registered clubs will appear here.')}</p></div>
          ) : (
            <div className="organizer-club-list">
              {clubs.map((club) => {
                const clubAthletes = athletes.filter((athlete) => athlete.clubId === club.id).length
                const isOwn = club.id === organizerClub?.id
                return (
                  <article className="organizer-club-row" key={club.id}>
                    <div className="organizer-club-country" aria-label={club.country || tr('Kraj niepodany', 'Country not provided')}>{countryFlag(club.country)}</div>
                    <div className="organizer-club-info">
                      <strong>{club.name}</strong>
                      <span>{club.shortName || tr('Bez skrótu', 'No short name')}{club.city ? ` • ${club.city}` : ''}{club.country ? ` • ${club.country}` : ''}</span>
                      <small>{club.federation ? `${tr('Federacja', 'Federation')}: ${club.federation} • ` : ''}{clubAthletes} {tr('zawodników', 'athletes')}</small>
                    </div>
                    {isOwn ? (
                      <span className="organizer-own-club-badge">{tr('KLUB ORGANIZATORA', 'ORGANIZER CLUB')}</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={deletingClubId === club.id}
                        onClick={() => removeClub(club)}
                      >
                        {deletingClubId === club.id ? tr('Usuwanie…', 'Deleting…') : tr('Usuń klub', 'Delete club')}
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
