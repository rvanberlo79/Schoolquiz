import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './HangmanMultiplication.css'

const MAX_MISTAKES = 6
const TARGET_SCORE = 15

const CORRECT_MESSAGES = ['Great!', 'Perfect!', 'Go on!', 'You are an expert!', 'You are amazing!', 'Wow!']
function getRandomCorrectMessage() {
  return CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]
}

function getRandomQuestion(selectedTables) {
  const table = selectedTables[Math.floor(Math.random() * selectedTables.length)]
  const multiplier = Math.floor(Math.random() * 10) + 1

  return {
    multiplier,
    table,
    correctAnswer: multiplier * table,
  }
}

function HangmanFigure({ mistakes }) {
  return (
    <svg viewBox="0 0 220 220" className="hangman-svg" aria-label="Hangman status">
      <line x1="20" y1="200" x2="120" y2="200" className="gallows" />
      <line x1="50" y1="200" x2="50" y2="20" className="gallows" />
      <line x1="50" y1="20" x2="140" y2="20" className="gallows" />
      <line x1="140" y1="20" x2="140" y2="45" className="gallows" />

      {mistakes >= 1 && <circle cx="140" cy="65" r="20" className="hangman-part" />}
      {mistakes >= 2 && <line x1="140" y1="85" x2="140" y2="130" className="hangman-part" />}
      {mistakes >= 3 && <line x1="140" y1="95" x2="115" y2="115" className="hangman-part" />}
      {mistakes >= 4 && <line x1="140" y1="95" x2="165" y2="115" className="hangman-part" />}
      {mistakes >= 5 && <line x1="140" y1="130" x2="118" y2="165" className="hangman-part" />}
      {mistakes >= 6 && <line x1="140" y1="130" x2="162" y2="165" className="hangman-part" />}
    </svg>
  )
}

function HangmanMultiplication() {
  const navigate = useNavigate()
  const [selectedTables, setSelectedTables] = useState([])
  const [isStarted, setIsStarted] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [didWin, setDidWin] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [roundFeedback, setRoundFeedback] = useState(null) // { isCorrect, correctAnswer?, message } — show before next question
  const [pendingUpdate, setPendingUpdate] = useState(null) // { nextScore, nextMistakes } after Continue
  const [userId, setUserId] = useState(null)
  const [nickname, setNickname] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [topScores, setTopScores] = useState([])

  const canStart = selectedTables.length > 0

  const prompt = useMemo(() => {
    if (!question) return ''
    return `${question.multiplier} x ${question.table}`
  }, [question])

  useEffect(() => {
    const loadUserAndNickname = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (!uid) return
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', uid).single()
      const nick = profile?.nickname?.trim() || localStorage.getItem(`leaderboard_nickname_${uid}`) || ''
      setNickname(nick || 'Player')
    }
    loadUserAndNickname()
  }, [])

  const toggleTable = (tableNumber) => {
    setSelectedTables((prev) =>
      prev.includes(tableNumber)
        ? prev.filter((item) => item !== tableNumber)
        : [...prev, tableNumber].sort((a, b) => a - b),
    )
  }

  const startGame = () => {
    if (!canStart) return

    setScore(0)
    setMistakes(0)
    setAnswer('')
    setFeedback('')
    setIsFinished(false)
    setDidWin(false)
    setSaveError('')
    setTopScores([])
    setQuestion(getRandomQuestion(selectedTables))
    setIsStarted(true)
  }

  const repeatGame = () => {
    startGame()
  }

  const loadLeaderboard = async () => {
    const { data, error } = await supabase
      .from('hangman_scores')
      .select('user_id, score, won, created_at')
      .order('score', { ascending: false })
      .order('won', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) {
      setSaveError(error.message)
      return
    }

    setTopScores(data ?? [])
  }

  const saveScore = async (finalScore, finalMistakes, won) => {
    if (!userId) return

    setIsSaving(true)
    setSaveError('')

    const { error } = await supabase.from('hangman_scores').insert({
      user_id: userId,
      selected_tables: selectedTables,
      score: finalScore,
      mistakes: finalMistakes,
      won,
    })

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
      return
    }

    await loadLeaderboard()
    setIsSaving(false)
  }

  const submitAnswer = (event) => {
    event.preventDefault()
    if (!question) return

    const parsed = Number(answer)
    const isCorrect = parsed === question.correctAnswer
    const nextScore = isCorrect ? score + 1 : score
    const nextMistakes = isCorrect ? mistakes : mistakes + 1

    setAnswer('')
    setPendingUpdate({ nextScore, nextMistakes })
    setRoundFeedback({
      isCorrect,
      correctAnswer: question.correctAnswer,
      factor1: question.multiplier,
      factor2: question.table,
      message: isCorrect ? getRandomCorrectMessage() : null,
    })
  }

  // Auto-advance after 2s when answer is correct
  useEffect(() => {
    if (!roundFeedback?.isCorrect || !pendingUpdate) return
    const t = setTimeout(handleContinueAfterFeedback, 500)
    return () => clearTimeout(t)
  }, [roundFeedback?.isCorrect, pendingUpdate])

  const handleContinueAfterFeedback = async () => {
    if (!pendingUpdate) return
    const { nextScore, nextMistakes } = pendingUpdate
    setScore(nextScore)
    setMistakes(nextMistakes)
    setRoundFeedback(null)
    setPendingUpdate(null)
    setFeedback('')

    if (nextMistakes >= MAX_MISTAKES) {
      setDidWin(false)
      setIsFinished(true)
      await saveScore(nextScore, nextMistakes, false)
      return
    }

    if (nextScore >= TARGET_SCORE) {
      setDidWin(true)
      setIsFinished(true)
      await saveScore(nextScore, nextMistakes, true)
      return
    }

    setQuestion(getRandomQuestion(selectedTables))
  }

  if (!isStarted) {
    return (
      <div className="hangman-page">
        <div className="hangman-card">
          <button type="button" className="hangman-back" onClick={() => navigate('/participant-games')}>
            ← Back to Games
          </button>
          <h1 className="hangman-title">Multiplication Hangman Game</h1>
          <p className="hangman-subtitle">Select one or more tables (1 to 10)</p>

          <div className="table-selector-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const active = selectedTables.includes(num)
              return (
                <button
                  key={num}
                  type="button"
                  className={`table-pick-btn ${active ? 'active' : ''}`}
                  onClick={() => toggleTable(num)}
                >
                  {num}
                </button>
              )
            })}
          </div>

          <p className="selected-info">
            Selected tables: {selectedTables.length > 0 ? selectedTables.join(', ') : 'none'}
          </p>

          <button type="button" className="start-btn" disabled={!canStart} onClick={startGame}>
            Start Hangman Game
          </button>
        </div>
      </div>
    )
  }

  if (roundFeedback && pendingUpdate) {
    const isCorrect = roundFeedback.isCorrect
    return (
      <div className="hangman-page">
        <div className="hangman-card hangman-feedback-card">
          <div className={`hangman-feedback-emoji ${isCorrect ? 'correct' : 'wrong'}`} aria-hidden>
            {isCorrect ? '🎉' : '😕'}
          </div>
          <p className={`hangman-feedback-message ${isCorrect ? 'correct' : 'wrong'}`}>
            {isCorrect
              ? roundFeedback.message
              : "Unfortunately that's wrong. Here's the correct answer:"}
          </p>
          {!isCorrect && roundFeedback.factor1 != null && roundFeedback.factor2 != null && (
            <div className="mult-visual-wrap">
              <div className="mult-visual-header">
                <span className="mult-visual-question">{roundFeedback.factor1} × {roundFeedback.factor2} ?</span>
                <span className="mult-visual-answer">{roundFeedback.correctAnswer}</span>
              </div>
              <div className="mult-visual-rows">
                {Array.from({ length: roundFeedback.factor1 }, (_, i) => {
                  const count = i + 1
                  const cumulative = count * roundFeedback.factor2
                  const colors = ['#93c5fd', '#86efac', '#d8b4fe', '#fed7aa', '#d1d5db', '#fde68a', '#a5f3fc', '#f9a8d4'] // pastel blue, green, purple, orange, grey, yellow, cyan, pink
                  return (
                    <div key={i} className="mult-visual-row">
                      <div className="mult-visual-squares" style={{ backgroundColor: colors[i % colors.length] }}>
                        {Array.from({ length: roundFeedback.factor2 }, (_, j) => (
                          <span key={j} className="mult-visual-square" />
                        ))}
                      </div>
                      <div className="mult-visual-label">{cumulative}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {isCorrect && <p className="hangman-feedback-auto">Continuing...</p>}
          {!isCorrect && (
            <button type="button" className="start-btn" onClick={handleContinueAfterFeedback}>
              Continue
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="hangman-page">
        <div className="hangman-card">
          <h1 className="hangman-title">{didWin ? 'You Won!' : 'Game Over'}</h1>
          <p className="hangman-subtitle">
            Final score: {score} points • Mistakes: {mistakes}/{MAX_MISTAKES}
          </p>

          <div className="result-avatar" aria-label={didWin ? 'Happy avatar' : 'Unhappy avatar'}>
            {didWin ? '😄' : '😟'}
          </div>
          <p className="result-text">
            {didWin
              ? `${nickname || 'You'} has beaten the hangman game and is a professional!`
              : 'The hangman is complete. Better luck next time!'}
          </p>
          {isSaving && <p className="result-status">Saving your score...</p>}
          {saveError && <p className="result-error">Could not save score: {saveError}</p>}

          <div className="result-actions">
            <button type="button" className="secondary-btn" onClick={() => navigate('/leaderboard')}>
              Go to Overall Leaderboard
            </button>
            <button type="button" className="start-btn" onClick={repeatGame}>
              Repeat Hangman Game
            </button>
            <button type="button" className="secondary-btn" onClick={() => navigate('/participant-games')}>
              Back to Games Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hangman-page">
      <div className="hangman-card">
        <h1 className="hangman-title">Multiplication Hangman Game</h1>
        <p className="hangman-subtitle">
          Score: {score} • Mistakes: {mistakes}/{MAX_MISTAKES}
        </p>

        <HangmanFigure mistakes={mistakes} />

        <form className="hangman-form" onSubmit={submitAnswer}>
          <label htmlFor="hangman-answer" className="question-label">
            What is {prompt}?
          </label>
          <input
            id="hangman-answer"
            type="number"
            className="answer-input"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="start-btn">
            Submit Answer
          </button>
        </form>

      </div>
    </div>
  )
}

export default HangmanMultiplication
