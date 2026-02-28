import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Settings.css'

function Settings() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState(null)

  const NICKNAME_STORAGE_KEY = (id) => `leaderboard_nickname_${id}`

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
        .select('nickname')
        .eq('id', user.id)
        .single()
      if (!error && data?.nickname != null) {
        setNickname(data.nickname)
      } else {
        const local = localStorage.getItem(NICKNAME_STORAGE_KEY(user.id))
        if (local) setNickname(local)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) {
      setMessage('Cannot save: not signed in.')
      return
    }
    const value = nickname.trim() || null
    setSaving(true)
    setMessage('')
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('profiles').upsert(
        { id: userId, nickname: value },
        { onConflict: 'id' }
      )
      if (error) {
        const tableMissing = /profiles|schema cache|relation.*does not exist/i.test(error.message ?? '')
        localStorage.setItem(NICKNAME_STORAGE_KEY(userId), value ?? '')
        setSaving(false)
        if (tableMissing) {
          setMessage('Nickname saved locally. Create the profiles table in Supabase (SQL in supabase/create_profiles_table.sql) to sync on the leaderboard.')
        } else {
          setMessage(error.message)
        }
        return
      }
    }
    localStorage.setItem(NICKNAME_STORAGE_KEY(userId), value ?? '')
    setSaving(false)
    setMessage('Nickname saved. It will be shown on the leaderboard.')
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <p className="settings-loading">Loading…</p>
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
          ← Back to Participant
        </button>
        <h1 className="settings-title">User Settings</h1>
        <p className="settings-subtitle">Choose a nickname to show on the leaderboard</p>

        <form onSubmit={handleSubmit} className="settings-form">
          <label htmlFor="nickname" className="settings-label">Nickname</label>
          <input
            id="nickname"
            type="text"
            className="settings-input"
            placeholder="e.g. SuperLearner"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={50}
          />
          <button type="submit" className="settings-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save nickname'}
          </button>
        </form>

        {message && <p className="settings-message">{message}</p>}
      </div>
    </div>
  )
}

export default Settings
