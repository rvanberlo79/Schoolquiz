import { useNavigate } from 'react-router-dom'
import './ParticipantGames.css'

function ParticipantGames() {
  const navigate = useNavigate()

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
          ← Back to Participant
        </button>

        <h1 className="games-title">Choose a New Game</h1>
        <p className="games-subtitle">Pick how you want to practice multiplication</p>

        <div className="games-grid">
          <div className="game-option blue">
            <div className="game-icon">📘</div>
            <h2>Learn Multiplication Tables</h2>
            <p>Practice tables step by step and build confidence.</p>
            <ul>
              <li>Guided table exercises</li>
              <li>Increasing difficulty</li>
              <li>Progress-focused practice</li>
            </ul>
            <button type="button" className="enter-game-btn" onClick={handleStartLearning}>
              Start Learning
            </button>
          </div>

          <div className="game-option green">
            <div className="game-icon">🎮</div>
            <h2>Play Multiplication Table Game</h2>
            <p>Play a fast game mode and test your multiplication speed.</p>
            <ul>
              <li>Quick game rounds</li>
              <li>Score-based challenge</li>
              <li>Fun and competitive play</li>
            </ul>
            <button type="button" className="enter-game-btn" onClick={handlePlayGame}>
              Play Game
            </button>
          </div>

          <div className="game-option orange">
            <div className="game-icon">➕</div>
            <h2>Play Addition Game</h2>
            <p>Practice addition with sums and build your mental math skills.</p>
            <ul>
              <li>Addition sums to solve</li>
              <li>Adjustable difficulty</li>
              <li>Track your progress</li>
            </ul>
            <button type="button" className="enter-game-btn" onClick={handlePlayAdditionGame}>
              Play Addition Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParticipantGames
