import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import './LearnMultiplication.css'

const CORRECT_MESSAGE_KEYS = ['learn.correctGreat', 'learn.correctPerfect', 'learn.correctGoOn', 'learn.correctExpert', 'learn.correctAmazing', 'learn.correctWow']
function getRandomCorrectMessageKey() {
  return CORRECT_MESSAGE_KEYS[Math.floor(Math.random() * CORRECT_MESSAGE_KEYS.length)]
}

function getAvatarKeys(score) {
  if (score >= 9) return { emoji: '😄', labelKey: 'learn.amazingWork' }
  if (score >= 7) return { emoji: '🙂', labelKey: 'learn.greatJob' }
  if (score >= 5) return { emoji: '😐', labelKey: 'learn.goodEffort' }
  return { emoji: '😢', labelKey: 'learn.keepPracticing' }
}

function LearnMultiplication() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [selectedTable, setSelectedTable] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(1)
  const [answer, setAnswer] = useState('')
  const [lastKeypadDigit, setLastKeypadDigit] = useState(null) // highlight last clicked digit
  const [score, setScore] = useState(0)
  const [roundFeedback, setRoundFeedback] = useState(null) // { isCorrect, correctAnswer?, message }
  const [pendingUpdate, setPendingUpdate] = useState(null) // { nextScore, isLastQuestion }
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

  // Auto-advance after 2s when answer is correct
  useEffect(() => {
    if (!roundFeedback?.isCorrect || !pendingUpdate) return
    const t = setTimeout(handleContinueAfterFeedback, 500)
    return () => clearTimeout(t)
  }, [roundFeedback?.isCorrect, pendingUpdate])

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

  const handleKeypadDigit = (digit) => {
    setAnswer((prev) => prev + String(digit))
    setLastKeypadDigit(digit)
  }

  const handleBackspace = () => {
    setAnswer((prev) => prev.slice(0, -1))
    setLastKeypadDigit(null)
  }

  const handleAnswerChange = (event) => {
    const value = event.target.value.replace(/\D/g, '') // digits only
    setAnswer(value)
    setLastKeypadDigit(null)
  }

  const handleSubmitAnswer = (event) => {
    event.preventDefault()
    if (!selectedTable) return

    const parsedAnswer = answer === '' ? NaN : Number(answer)
    const correctAnswer = questionIndex * selectedTable
    const isCorrect = parsedAnswer === correctAnswer
    const nextScore = isCorrect ? score + 1 : score
    const isLastQuestion = questionIndex === 10

    setPendingUpdate({ nextScore, isLastQuestion })
    setRoundFeedback({
      isCorrect,
      correctAnswer,
      factor1: questionIndex,
      factor2: selectedTable,
      messageKey: isCorrect ? getRandomCorrectMessageKey() : null,
    })
  }

  const handleContinueAfterFeedback = async () => {
    if (!pendingUpdate) return
    const { nextScore, isLastQuestion } = pendingUpdate
    setRoundFeedback(null)
    setPendingUpdate(null)
    setAnswer('')

    if (isLastQuestion) {
      setScore(nextScore)
      setIsFinished(true)
      await saveScore(selectedTable, nextScore)
      return
    }

    setScore(nextScore)
    setQuestionIndex((prev) => prev + 1)
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
            {t('learn.back')}
          </button>
          <h1 className="learn-title">{t('learn.title')}</h1>
          <p className="learn-subtitle">{t('learn.subtitle')}</p>

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

  if (roundFeedback && pendingUpdate) {
    const isCorrect = roundFeedback.isCorrect
    return (
      <div className="learn-page">
        <div className="learn-card learn-feedback-card">
          <div className={`learn-feedback-emoji ${isCorrect ? 'correct' : 'wrong'}`} aria-hidden>
            {isCorrect ? '🎉' : '😕'}
          </div>
          <p className={`learn-feedback-message ${isCorrect ? 'correct' : 'wrong'}`}>
            {isCorrect
              ? t(roundFeedback.messageKey)
              : t('learn.wrong')}
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
          {isCorrect && <p className="learn-feedback-auto">{t('learn.continuing')}</p>}
          {!isCorrect && (
            <button type="button" className="primary-btn" onClick={handleContinueAfterFeedback}>
              {t('learn.continue')}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isFinished) {
    const avatar = getAvatarKeys(score)

    return (
      <div className="learn-page">
        <div className="learn-card">
          <h1 className="learn-title">{t('learn.tableOf')} {selectedTable} {t('learn.completed')}</h1>
          <p className="learn-subtitle">
            {t('learn.yourScore')} <strong>{score}/10</strong>
          </p>

          <div className="avatar-box" aria-label={t(avatar.labelKey)}>
            <span className="avatar-emoji">{avatar.emoji}</span>
            <p className="avatar-label">{t(avatar.labelKey)}</p>
          </div>

          {isSaving && <p className="status-text">{t('learn.savingScore')}</p>}
          {saveError && <p className="error-text">{t('learn.couldNotSave')} {saveError}</p>}

          <h2 className="leaderboard-title">{t('learn.leaderboardTable', { table: selectedTable })}</h2>
          {topScores.length === 0 ? (
            <p className="status-text">{t('learn.noScoresYet')}</p>
          ) : (
            <ol className="leaderboard-list">
              {topScores.map((entry, index) => (
                <li key={`${entry.user_id}-${entry.created_at}-${index}`}>
                  <span>{entry.user_id === userId ? t('learn.you') : `${t('lb.player')} ${entry.user_id.slice(0, 6)}`}</span>
                  <strong>{entry.score}/10</strong>
                </li>
              ))}
            </ol>
          )}

          <div className="finish-actions">
            <button type="button" className="primary-btn" onClick={handleRestart}>
              {t('learn.tryAgain')}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setSelectedTable(null)}>
              {t('learn.chooseAnother')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="learn-page">
      <div className="learn-card">
        <button type="button" className="back-link" onClick={() => setSelectedTable(null)}>
          {t('learn.back')}
        </button>
        <h1 className="learn-title">{t('learn.tableOf')} {selectedTable}</h1>
        <p className="learn-subtitle">
          {t('learn.questionOf', { current: questionIndex })} • {t('learn.currentScore')} {score}
        </p>

        <form className="question-form" onSubmit={handleSubmitAnswer}>
          <div className="question-row">
            <label htmlFor="answer" className="question-label">
              {currentQuestionText}?
            </label>
            <div className="answer-display-wrap">
              <input
                id="answer"
                type="text"
                inputMode="numeric"
                className="answer-input answer-display"
                value={answer}
                onChange={handleAnswerChange}
                placeholder="0"
                autoComplete="off"
                aria-label="Your answer"
              />
            </div>
            <button type="submit" className="primary-btn check-btn" disabled={answer.length === 0}>
              {t('learn.check')}
            </button>
          </div>
          <div className="keypad-wrap">
            <div className="keypad-grid">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`keypad-btn ${lastKeypadDigit === d ? 'keypad-btn-active' : ''}`}
                  onClick={() => handleKeypadDigit(d)}
                  aria-label={`Digit ${d}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="keypad-row-zero">
              <button
                type="button"
                className={`keypad-btn ${lastKeypadDigit === 0 ? 'keypad-btn-active' : ''}`}
                onClick={() => handleKeypadDigit(0)}
                aria-label="Digit 0"
              >
                0
              </button>
              <button type="button" className="keypad-btn keypad-backspace" onClick={handleBackspace} aria-label="Remove last digit">
                ⌫
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LearnMultiplication
