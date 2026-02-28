import { useNavigate } from 'react-router-dom'
import './RoleSelection.css'

function RoleSelection() {
  const navigate = useNavigate()

  const handleSelectRole = (role) => {
    if (role === 'participant') {
      navigate('/participant')
      return
    }

    navigate('/home')
  }

  return (
    <div className="role-page-container">
      <div className="role-card">
        <h1 className="role-title">LevelUp Learning</h1>
        <p className="role-subtitle">Choose your role to get started</p>

        <div className="role-options">
          <button
            type="button"
            className="role-option-card"
            onClick={() => handleSelectRole('host')}
            aria-label="Host - Create and manage game sessions"
          >
            <div className="role-icon-circle host-icon">👑</div>
            <h2 className="role-option-title">Host</h2>
            <p className="role-option-text">
              Create and manage game sessions. Control the game flow and see participant responses.
            </p>
            <ul className="role-option-list">
              <li>Create custom games</li>
              <li>Generate room codes</li>
              <li>Manage participants</li>
              <li>Control game timing</li>
            </ul>
          </button>

          <button
            type="button"
            className="role-option-card"
            onClick={() => handleSelectRole('participant')}
            aria-label="Participant - Join and answer game questions"
          >
            <div className="role-icon-circle participant-icon">👥</div>
            <h2 className="role-option-title">Participant</h2>
            <p className="role-option-text">
              Join game sessions using room codes. Answer questions and compete with others.
            </p>
            <ul className="role-option-list">
              <li>Join with room codes</li>
              <li>Answer game questions</li>
              <li>See live leaderboards</li>
              <li>Compete with others</li>
            </ul>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection
