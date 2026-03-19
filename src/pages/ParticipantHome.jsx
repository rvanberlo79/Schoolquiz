import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './ParticipantHome.css'

function ParticipantHome() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="participant-home-page">
      <div className="participant-home-card">
        <button
          type="button"
          className="participant-home-back"
          onClick={() => navigate('/role-selection')}
        >
          {t('phome.back')}
        </button>
        <h1 className="participant-home-title">{t('phome.title')}</h1>
        <p className="participant-home-subtitle">{t('phome.subtitle')}</p>

        <div className="participant-home-options">
          <button
            type="button"
            className="participant-home-option"
            onClick={() => navigate('/participant-games')}
          >
            <span className="participant-home-icon">🎮</span>
            <span className="participant-home-label">{t('phome.chooseGame')}</span>
            <span className="participant-home-desc">{t('phome.chooseGameDesc')}</span>
          </button>

          <button
            type="button"
            className="participant-home-option"
            onClick={() => navigate('/leaderboard')}
          >
            <span className="participant-home-icon">🏆</span>
            <span className="participant-home-label">{t('phome.leaderboard')}</span>
            <span className="participant-home-desc">{t('phome.leaderboardDesc')}</span>
          </button>

          <button
            type="button"
            className="participant-home-option"
            onClick={() => navigate('/settings')}
          >
            <span className="participant-home-icon">⚙️</span>
            <span className="participant-home-label">{t('phome.settings')}</span>
            <span className="participant-home-desc">{t('phome.settingsDesc')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ParticipantHome
