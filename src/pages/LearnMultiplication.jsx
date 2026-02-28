import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './LearnMultiplication.css'

function getAvatar(score) {
  if (score >= 9) return { emoji: '😄', label: 'Amazing work!' }
  if (score >= 7) return { emoji: '🙂', label: 'Great job!' }
  if (score >= 5) return { emoji: '😐', label: 'Good effort!' }
  return { emoji: '😢', label: 'Keep practicing!' }
}

function LearnMultiplication() {
  const navigate = useNavigate()
  const [selectedTable, setSelectedTable] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(1)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [userId, setUserId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [topScores, setTopScores] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
    }

    loadUser()
  }, [])

  const currentQuestionText = useMemo(() => {
    if (!selectedTable) return ''
    return `${questionIndex} x ${selectedTable}`
  }, [questionIndex, selectedTable])

  const handleTableSelect = (tableNumber) => {
    setSelectedTable(tableNumber)
    setQuestionIndex(1)
    setAnswer('')
    setScore(0)
    setIsFinished(false)
    setSaveError('')
    setTopScores([])
  }

  const loadLeaderboard = async (tableNumber) => {
    const { data, error } = await supabase
      .from('multiplication_scores')
      .select('user_id, score, created_at')
      .eq('table_number', tableNumber)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) {
      setSaveError(error.message)
      return
    }

    setTopScores(data ?? [])
  }

  const saveScore = async (tableNumber, finalScore) => {
    if (!userId) return

    setIsSaving(true)
    setSaveError('')

    const { error } = await supabase.from('multiplication_scores').insert({
      user_id: userId,
      table_number: tableNumber,
      score: finalScore,
      total_questions: 10,
    })

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
      return
    }

    await loadLeaderboard(tableNumber)
    setIsSaving(false)
  }

  const handleSubmitAnswer = async (event) => {
    event.preventDefault()
    if (!selectedTable) return

    const parsedAnswer = Number(answer)
    const correctAnswer = questionIndex * selectedTable
    const isCorrect = parsedAnswer === correctAnswer
    const nextScore = isCorrect ? score + 1 : score

    if (questionIndex === 10) {
      setScore(nextScore)
      setIsFinished(true)
      await saveScore(selectedTable, nextScore)
      return
    }

    setScore(nextScore)
    setQuestionIndex((prev) => prev + 1)
    setAnswer('')
  }

  const handleRestart = () => {
    if (!selectedTable) return
    handleTableSelect(selectedTable)
  }

  if (!selectedTable) {
    return (
      <div className="learn-page">
        <div className="learn-card">
          <button type="button" className="back-link" onClick={() => navigate('/participant-games')}>
            ← Back to Games
          </button>
          <h1 className="learn-title">Learn Multiplication Tables</h1>
          <p className="learn-subtitle">Choose a multiplication table (1 to 10)</p>

          <div className="table-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tableNumber) => (
              <button
                key={tableNumber}
                type="button"
                className="table-btn"
                onClick={() => handleTableSelect(tableNumber)}
              >
                {tableNumber}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isFinished) {
    const avatar = getAvatar(score)

    return (
      <div className="learn-page">
        <div className="learn-card">
          <h1 className="learn-title">Table of {selectedTable} Completed!</h1>
          <p className="learn-subtitle">
            Your score: <strong>{score}/10</strong>
          </p>

          <div className="avatar-box" aria-label={`Performance avatar: ${avatar.label}`}>
            <span className="avatar-emoji">{avatar.emoji}</span>
            <p className="avatar-label">{avatar.label}</p>
          </div>

          {isSaving && <p className="status-text">Saving your score...</p>}
          {saveError && <p className="error-text">Could not save score: {saveError}</p>}

          <h2 className="leaderboard-title">Leaderboard (Table {selectedTable})</h2>
          {topScores.length === 0 ? (
            <p className="status-text">No scores yet for this table.</p>
          ) : (
            <ol className="leaderboard-list">
              {topScores.map((entry, index) => (
                <li key={`${entry.user_id}-${entry.created_at}-${index}`}>
                  <span>{entry.user_id === userId ? 'You' : `Player ${entry.user_id.slice(0, 6)}`}</span>
                  <strong>{entry.score}/10</strong>
                </li>
              ))}
            </ol>
          )}

          <div className="finish-actions">
            <button type="button" className="primary-btn" onClick={handleRestart}>
              Try Again
            </button>
            <button type="button" className="secondary-btn" onClick={() => setSelectedTable(null)}>
              Choose Another Table
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="learn-page">
      <div className="learn-card">
        <h1 className="learn-title">Table of {selectedTable}</h1>
        <p className="learn-subtitle">
          Question {questionIndex} of 10 • Current score: {score}
        </p>

        <form className="question-form" onSubmit={handleSubmitAnswer}>
          <label htmlFor="answer" className="question-label">
            What is {currentQuestionText}?
          </label>
          <input
            id="answer"
            type="number"
            className="answer-input"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="primary-btn">
            Submit
          </button>
        </form>
      </div>
    </div>
  )
}

export default LearnMultiplication
