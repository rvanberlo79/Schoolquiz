import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import './ParticipantGames.css'

function ParticipantGames() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [publishedQuizzes, setPublishedQuizzes] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('host_quizzes')
        .select('id, title, time_limit_seconds, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
      setPublishedQuizzes(data ?? [])
    }
    load()
  }, [])

  const handleGoBack = () => {
    navigate('/participant')
  }

  const handleStartLearning = () => {
    navigate('/learn-multiplication')
  }

  const handlePlayGame = () => {
    navigate('/hangman-multiplication')
  }

  const handlePlayAdditionGame = () => {
    navigate('/addition-game')
  }

  return (
    <div className="participant-games-page">
      <div className="participant-games-card">
        <button type="button" className="back-link" onClick={handleGoBack}>
          {t('pgames.back')}
        </button>

        <h1 className="games-title">{t('pgames.title')}</h1>
        <p className="games-subtitle">{t('pgames.subtitle')}</p>

        <div className="games-grid">
          <div className="game-option blue">
            <div className="game-icon">📘</div>
            <h2>{t('pgames.learnTitle')}</h2>
            <p>{t('pgames.learnDesc')}</p>
            <ul>
              <li>{t('pgames.learn.1')}</li>
              <li>{t('pgames.learn.2')}</li>
              <li>{t('pgames.learn.3')}</li>
            </ul>
            <button type="button" className="enter-game-btn" onClick={handleStartLearning}>
              {t('pgames.learnBtn')}
            </button>
          </div>

          <div className="game-option green">
            <div className="game-icon">🎮</div>
            <h2>{t('pgames.hangmanTitle')}</h2>
            <p>{t('pgames.hangmanDesc')}</p>
            <ul>
              <li>{t('pgames.hangman.1')}</li>
              <li>{t('pgames.hangman.2')}</li>
              <li>{t('pgames.hangman.3')}</li>
            </ul>
            <button type="button" className="enter-game-btn" onClick={handlePlayGame}>
              {t('pgames.hangmanBtn')}
            </button>
          </div>

          <div className="game-option orange">
            <div className="game-icon">➕</div>
            <h2>{t('pgames.addTitle')}</h2>
            <p>{t('pgames.addDesc')}</p>
            <ul>
              <li>{t('pgames.add.1')}</li>
              <li>{t('pgames.add.2')}</li>
              <li>{t('pgames.add.3')}</li>
            </ul>
            <button type="button" className="enter-game-btn" onClick={handlePlayAdditionGame}>
              {t('pgames.addBtn')}
            </button>
          </div>

          {publishedQuizzes.length > 0 && (
            <>
              <h2 className="games-section-title">{t('pgames.hostedQuizzesTitle')}</h2>
              {publishedQuizzes.map((q) => (
                <div key={q.id} className="game-option purple">
                  <div className="game-icon">✨</div>
                  <h2>{q.title || t('playHostQuiz.untitledQuiz')}</h2>
                  <p>{t('pgames.hostedQuizDesc')}</p>
                  <ul>
                    <li>{t('pgames.hostedQuiz.1')}</li>
                    <li>{t('pgames.hostedQuiz.2')}</li>
                  </ul>
                  <button
                    type="button"
                    className="enter-game-btn"
                    onClick={() => navigate(`/participant/play-quiz/${q.id}`)}
                  >
                    {t('pgames.playQuiz')}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParticipantGames
