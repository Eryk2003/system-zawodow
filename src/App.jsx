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
import Telebim from './pages/Telebim'
import NewsPage from './pages/NewsPage'
import TatamiDisplay from './pages/TatamiDisplay'
import UnifiedJudgePanel from './pages/UnifiedJudgePanel'
import RankingsPage from './pages/RankingsPage'
import AthleteIdentifiers from './pages/AthleteIdentifiers'
import { useAuth } from './lib/AuthContext'

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

export default function App() {
  /* ETAP 73: odswiezanie widokow bez przeładowania */
  const [, setLastRefresh] = useState(0)
  useEffect(() => {
    const update = () => setLastRefresh((previous) => previous + 1)
    window.addEventListener('ika:periodic-refresh', update)
    return () => window.removeEventListener('ika:periodic-refresh', update)
  }, [])
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/aktualnosci" element={<NewsPage />} />
      <Route path="/logowanie" element={<AuthPage mode="login" />} />
      <Route path="/rejestracja" element={<AuthPage mode="register" />} />
      <Route path="/organizator/logowanie" element={<AuthPage mode="organizer" />} />
      <Route path="/zawodnik" element={<ParentLookup />} />
      <Route path="/rodzic" element={<LegacyAthleteRedirect />} />
      <Route path="/klasyfikacja" element={<RankingsPage />} />
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
  )
}
