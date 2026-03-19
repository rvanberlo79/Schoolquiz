import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './HostCreateQuiz.css'

function HostQuizManual() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="host-create-quiz-page">
      <button
        type="button"
        className="host-create-quiz-back"
        onClick={() => navigate('/host/create-quiz')}
        aria-label={t('hostCreateQuiz.back')}
      >
        ← {t('hostCreateQuiz.backToCreate')}
      </button>
      <h1 className="host-create-quiz-title">{t('hostCreateQuiz.manual.title')}</h1>
      <p className="host-create-quiz-subtitle">{t('hostCreateQuiz.manualComingSoon')}</p>
    </div>
  )
}

export default HostQuizManual
