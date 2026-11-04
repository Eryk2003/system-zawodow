import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import ClubPanel from './pages/ClubPanel'
import OrganizerPanel from './pages/OrganizerPanel'
import CreateTournamentPage from './pages/CreateTournamentPage'
import TournamentCenter from './pages/TournamentCenter'
import ParentLookup from './pages/ParentLookup'
import PublicLiveResults from './pages/PublicLiveResults'
import PublicTournamentPage from './pages/PublicTournamentPage'
import Telebim from './pages/Telebim'
import NewsPage from './pages/NewsPage'
import TatamiDisplay from './pages/TatamiDisplay'
import UnifiedJudgePanel from './pages/UnifiedJudgePanel'
import RankingsPage from './pages/RankingsPage'
import AthleteIdentifiers from './pages/AthleteIdentifiers'
import { useAuth } from './lib/AuthContext'
import { readStationBinding, releaseStation, STATION_EVENT } from './lib/stationLock.js'
import { db } from './lib/demoStore'

// Tryb stanowiska: przypisany laptop pracuje w panelu tylko swojego tatami.
// Kontrola uprawnień na poziomie Supabase wymaga oddzielnego wdrożenia RLS.
function StationModeGate({ children }) {
  const location = useLocation()
  const [binding, setBinding] = useState(() => readStationBinding())
  useEffect(() => {
    const refresh = () => setBinding(readStationBinding())
    window.addEventListener(STATION_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(STATION_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  if (!binding) return children
  const allowedJudge = ['/organizator/panel-sedziego/', '/organizator/sedzia/', '/organizator/kata-sedzia/']
    .some(prefix => location.pathname === prefix + encodeURIComponent(binding.mat))
  const allowedTv = location.pathname === '/tatami/' + encodeURIComponent(binding.mat)
  if (allowedJudge || allowedTv || location.pathname === '/organizator/logowanie') return children
  const ownUrl = '/organizator/panel-sedziego/' + encodeURIComponent(binding.mat)
  return (
    <main style={{ minHeight: '100vh', background: '#090c12', color: '#f4f7fb', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: 'min(100%, 530px)', background: '#1a1f29', border: '1px solid #454c5b', borderRadius: 18, padding: 28, display: 'grid', gap: 16 }}>
        <strong style={{ color: '#e1261c', letterSpacing: 1 }}>IKA POLAND · STANOWISKO SĘDZIOWSKIE</strong>
        <h1 style={{ fontSize: 32, margin: 0 }}>{binding.mat}</h1>
        <p style={{ color: '#c8d0df', margin: 0 }}>Ten laptop jest przypisany do jednego tatami. Przejście do innych stanowisk i Centrum Zawodów jest zablokowane w tym trybie.</p>
        <a href={ownUrl} style={{ background: '#e1261c', color: '#fff', textAlign: 'center', padding: 14, borderRadius: 10, textDecoration: 'none', fontWeight: 800 }}>OTWÓRZ SWOJE TATAMI</a>
        <button type="button" onClick={() => releaseStation()} style={{ background: '#303746', color: '#fff', border: '1px solid #626b7d', padding: 12, borderRadius: 8, cursor: 'pointer' }}>Odblokuj ten laptop (bez kodu)</button>
      </section>
    </main>
  )
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Ładowanie…</div>
  if (!user) return <Navigate to={role === 'organizer' ? '/organizator/logowanie' : '/logowanie'} replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'organizer' ? '/organizator' : '/panel'} replace />
  return children
}

function LegacyAthleteRedirect() {
  const location = useLocation()
  return <Navigate to={`/zawodnik${location.search}`} replace />
}

function LegacyLiveToTournament() {
  const location = useLocation()
  const tournament = db.getVisibleTournamentForClubs()
  const destination = tournament?.id ? `/zawody/${encodeURIComponent(tournament.id)}${location.search}` : '/zawody'
  return <Navigate to={destination} replace />
}

export default function App() {
  /* ETAP 73: odswiezanie widokow bez przeładowania */
  const [, setLastRefresh] = useState(0)
  useEffect(() => {
    const update = () => setLastRefresh((previous) => previous + 1)
    window.addEventListener('ika:periodic-refresh', update)
    return () => window.removeEventListener('ika:periodic-refresh', update)
  }, [])
  return (
    <StationModeGate>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/aktualnosci" element={<NewsPage />} />
      <Route path="/logowanie" element={<AuthPage mode="login" />} />
      <Route path="/rejestracja" element={<AuthPage mode="register" />} />
      <Route path="/organizator/logowanie" element={<AuthPage mode="organizer" />} />
      <Route path="/zawodnik" element={<ParentLookup />} />
      <Route path="/rodzic" element={<LegacyAthleteRedirect />} />
      <Route path="/klasyfikacja" element={<RankingsPage />} />
      <Route path="/wyniki-live" element={<LegacyLiveToTournament />} />
      <Route path="/zawody" element={<PublicTournamentPage />} />
      <Route path="/zawody/:tournamentId" element={<PublicTournamentPage />} />
      <Route path="/telebim" element={<Telebim />} />
      <Route path="/tatami/:mat" element={<TatamiDisplay />} />
      <Route path="/panel" element={<ProtectedRoute role="club"><ClubPanel /></ProtectedRoute>} />
      <Route path="/organizator" element={<ProtectedRoute role="organizer"><OrganizerPanel /></ProtectedRoute>} />
      <Route path="/organizator/klub" element={<ProtectedRoute role="organizer"><ClubPanel /></ProtectedRoute>} />
      <Route path="/organizator/nowe-zawody" element={<ProtectedRoute role="organizer"><CreateTournamentPage /></ProtectedRoute>} />
      <Route path="/organizator/zawody" element={<ProtectedRoute role="organizer"><TournamentCenter /></ProtectedRoute>} />
      <Route path="/organizator/panel-sedziego/:mat" element={<ProtectedRoute role="organizer"><UnifiedJudgePanel /></ProtectedRoute>} />
      <Route path="/organizator/identyfikatory" element={<ProtectedRoute role="organizer"><AthleteIdentifiers /></ProtectedRoute>} />
      <Route path="/organizator/sedzia/:mat" element={<ProtectedRoute role="organizer"><UnifiedJudgePanel /></ProtectedRoute>} />
      <Route path="/organizator/kata-sedzia/:mat" element={<ProtectedRoute role="organizer"><UnifiedJudgePanel /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </StationModeGate>
  )
}
