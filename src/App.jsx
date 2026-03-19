import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import RoleSelection from './pages/RoleSelection'
import ManageUsers from './pages/ManageUsers'
import ParticipantHome from './pages/ParticipantHome'
import ParticipantGames from './pages/ParticipantGames'
import Leaderboard from './pages/Leaderboard'
import Settings from './pages/Settings'
import LearnMultiplication from './pages/LearnMultiplication'
import HangmanMultiplication from './pages/HangmanMultiplication'
import AdditionGame from './pages/AdditionGame'
import HostCreateQuiz from './pages/HostCreateQuiz'
import HostQuizManual from './pages/HostQuizManual'
import HostQuizAI from './pages/HostQuizAI'
import PlayHostQuiz from './pages/PlayHostQuiz'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function Home() {
  const [user, setUser] = useState(null)
  const { t } = useLanguage()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="App">
      <div className="header">
        <h1>{t('home.hello')}</h1>
        {user && (
          <div className="user-info">
            <span>{t('home.welcome')} {user.email}</span>
            <button onClick={handleLogout} className="logout-button">{t('home.logout')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/role-selection"
          element={
            <ProtectedRoute>
              <RoleSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-users"
          element={
            <ProtectedRoute>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-quiz"
          element={
            <ProtectedRoute>
              <HostCreateQuiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/quiz/manual"
          element={
            <ProtectedRoute>
              <HostQuizManual />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/quiz/ai"
          element={
            <ProtectedRoute>
              <HostQuizAI />
            </ProtectedRoute>
          }
        />
        <Route
          path="/participant"
          element={
            <ProtectedRoute>
              <ParticipantHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/participant-games"
          element={
            <ProtectedRoute>
              <ParticipantGames />
            </ProtectedRoute>
          }
        />
        <Route
          path="/participant/play-quiz/:quizId"
          element={
            <ProtectedRoute>
              <PlayHostQuiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn-multiplication"
          element={
            <ProtectedRoute>
              <LearnMultiplication />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hangman-multiplication"
          element={
            <ProtectedRoute>
              <HangmanMultiplication />
            </ProtectedRoute>
          }
        />
        <Route
          path="/addition-game"
          element={
            <ProtectedRoute>
              <AdditionGame />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  )
}

export default App

