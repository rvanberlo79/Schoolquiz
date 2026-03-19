import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import './RoleSelection.css'

function RoleSelection() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [profileRole, setProfileRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        setProfileRole('participant')
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setProfileRole(data?.role ?? 'participant')
      setLoading(false)
    }
    load()
  }, [])

  const handleSelectRole = (role) => {
    if (role === 'participant') {
      navigate('/participant')
      return
    }
    if (role === 'maintainer') {
      navigate('/manage-users')
      return
    }
    if (role === 'host') {
      navigate('/host/create-quiz')
      return
    }
    navigate('/home')
  }

  const canChoose = (role) => {
    if (!profileRole) return role === 'participant'
    if (profileRole === 'maintainer') return true
    if (profileRole === 'host') return role === 'host' || role === 'participant'
    return role === 'participant'
  }

  if (loading) {
    return (
      <div className="role-page-container">
        <div className="role-card">
          <p className="role-subtitle">{t('role.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="role-page-container">
      <div className="role-card">
        <h1 className="role-title">{t('role.title')}</h1>
        <p className="role-subtitle">{t('role.subtitle')}</p>

        <div className="role-options">
          {canChoose('maintainer') && (
            <button
              type="button"
              className="role-option-card"
              onClick={() => handleSelectRole('maintainer')}
              aria-label={`${t('role.maintainer')} - ${t('role.maintainer.desc')}`}
            >
              <div className="role-icon-circle maintainer-icon">🔧</div>
              <h2 className="role-option-title">{t('role.maintainer')}</h2>
              <p className="role-option-text">{t('role.maintainer.desc')}</p>
              <ul className="role-option-list">
                <li>{t('role.maintainer.1')}</li>
                <li>{t('role.maintainer.2')}</li>
                <li>{t('role.maintainer.3')}</li>
              </ul>
            </button>
          )}

          {canChoose('host') && (
            <button
              type="button"
              className="role-option-card"
              onClick={() => handleSelectRole('host')}
              aria-label={`${t('role.host')} - ${t('role.host.desc')}`}
            >
              <div className="role-icon-circle host-icon">👑</div>
              <h2 className="role-option-title">{t('role.host')}</h2>
              <p className="role-option-text">{t('role.host.desc')}</p>
              <ul className="role-option-list">
                <li>{t('role.host.1')}</li>
                <li>{t('role.host.2')}</li>
                <li>{t('role.host.3')}</li>
                <li>{t('role.host.4')}</li>
              </ul>
            </button>
          )}

          {canChoose('participant') && (
            <button
              type="button"
              className="role-option-card"
              onClick={() => handleSelectRole('participant')}
              aria-label={`${t('role.participant')} - ${t('role.participant.desc')}`}
            >
              <div className="role-icon-circle participant-icon">👥</div>
              <h2 className="role-option-title">{t('role.participant')}</h2>
              <p className="role-option-text">{t('role.participant.desc')}</p>
              <ul className="role-option-list">
                <li>{t('role.participant.1')}</li>
                <li>{t('role.participant.2')}</li>
                <li>{t('role.participant.3')}</li>
                <li>{t('role.participant.4')}</li>
              </ul>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoleSelection
