import { useNavigate } from 'react-router-dom'
import './ParticipantHome.css'

function ParticipantHome() {
  const navigate = useNavigate()

  return (
    <div className="participant-home-page">
      <div className="participant-home-card">
        <button
          type="button"
          className="participant-home-back"
          onClick={() => navigate('/role-selection')}
        >
          ← Back to role selection
        </button>
        <h1 className="participant-home-title">Participant</h1>
        <p className="participant-home-subtitle">What would you like to do?</p>

        <div className="participant-home-options">
          <button
            type="button"
            className="participant-home-option"
            onClick={() => navigate('/participant-games')}
          >
            <span className="participant-home-icon">🎮</span>
            <span className="participant-home-label">Choose a New Game</span>
            <span className="participant-home-desc">Play learning games and practice</span>
          </button>

          <button
            type="button"
            className="participant-home-option"
            onClick={() => navigate('/leaderboard')}
          >
            <span className="participant-home-icon">🏆</span>
            <span className="participant-home-label">Overall Leaderboard</span>
            <span className="participant-home-desc">See how you rank against others</span>
          </button>

          <button
            type="button"
            className="participant-home-option"
            onClick={() => navigate('/settings')}
          >
            <span className="participant-home-icon">⚙️</span>
            <span className="participant-home-label">User Settings</span>
            <span className="participant-home-desc">Set your nickname for the leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ParticipantHome
