import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { supabase, getSupabaseUrl, getSupabaseAnonKey } from '../lib/supabase'
import './HostQuizAI.css'

const TIME_LIMIT_OPTIONS = [15, 30, 45, 60]
const MAX_IMAGE_DIMENSION = 1024
const MAX_IMAGE_QUALITY = 0.85

/** Decode JWT payload without verification (to check issuer). Returns null if invalid. */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Resize and compress image to reduce request body size (avoids "Failed to send request" from large payloads). */
function compressImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      let width = w
      let height = h
      if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
        if (w > h) {
          width = MAX_IMAGE_DIMENSION
          height = Math.round((h * MAX_IMAGE_DIMENSION) / w)
        } else {
          height = MAX_IMAGE_DIMENSION
          width = Math.round((w * MAX_IMAGE_DIMENSION) / h)
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null)
            return
          }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Failed to read compressed image'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        MAX_IMAGE_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function HostQuizAI() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const fileInputRef = useRef(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [topicDescription, setTopicDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState(30)
  const [numQuestions, setNumQuestions] = useState(10)
  const [generatedQuestions, setGeneratedQuestions] = useState(null)
  const [savedQuizId, setSavedQuizId] = useState(null)
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError(t('hostQuizAI.invalidImage'))
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
    setGeneratedQuestions(null)
    setSavedQuizId(null)
  }

  const handleGenerate = async () => {
    if (!imageFile || !imagePreview) {
      setError(t('hostQuizAI.uploadRequired'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      let imageBase64 = imagePreview
      try {
        const compressed = await compressImageAsBase64(imageFile)
        if (compressed) imageBase64 = compressed
      } catch (_) {
        // Fallback to original if compression fails (e.g. not an image the canvas can draw)
      }

      const baseUrl = getSupabaseUrl()
      if (!baseUrl) throw new Error(t('hostQuizAI.generateFailed'))

      // Use only a freshly refreshed session so the access_token is valid (cached session can be expired → "Invalid JWT")
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      const session = data?.session
      if (refreshError || !session?.access_token) {
        throw new Error(t('hostQuizAI.sessionExpired'))
      }

      const anonKey = getSupabaseAnonKey()
      if (!anonKey) throw new Error(t('hostQuizAI.generateFailed'))

      // Ensure the session was issued by the same Supabase project as in .env (avoids "Invalid JWT" when URL/key point to another project)
      const payload = decodeJwtPayload(session.access_token)
      const issuer = payload?.iss ?? ''
      const configuredHost = baseUrl.replace(/^https?:\/\//, '').split('/')[0]
      const issuerHost = issuer.replace(/^https?:\/\//, '').split('/')[0]
      if (issuer && configuredHost && issuerHost !== configuredHost) {
        throw new Error(
          t('hostQuizAI.projectMismatch', {
            configured: configuredHost,
            token: issuerHost,
          })
        )
      }

      const res = await fetch(`${baseUrl}/functions/v1/generate-quiz-from-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          imageBase64,
          topicDescription: topicDescription.trim() || undefined,
          numQuestions: Math.min(50, Math.max(1, Number(numQuestions) || 10)),
        }),
      })

      const responseData = await res.json().catch(() => ({}))
      if (!res.ok) {
        let msg = responseData?.error || responseData?.message || responseData?.details || `Error ${res.status}`
        if (typeof msg !== 'string') msg = JSON.stringify(msg)
        if (res.status === 401) {
          msg = t('hostQuizAI.invalidJwtHint', { configured: configuredHost })
        }
        throw new Error(msg)
      }
      if (responseData?.error) {
        const details = responseData.details ? ` (${responseData.details})` : ''
        throw new Error(`${responseData.error}${details}`)
      }
      if (!responseData?.questions?.length) throw new Error(t('hostQuizAI.noQuestionsReturned'))
      setGeneratedQuestions(responseData.questions)
    } catch (err) {
      setError(err.message || t('hostQuizAI.generateFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveQuiz = async () => {
    if (!generatedQuestions?.length) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError(t('hostQuizAI.notSignedIn'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const title = topicDescription.trim().slice(0, 80) || t('hostQuizAI.untitledQuiz')
      const { data: quiz, error: quizError } = await supabase
        .from('host_quizzes')
        .insert({
          created_by: user.id,
          title,
          time_limit_seconds: timeLimit,
          published: false,
        })
        .select('id')
        .single()
      if (quizError) throw quizError
      if (!quiz?.id) throw new Error('Failed to create quiz')

      const rows = generatedQuestions.map((q, i) => ({
        quiz_id: quiz.id,
        question_text: q.questionText,
        correct_answer: q.correctAnswer,
        wrong_answers: Array.isArray(q.wrongAnswers) ? q.wrongAnswers : [],
        position: i,
      }))
      const { error: questionsError } = await supabase.from('quiz_questions').insert(rows)
      if (questionsError) throw questionsError
      setSavedQuizId(quiz.id)
    } catch (err) {
      setError(err.message || t('hostQuizAI.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!savedQuizId) return
    setPublishing(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('host_quizzes')
        .update({ published: true })
        .eq('id', savedQuizId)
      if (updateError) throw updateError
      setPublished(true)
    } catch (err) {
      setError(err.message || t('hostQuizAI.publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const isPublished = published

  return (
    <div className="host-quiz-ai-page">
      <button
        type="button"
        className="host-quiz-ai-back"
        onClick={() => navigate('/host/create-quiz')}
        aria-label={t('hostQuizAI.back')}
      >
        {t('hostQuizAI.back')}
      </button>

      <div className="host-quiz-ai-header">
        <span className="host-quiz-ai-header-icon" aria-hidden>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
        <h1 className="host-quiz-ai-title">{t('hostQuizAI.title')}</h1>
      </div>

      <div className="host-quiz-ai-form">
        <div className="host-quiz-ai-field">
          <label className="host-quiz-ai-label" htmlFor="quiz-image">
            {t('hostQuizAI.imageLabel')} *
          </label>
          <input
            id="quiz-image"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="host-quiz-ai-file-input"
            aria-required
          />
          {imagePreview && (
            <div className="host-quiz-ai-preview-wrap">
              <img src={imagePreview} alt="" className="host-quiz-ai-preview" />
              <button
                type="button"
                className="host-quiz-ai-remove-image"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                {t('hostQuizAI.removeImage')}
              </button>
            </div>
          )}
          {!imagePreview && (
            <button
              type="button"
              className="host-quiz-ai-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('hostQuizAI.uploadImage')}
            </button>
          )}
          <p className="host-quiz-ai-hint">{t('hostQuizAI.imageHint')}</p>
        </div>

        <div className="host-quiz-ai-field">
          <label className="host-quiz-ai-label" htmlFor="quiz-description">
            {t('hostQuizAI.descriptionLabel')}
          </label>
          <textarea
            id="quiz-description"
            value={topicDescription}
            onChange={(e) => setTopicDescription(e.target.value)}
            placeholder={t('hostQuizAI.descriptionPlaceholder')}
            className="host-quiz-ai-textarea"
            rows={4}
          />
          <p className="host-quiz-ai-hint">{t('hostQuizAI.descriptionHint')}</p>
        </div>

        <div className="host-quiz-ai-settings">
          <div className="host-quiz-ai-field">
            <label className="host-quiz-ai-label" htmlFor="time-limit">
              {t('hostQuizAI.timeLimitLabel')}
            </label>
            <select
              id="time-limit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="host-quiz-ai-select"
            >
              {TIME_LIMIT_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec} {t('hostQuizAI.seconds')}
                </option>
              ))}
            </select>
            <p className="host-quiz-ai-hint">{t('hostQuizAI.timeLimitHint')}</p>
          </div>
          <div className="host-quiz-ai-field">
            <label className="host-quiz-ai-label" htmlFor="num-questions">
              {t('hostQuizAI.numQuestionsLabel')}
            </label>
            <input
              id="num-questions"
              type="number"
              min={1}
              max={50}
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              className="host-quiz-ai-input"
            />
            <p className="host-quiz-ai-hint">{t('hostQuizAI.numQuestionsHint')}</p>
          </div>
        </div>

        {error && (
          <div className="host-quiz-ai-error" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          className="host-quiz-ai-generate-btn"
          onClick={handleGenerate}
          disabled={loading || !imagePreview}
        >
          <span className="host-quiz-ai-btn-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          {loading ? t('hostQuizAI.generating') : t('hostQuizAI.generateButton')}
        </button>
      </div>

      {generatedQuestions && generatedQuestions.length > 0 && (
        <div className="host-quiz-ai-results">
          <h2 className="host-quiz-ai-results-title">{t('hostQuizAI.generatedTitle')}</h2>
          <ul className="host-quiz-ai-questions-list">
            {generatedQuestions.map((q, i) => (
              <li key={i} className="host-quiz-ai-question-item">
                <strong>{i + 1}.</strong> {q.questionText}
                <div className="host-quiz-ai-answers">
                  <span className="host-quiz-ai-correct">{q.correctAnswer}</span>
                  {q.wrongAnswers?.map((w, j) => (
                    <span key={j} className="host-quiz-ai-wrong">{w}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {!savedQuizId && (
            <button
              type="button"
              className="host-quiz-ai-save-btn"
              onClick={handleSaveQuiz}
              disabled={saving}
            >
              {saving ? t('hostQuizAI.saving') : t('hostQuizAI.saveQuiz')}
            </button>
          )}
          {savedQuizId && !isPublished && (
            <div className="host-quiz-ai-publish-row">
              <span className="host-quiz-ai-saved-msg">{t('hostQuizAI.quizSaved')}</span>
              <button
                type="button"
                className="host-quiz-ai-publish-btn"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? t('hostQuizAI.publishing') : t('hostQuizAI.publishGame')}
              </button>
            </div>
          )}
          {savedQuizId && isPublished && (
            <p className="host-quiz-ai-published-msg">{t('hostQuizAI.published')}</p>
          )}
        </div>
      )}

      <div className="host-quiz-ai-tips">
        <h3 className="host-quiz-ai-tips-title">
          <span className="host-quiz-ai-tips-icon" aria-hidden>💡</span>
          {t('hostQuizAI.tipsTitle')}
        </h3>
        <ul className="host-quiz-ai-tips-list">
          <li>{t('hostQuizAI.tip1')}</li>
          <li>{t('hostQuizAI.tip2')}</li>
          <li>{t('hostQuizAI.tip3')}</li>
          <li>{t('hostQuizAI.tip4')}</li>
        </ul>
      </div>
    </div>
  )
}

export default HostQuizAI
