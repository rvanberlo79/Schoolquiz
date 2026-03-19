import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import './ManageUsers.css'

const ROLE_OPTIONS = [
  { value: 'maintainer', labelKey: 'role.maintainer' },
  { value: 'host', labelKey: 'role.host' },
  { value: 'participant', labelKey: 'role.participant' },
]

function ManageUsers() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [profiles, setProfiles] = useState([])
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        setLoading(false)
        return
      }
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = myProfile?.role ?? 'participant'
      setCurrentUserRole(role)
      if (role !== 'maintainer') {
        setLoading(false)
        return
      }
      const { data: list, error } = await supabase
        .from('profiles')
        .select('id, nickname, role')
        .order('created_at', { ascending: false })
      if (!error) setProfiles(list ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleRoleChange = async (profileId, newRole) => {
    if (currentUserRole !== 'maintainer') return
    if (!ROLE_OPTIONS.some((o) => o.value === newRole)) return
    setMessage('')
    setUpdatingId(profileId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
    setUpdatingId(null)
    if (error) {
      setMessage(error.message)
      return
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p))
    )
    setMessage(t('manage.roleUpdated'))
  }

  if (loading) {
    return (
      <div className="manage-users-page">
        <div className="manage-users-card">
          <p className="manage-users-loading">{t('manage.loading')}</p>
        </div>
      </div>
    )
  }

  if (currentUserRole !== 'maintainer') {
    return (
      <div className="manage-users-page">
        <div className="manage-users-card">
          <p className="manage-users-unauthorized">{t('manage.unauthorized')}</p>
          <button type="button" className="manage-users-back" onClick={() => navigate('/role-selection')}>
            {t('manage.back')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="manage-users-page">
      <div className="manage-users-card">
        <button
          type="button"
          className="manage-users-back"
          onClick={() => navigate('/role-selection')}
        >
          ← Back to role selection
        </button>
        <h1 className="manage-users-title">Manage user roles</h1>
        <p className="manage-users-subtitle">Change a user’s role. Only maintainers can set Maintainer, Host, or Participant.</p>

        <div className="manage-users-table-wrap">
          <table className="manage-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Current role</th>
                <th>Change role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.nickname || p.id.slice(0, 8) + '…'}</td>
                  <td>
                    <span className={`manage-users-badge manage-users-badge-${p.role}`}>
                      {ROLE_OPTIONS.find((o) => o.value === p.role)?.label ?? p.role}
                    </span>
                  </td>
                  <td>
                    <select
                      className="manage-users-select"
                      value={p.role}
                      disabled={updatingId === p.id}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      aria-label={`Change role for ${p.nickname || p.id}`}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {message && <p className="manage-users-message">{message}</p>}
      </div>
    </div>
  )
}

export default ManageUsers
