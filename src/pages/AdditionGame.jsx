import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdditionGame.css'

const QUESTIONS_TOTAL = 10
const ROCK_SLOTS_Y = [22, 37, 52, 67] // percent of container height
const ROCK_START_X = 8
const TANK_X = 82
const ROCK_SPEED = 0.08
const AIM_THRESHOLD = 8 // max percent distance to consider "aimed" at a slot

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateQuestion() {
  const a = Math.floor(Math.random() * 12) + 1
  const b = Math.floor(Math.random() * 12) + 1
  const correct = a + b
  const wrongs = new Set()
  while (wrongs.size < 3) {
    const offset = (Math.floor(Math.random() * 7) - 3) || 1
    const w = correct + offset
    if (w >= 0 && w !== correct) wrongs.add(w)
  }
  const options = shuffle([correct, ...Array.from(wrongs)])
  return { a, b, correct, options }
}

/** Build rows of bundles of 10: each row has { squares, circles, label } */
function buildBundles(a, b) {
  const rows = []
  let remainingA = a
  let remainingB = b
  while (remainingA > 0 || remainingB > 0) {
    const squaresInRow = Math.min(10, remainingA)
    const circlesInRow = Math.min(10 - squaresInRow, remainingB)
    const rowSum = squaresInRow + circlesInRow
    rows.push({ squares: squaresInRow, circles: circlesInRow, label: rowSum })
    remainingA -= squaresInRow
    remainingB -= circlesInRow
  }
  return rows
}

/** Render one row as a single sequence: first all squares, then all circles. Dashed line only after 5th, 10th, 15th… shape overall. */
function renderRowWithFivesSeparators(squaresCount, circlesCount, keyPrefix) {
  const total = squaresCount + circlesCount
  const result = []
  let key = 0
  let pos = 0
  while (pos < total) {
    const groupSize = Math.min(5, total - pos)
    const shapes = []
    for (let i = 0; i < groupSize; i++) {
      const idx = pos + i
      const isSquare = idx < squaresCount
      shapes.push(
        <span
          key={i}
          className={`shape ${isSquare ? 'square' : 'circle'}`}
        />
      )
    }
    result.push(
      <div key={`${keyPrefix}-${key++}`} className="addition-feedback-shapes addition-feedback-shapes-mixed">
        {shapes}
      </div>
    )
    pos += groupSize
    if (groupSize === 5 && pos < total) result.push(<span key={`${keyPrefix}-dash-${key++}`} className="addition-feedback-dash" />)
  }
  return result
}

function AdditionGame() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [score, setScore] = useState(0)
  const [roundsCompleted, setRoundsCompleted] = useState(0) // 0..9 while playing; after 10th we go to finished
  const [gameState, setGameState] = useState('playing') // 'playing' | 'finished'
  const [finalScore, setFinalScore] = useState(0) // stored when game ends for result screen
  const [saveError, setSaveError] = useState('')
  const initialQ = useRef(null)
  if (initialQ.current === null) initialQ.current = generateQuestion()
  const [question, setQuestion] = useState(initialQ.current)
  const [rocks, setRocks] = useState(() =>
    initialQ.current.options.map((value, id) => ({
      id,
      value,
      x: ROCK_START_X,
      y: ROCK_SLOTS_Y[id],
      exploded: false,
    }))
  )
  const [tankY, setTankY] = useState(50)
  const [explosion, setExplosion] = useState(null) // null | 'rock' | 'tank'
  const [explosionPosition, setExplosionPosition] = useState(null) // { x, y } in percent
  const [roundBlocked, setRoundBlocked] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackData, setFeedbackData] = useState(null) // { a, b, correct, answerGiven, result: 'correct'|'wrong'|'too_late' }
  const mouseYRef = useRef(50)
  const tankYRef = useRef(50)
  const questionRef = useRef(question)
  useEffect(() => {
    questionRef.current = question
  }, [question])
  useEffect(() => {
    tankYRef.current = tankY
  }, [tankY])

  const startNewRound = useCallback(() => {
    const q = generateQuestion()
    setQuestion(q)
    setRocks(
      q.options.map((value, id) => ({
        id,
        value,
        x: ROCK_START_X,
        y: ROCK_SLOTS_Y[id],
        exploded: false,
      }))
    )
    setExplosion(null)
    setExplosionPosition(null)
    setRoundBlocked(false)
  }, [])

  // Mouse move: update tank Y (percent). Re-attach when arena is visible (e.g. after feedback).
  useEffect(() => {
    if (showFeedback || gameState !== 'playing') return
    const el = containerRef.current
    if (!el) return

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const y = ((e.clientY - rect.top) / rect.height) * 100
      const clamped = Math.max(5, Math.min(95, y))
      mouseYRef.current = clamped
      tankYRef.current = clamped
      setTankY(clamped)
    }

    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [showFeedback, gameState])

  // Click: fire at aimed rock
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onClick = () => {
      if (gameState !== 'playing' || roundBlocked) return

      const rect = el.getBoundingClientRect()
      const tankYPercent = (mouseYRef.current / 100) * rect.height

      let aimedIndex = 0
      let minDist = Infinity
      ROCK_SLOTS_Y.forEach((slotYPercent, i) => {
        const slotY = (slotYPercent / 100) * rect.height
        const dist = Math.abs(slotY - tankYPercent)
        if (dist < minDist) {
          minDist = dist
          aimedIndex = i
        }
      })

      const slotHeight = rect.height / 100 * AIM_THRESHOLD
      if (minDist > slotHeight) return

      const aimedRock = rocks[aimedIndex]
      if (!aimedRock || aimedRock.exploded) return

      setRoundBlocked(true)

      if (aimedRock.value === question.correct) {
        setExplosion('rock')
        setExplosionPosition({ x: aimedRock.x, y: aimedRock.y })
        setScore((s) => s + 1)
        setRocks((prev) =>
          prev.map((r) => (r.id === aimedIndex ? { ...r, exploded: true } : r))
        )
        setFeedbackData({
          a: question.a,
          b: question.b,
          correct: question.correct,
          answerGiven: aimedRock.value,
          result: 'correct',
        })
      } else {
        setExplosion('tank')
        setExplosionPosition({ x: TANK_X, y: tankY })
        setFeedbackData({
          a: question.a,
          b: question.b,
          correct: question.correct,
          answerGiven: aimedRock.value,
          result: 'wrong',
        })
      }

      setTimeout(() => setShowFeedback(true), 700)
    }

    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [showFeedback, gameState, roundBlocked, question.correct, rocks, startNewRound])

  // Animation: move rocks right; check rock hits tank
  useEffect(() => {
    if (gameState !== 'playing' || roundBlocked) return

    const tick = () => {
      setRocks((prev) => {
        const next = prev.map((r) =>
          r.exploded ? r : { ...r, x: r.x + ROCK_SPEED }
        )
        const anyHit = next.some((r) => !r.exploded && r.x >= TANK_X)
        if (anyHit) {
          setRoundBlocked(true)
          setExplosion('tank')
          setExplosionPosition({ x: TANK_X, y: tankYRef.current })
          const q = questionRef.current
          if (q) {
            setFeedbackData({
              a: q.a,
              b: q.b,
              correct: q.correct,
              answerGiven: null,
              result: 'too_late',
            })
          }
          setTimeout(() => setShowFeedback(true), 700)
        }
        return next
      })
    }

    const id = setInterval(tick, 16)
    return () => clearInterval(id)
  }, [gameState, roundBlocked, startNewRound])

  const handleContinueFromFeedback = useCallback(async () => {
    const nextCompleted = roundsCompleted + 1
    setShowFeedback(false)
    setFeedbackData(null)

    if (nextCompleted >= QUESTIONS_TOTAL) {
      // Include 10th question: score may already have it (state update) or not (batching). Clamp to 0-10.
      const withTenth = score + (feedbackData?.result === 'correct' ? 1 : 0)
      const total = Math.min(QUESTIONS_TOTAL, Math.max(0, withTenth))
      setFinalScore(total)
      setGameState('finished')
      setSaveError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { error } = await supabase.from('addition_scores').insert({
          user_id: user.id,
          score: total,
          total_questions: QUESTIONS_TOTAL,
        })
        if (error) setSaveError(error.message)
      }
      return
    }
    setRoundsCompleted(nextCompleted)
    startNewRound()
  }, [startNewRound, roundsCompleted, score, feedbackData?.result])

  if (showFeedback && feedbackData) {
    const { a, b, correct, answerGiven, result } = feedbackData
    const bundles = buildBundles(a, b)
    const isCorrect = result === 'correct'

    return (
      <div className="addition-game-page addition-feedback-page">
        <div className="addition-feedback-card">
          <button
            type="button"
            className="addition-game-back"
            onClick={() => navigate('/participant-games')}
          >
            ← Back to Games
          </button>
          <div className="addition-feedback-problem">{a} + {b} ?</div>

          <div className="addition-feedback-visual">
            {bundles.map((row, i) => (
              <div key={i} className="addition-feedback-row">
                <div className="addition-feedback-row-inner">
                  {renderRowWithFivesSeparators(row.squares, row.circles, i)}
                </div>
                <div className="addition-feedback-row-label">{row.label}</div>
              </div>
            ))}
          </div>

          <p className="addition-feedback-text">
            {isCorrect && (
              <>You gave the answer {correct}. You had the answer right!</>
            )}
            {result === 'wrong' && (
              <>You gave the answer {answerGiven}. The right answer is {correct}. Good try, keep on trying.</>
            )}
            {result === 'too_late' && (
              <>You were too late. The right answer is {correct}. Good try, keep on trying.</>
            )}
          </p>

          <div className="addition-feedback-avatar" aria-hidden="true">
            {isCorrect ? (
              <span className="avatar-cheering" aria-label="Cheering children">🙌 👧 👦 🎉</span>
            ) : (
              <span className="avatar-sad" aria-label="Sad dog">😢 🐕</span>
            )}
          </div>

          <button
            type="button"
            className="addition-game-btn addition-feedback-continue"
            onClick={handleContinueFromFeedback}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (gameState === 'finished') {
    return (
      <div className="addition-game-page">
        <div className="addition-game-card addition-game-result">
          <button
            type="button"
            className="addition-game-back"
            onClick={() => navigate('/participant-games')}
          >
            ← Back to Games
          </button>
          <h1 className="addition-game-title">Game complete!</h1>
          <p className="addition-game-subtitle">
            You got {finalScore} out of {QUESTIONS_TOTAL} correct. {finalScore >= 7 ? 'Great job!' : 'Keep practising!'}
          </p>
          {saveError && <p className="addition-game-error">{saveError}</p>}
          <div className="result-avatar">😄</div>
          <div className="result-actions">
            <button
              type="button"
              className="addition-game-btn"
              onClick={() => {
                setScore(0)
                setRoundsCompleted(0)
                setGameState('playing')
                setFeedbackData(null)
                setFinalScore(0)
                startNewRound()
              }}
            >
              Play Again
            </button>
            <button
              type="button"
              className="addition-game-btn secondary"
              onClick={() => navigate('/participant-games')}
            >
              Back to Games Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="addition-game-page addition-game-play">
      <button
        type="button"
        className="addition-game-back-fixed"
        onClick={() => navigate('/participant-games')}
      >
        ← Back to Games
      </button>

      <div className="addition-game-question-bar">
        {question.a} + {question.b}?
      </div>

      <div className="addition-game-score">Score: {score} / {QUESTIONS_TOTAL} — Question {roundsCompleted + 1} of {QUESTIONS_TOTAL}</div>

      <div className="addition-game-arena" ref={containerRef}>
        <div className="addition-rocks">
          {rocks.map((rock) => (
            <div
              key={rock.id}
              className={`addition-rock ${rock.exploded ? 'exploded' : ''} ${explosion === 'rock' && rock.exploded ? 'explode-anim' : ''}`}
              style={{
                left: `${rock.x}%`,
                top: `${rock.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {rock.value}
            </div>
          ))}
        </div>

        <div
          className={`addition-tank ${explosion === 'tank' ? 'tank-explode' : ''}`}
          style={{
            left: `${TANK_X}%`,
            top: `${tankY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="tank-body" />
          <div className="tank-cannon" />
        </div>

        {explosion && (
          <div
            className={`addition-explosion ${explosion}`}
            style={
              explosionPosition
                ? { left: `${explosionPosition.x}%`, top: `${explosionPosition.y}%` }
                : undefined
            }
          >
            💥
          </div>
        )}
      </div>

      <p className="addition-game-hint">
        Move the tank with your mouse and click to shoot the rock with the correct answer. {QUESTIONS_TOTAL} questions total — 1 point per correct answer. If a rock reaches the tank, no point for that question.
      </p>
    </div>
  )
}

export default AdditionGame
