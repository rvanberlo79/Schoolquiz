import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../lib/translations'
import './Settings.css'

const DIFFICULTY_OPTIONS_KEYS = [
  { value: 'beginner', labelKey: 'settings.difficultyBeginner' },
  { value: 'experienced', labelKey: 'settings.difficultyExperienced' },
  { value: 'professional', labelKey: 'settings.difficultyProfessional' },
]
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
]

const AVATAR_COUNT = 3
const AVATAR_URLS = ['/avatars/avatar-0.png', '/avatars/avatar-1.png', '/avatars/avatar-2.png']

function Settings() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('beginner')
  const [avatar, setAvatar] = useState(0)
  const [role, setRole] = useState(null)
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState(null)
  const { t, setLanguage: setProfileLanguage } = useLanguage()

  const ROLE_LABELS = { maintainer: t('role.maintainer'), host: t('role.host'), participant: t('role.participant') }

  const NICKNAME_STORAGE_KEY = (id) => `leaderboard_nickname_${id}`
  const DIFFICULTY_STORAGE_KEY = (id) => `profile_difficulty_${id}`
  const AVATAR_STORAGE_KEY = (id) => `profile_avatar_${id}`

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      if (!user?.id) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, difficulty_level, avatar, role, language')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        if (data.nickname != null) setNickname(data.nickname)
        if (data.difficulty_level != null) setDifficultyLevel(data.difficulty_level)
        if (data.avatar != null && data.avatar >= 0 && data.avatar < AVATAR_COUNT) setAvatar(data.avatar)
        if (data.role != null) setRole(data.role)
        if (data.language === 'nl' || data.language === 'en') setLanguage(data.language)
      } else {
        const local = localStorage.getItem(NICKNAME_STORAGE_KEY(user.id))
        if (local) setNickname(local)
        const localDiff = localStorage.getItem(DIFFICULTY_STORAGE_KEY(user.id))
        if (localDiff && DIFFICULTY_OPTIONS_KEYS.some((o) => o.value === localDiff)) setDifficultyLevel(localDiff)
        const localAvatar = localStorage.getItem(AVATAR_STORAGE_KEY(user.id))
        if (localAvatar !== null) { const n = parseInt(localAvatar, 10); if (!Number.isNaN(n) && n >= 0 && n < AVATAR_COUNT) setAvatar(n) }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) {
      setMessage(t('settings.cannotSave'))
      return
    }
    const nicknameValue = nickname.trim() || null
    const difficultyValue = DIFFICULTY_OPTIONS_KEYS.some((o) => o.value === difficultyLevel) ? difficultyLevel : 'beginner'
    const avatarValue = Math.max(0, Math.min(AVATAR_COUNT - 1, Math.floor(Number(avatar)) || 0))
    const languageValue = language === 'nl' ? 'nl' : 'en'
    setSaving(true)
    setMessage('')
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('profiles').upsert(
        { id: userId, nickname: nicknameValue, difficulty_level: difficultyValue, avatar: avatarValue, language: languageValue },
        { onConflict: 'id' }
      )
      if (error) {
        const tableMissing = /profiles|schema cache|relation.*does not exist/i.test(error.message ?? '')
        localStorage.setItem(NICKNAME_STORAGE_KEY(userId), nicknameValue ?? '')
        localStorage.setItem(DIFFICULTY_STORAGE_KEY(userId), difficultyValue)
        localStorage.setItem(AVATAR_STORAGE_KEY(userId), String(avatarValue))
        setSaving(false)
        if (tableMissing) {
          setMessage('Profile saved locally. Create the profiles table in Supabase (SQL in supabase/create_profiles_table.sql) to sync.')
        } else {
          setMessage(error.message)
        }
        return
      }
    }
    localStorage.setItem(NICKNAME_STORAGE_KEY(userId), nicknameValue ?? '')
    localStorage.setItem(DIFFICULTY_STORAGE_KEY(userId), difficultyValue)
    localStorage.setItem(AVATAR_STORAGE_KEY(userId), String(avatarValue))
    await setProfileLanguage(languageValue)
    setSaving(false)
    setMessage((translations[languageValue] || translations.en)['settings.saved'])
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <p className="settings-loading">{t('settings.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-card">
        <button
          type="button"
          className="settings-back"
          onClick={() => navigate('/participant')}
        >
          {t('settings.back')}
        </button>
        <h1 className="settings-title">{t('settings.title')}</h1>
        <p className="settings-subtitle">{t('settings.subtitle')}</p>

        {role != null && (
          <div className="settings-role-row">
            <span className="settings-label">{t('settings.role')}</span>
            <span className="settings-role-value" aria-label={t('settings.role')}>{ROLE_LABELS[role] ?? role}</span>
            <span className="settings-role-hint">{t('settings.roleHint')}</span>
          </div>
        )}

        {role === 'maintainer' && (
          <div className="settings-manage-link-wrap">
            <button
              type="button"
              className="settings-manage-link"
              onClick={() => navigate('/manage-users')}
            >
              {t('settings.manageLink')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="settings-form">
          <label className="settings-label">{t('settings.language')}</label>
          <select
            className="settings-select"
            value={language}
            onChange={async (e) => {
              const newLang = e.target.value === 'nl' ? 'nl' : 'en'
              setLanguage(newLang)
              await setProfileLanguage(newLang)
            }}
            aria-label={t('settings.language')}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="settings-label">{t('settings.avatar')}</label>
          <div className="settings-avatar-row" role="group" aria-label="Choose avatar">
            {AVATAR_URLS.map((url, i) => {
              const isSelected = avatar === i
              return (
                <button
                  key={i}
                  type="button"
                  className={`settings-avatar-cell${isSelected ? ' settings-avatar-cell-selected' : ''}`}
                  onClick={() => setAvatar(i)}
                  aria-pressed={isSelected}
                  aria-label={`Avatar ${i + 1}`}
                >
                  <img src={url} alt="" className="settings-avatar-img" />
                </button>
              )
            })}
          </div>
          <label htmlFor="nickname" className="settings-label">{t('settings.nickname')}</label>
          <input
            id="nickname"
            type="text"
            className="settings-input"
            placeholder={t('settings.nicknamePlaceholder')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={50}
          />
          <label htmlFor="difficulty" className="settings-label">{t('settings.difficulty')}</label>
          <select
            id="difficulty"
            className="settings-select"
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(e.target.value)}
          >
            {DIFFICULTY_OPTIONS_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
          <button type="submit" className="settings-btn" disabled={saving}>
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </form>

        {message && <p className="settings-message">{message}</p>}
      </div>
    </div>
  )
}

export default Settings
