import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
import JudgePanel from './pages/JudgePanel'
import KataJudgePanel from './pages/KataJudgePanel'
import RankingsPage from './pages/RankingsPage'
import { useAuth } from './lib/AuthContext'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Ładowanie…</div>
  if (!user) return <Navigate to="/logowanie" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'organizer' ? '/organizator' : '/panel'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/aktualnosci" element={<NewsPage />} />
      <Route path="/logowanie" element={<AuthPage mode="login" />} />
      <Route path="/rejestracja" element={<AuthPage mode="register" />} />
      <Route path="/rodzic" element={<ParentLookup />} />
      <Route path="/klasyfikacja" element={<RankingsPage />} />
      <Route path="/telebim" element={<Telebim />} />
      <Route path="/tatami/:mat" element={<TatamiDisplay />} />
      <Route path="/panel" element={<ProtectedRoute role="club"><ClubPanel /></ProtectedRoute>} />
      <Route path="/organizator" element={<ProtectedRoute role="organizer"><OrganizerPanel /></ProtectedRoute>} />
      <Route path="/organizator/klub" element={<ProtectedRoute role="organizer"><ClubPanel /></ProtectedRoute>} />
      <Route path="/organizator/nowe-zawody" element={<ProtectedRoute role="organizer"><CreateTournamentPage /></ProtectedRoute>} />
      <Route path="/organizator/zawody" element={<ProtectedRoute role="organizer"><TournamentCenter /></ProtectedRoute>} />
      <Route path="/organizator/sedzia/:mat" element={<ProtectedRoute role="organizer"><JudgePanel /></ProtectedRoute>} />
      <Route path="/organizator/kata-sedzia/:mat" element={<ProtectedRoute role="organizer"><KataJudgePanel /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
