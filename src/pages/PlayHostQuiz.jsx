import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import './PlayHostQuiz.css'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function PlayHostQuiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [phase, setPhase] = useState('playing') // 'playing' | 'feedback' | 'finished'

  useEffect(() => {
    const load = async () => {
      if (!quizId) {
        setError(t('playHostQuiz.notFound'))
        setLoading(false)
        return
      }
      const { data: quizData, error: quizErr } = await supabase
        .from('host_quizzes')
        .select('id, title, time_limit_seconds')
        .eq('id', quizId)
        .eq('published', true)
        .single()
      if (quizErr || !quizData) {
        setError(t('playHostQuiz.notFound'))
        setLoading(false)
        return
      }
      const { data: questionsData, error: qErr } = await supabase
        .from('quiz_questions')
        .select('id, question_text, correct_answer, wrong_answers, position')
        .eq('quiz_id', quizId)
        .order('position')
      if (qErr || !questionsData?.length) {
        setError(t('playHostQuiz.noQuestions'))
        setLoading(false)
        return
      }
      setQuiz(quizData)
      setQuestions(questionsData)
      setTimeLeft(quizData.time_limit_seconds)
      const opts = shuffle([
        questionsData[0].correct_answer,
        ...(questionsData[0].wrong_answers || []).slice(0, 3),
      ])
      setOptions(opts)
      setLoading(false)
    }
    load()
  }, [quizId, t])

  const currentQuestion = questions[currentIndex]

  const moveToNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('finished')
      return
    }
    const nextIdx = currentIndex + 1
    setCurrentIndex(nextIdx)
    const q = questions[nextIdx]
    const opts = shuffle([
      q.correct_answer,
      ...(q.wrong_answers || []).slice(0, 3),
    ])
    setOptions(opts)
    setSelectedAnswer(null)
    setTimeLeft(quiz?.time_limit_seconds ?? 30)
    setPhase('playing')
  }, [currentIndex, questions, quiz?.time_limit_seconds])

  useEffect(() => {
    if (phase !== 'playing' || timeLeft === null || !currentQuestion) return
    if (timeLeft <= 0) {
      setPhase('feedback')
      return
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(timer)
  }, [phase, timeLeft, currentQuestion])

  const handleSelect = (answer) => {
    if (phase !== 'playing' || selectedAnswer) return
    setSelectedAnswer(answer)
    const correct = answer === currentQuestion.correct_answer
    if (correct) setScore((s) => s + 1)
    setPhase('feedback')
  }

  if (loading) {
    return (
      <div className="play-host-quiz-page">
        <p className="play-host-quiz-loading">{t('playHostQuiz.loading')}</p>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="play-host-quiz-page">
        <p className="play-host-quiz-error">{error}</p>
        <button type="button" className="play-host-quiz-back" onClick={() => navigate('/participant-games')}>
          {t('playHostQuiz.backToGames')}
        </button>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="play-host-quiz-page">
        <div className="play-host-quiz-finished">
          <h1 className="play-host-quiz-finished-title">{t('playHostQuiz.finishedTitle')}</h1>
          <p className="play-host-quiz-finished-score">
            {t('playHostQuiz.score')}: {score} / {questions.length}
          </p>
          <button type="button" className="play-host-quiz-btn" onClick={() => navigate('/participant-games')}>
            {t('playHostQuiz.backToGames')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="play-host-quiz-page">
      <button type="button" className="play-host-quiz-back" onClick={() => navigate('/participant-games')}>
        {t('playHostQuiz.back')}
      </button>
      <div className="play-host-quiz-progress">
        {t('playHostQuiz.question')} {currentIndex + 1} / {questions.length}
      </div>
      {phase === 'playing' && timeLeft !== null && (
        <div className="play-host-quiz-timer">
          {timeLeft} {t('hostQuizAI.seconds')}
        </div>
      )}
      <h2 className="play-host-quiz-question-text">{currentQuestion?.question_text}</h2>
      <ul className="play-host-quiz-options">
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt
          const isCorrect = opt === currentQuestion?.correct_answer
          const showCorrect = phase === 'feedback' && isCorrect
          const showWrong = phase === 'feedback' && isSelected && !isCorrect
          return (
            <li key={opt}>
              <button
                type="button"
                className={`play-host-quiz-option ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                onClick={() => handleSelect(opt)}
                disabled={phase === 'feedback'}
              >
                {opt}
              </button>
            </li>
          )
        })}
      </ul>
      {phase === 'feedback' && (
        <div className="play-host-quiz-feedback">
          <p>
            {selectedAnswer === currentQuestion?.correct_answer
              ? t('playHostQuiz.correct')
              : t('playHostQuiz.incorrect', { correct: currentQuestion?.correct_answer })}
          </p>
          <button type="button" className="play-host-quiz-btn" onClick={moveToNext}>
            {currentIndex + 1 >= questions.length ? t('playHostQuiz.seeResults') : t('playHostQuiz.next')}
          </button>
        </div>
      )}
    </div>
  )
}

export default PlayHostQuiz
