import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './HangmanMultiplication.css'

const MAX_MISTAKES = 6
const TARGET_SCORE = 21 // more than 20 points

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
  const [userId, setUserId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [topScores, setTopScores] = useState([])

  const canStart = selectedTables.length > 0

  const prompt = useMemo(() => {
    if (!question) return ''
    return `${question.multiplier} x ${question.table}`
  }, [question])

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
    }

    loadUser()
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

  const submitAnswer = async (event) => {
    event.preventDefault()
    if (!question) return

    const parsed = Number(answer)
    const isCorrect = parsed === question.correctAnswer
    const nextScore = isCorrect ? score + 1 : score
    const nextMistakes = isCorrect ? mistakes : mistakes + 1

    setScore(nextScore)
    setMistakes(nextMistakes)
    setFeedback(isCorrect ? 'Correct! +1 point' : `Incorrect. Correct answer: ${question.correctAnswer}`)
    setAnswer('')

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
              ? 'Great work! You reached more than 20 points before the hangman was completed.'
              : 'The hangman is complete. Better luck next time!'}
          </p>
          {isSaving && <p className="result-status">Saving your score...</p>}
          {saveError && <p className="result-error">Could not save score: {saveError}</p>}

          <h2 className="leaderboard-title">Hangman Leaderboard</h2>
          {topScores.length === 0 ? (
            <p className="result-status">No scores yet.</p>
          ) : (
            <ol className="leaderboard-list">
              {topScores.map((entry, index) => (
                <li key={`${entry.user_id}-${entry.created_at}-${index}`}>
                  <span>{entry.user_id === userId ? 'You' : `Player ${entry.user_id.slice(0, 6)}`}</span>
                  <strong>{entry.score} pts {entry.won ? '🏆' : ''}</strong>
                </li>
              ))}
            </ol>
          )}

          <div className="result-actions">
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

        {feedback && <p className="feedback-text">{feedback}</p>}
      </div>
    </div>
  )
}

export default HangmanMultiplication
