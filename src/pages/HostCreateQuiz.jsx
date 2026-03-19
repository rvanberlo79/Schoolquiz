import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './HostCreateQuiz.css'

function HostCreateQuiz() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleManualCreation = () => {
    navigate('/host/quiz/manual')
  }

  const handleAIGeneration = () => {
    navigate('/host/quiz/ai')
  }

  return (
    <div className="host-create-quiz-page">
      <button
        type="button"
        className="host-create-quiz-back"
        onClick={() => navigate('/role-selection')}
        aria-label={t('hostCreateQuiz.back')}
      >
        {t('hostCreateQuiz.back')}
      </button>

      <h1 className="host-create-quiz-title">{t('hostCreateQuiz.title')}</h1>
      <p className="host-create-quiz-subtitle">{t('hostCreateQuiz.subtitle')}</p>

      <div className="host-create-quiz-cards">
        <button
          type="button"
          className="host-create-quiz-card host-create-quiz-card-manual"
          onClick={handleManualCreation}
          aria-label={`${t('hostCreateQuiz.manual.title')} - ${t('hostCreateQuiz.manual.desc')}`}
        >
          <div className="host-create-quiz-card-icon host-create-quiz-card-icon-manual" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
            </svg>
          </div>
          <h2 className="host-create-quiz-card-title">{t('hostCreateQuiz.manual.title')}</h2>
          <p className="host-create-quiz-card-desc">{t('hostCreateQuiz.manual.desc')}</p>
          <ul className="host-create-quiz-card-list">
            <li>{t('hostCreateQuiz.manual.1')}</li>
            <li>{t('hostCreateQuiz.manual.2')}</li>
            <li>{t('hostCreateQuiz.manual.3')}</li>
          </ul>
        </button>

        <button
          type="button"
          className="host-create-quiz-card host-create-quiz-card-ai"
          onClick={handleAIGeneration}
          aria-label={`${t('hostCreateQuiz.ai.title')} - ${t('hostCreateQuiz.ai.desc')}`}
        >
          <span className="host-create-quiz-ai-badge" aria-hidden>AI</span>
          <div className="host-create-quiz-card-icon host-create-quiz-card-icon-ai" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 className="host-create-quiz-card-title">{t('hostCreateQuiz.ai.title')}</h2>
          <p className="host-create-quiz-card-desc">{t('hostCreateQuiz.ai.desc')}</p>
          <ul className="host-create-quiz-card-list">
            <li>{t('hostCreateQuiz.ai.1')}</li>
            <li>{t('hostCreateQuiz.ai.2')}</li>
            <li>{t('hostCreateQuiz.ai.3')}</li>
          </ul>
        </button>
      </div>
    </div>
  )
}

export default HostCreateQuiz
