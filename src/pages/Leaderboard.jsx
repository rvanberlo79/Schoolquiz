import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Leaderboard.css'

function Leaderboard() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }
      setError('')
      let profileMap = {}
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, nickname')
      if (!profilesError && profiles) {
        profileMap = profiles.reduce((acc, p) => {
          acc[p.id] = p.nickname?.trim() || null
          return acc
        }, {})
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const localNick = localStorage.getItem(`leaderboard_nickname_${user.id}`)
        if (localNick) profileMap[user.id] = profileMap[user.id] || localNick
      }
      try {
        const { data: mult } = await supabase
          .from('multiplication_scores')
          .select('user_id, score')
        const { data: hang } = await supabase
          .from('hangman_scores')
          .select('user_id, score')
        const totalByUser = {}
        const add = (userId, score) => {
          totalByUser[userId] = (totalByUser[userId] ?? 0) + (score ?? 0)
        }
        (mult ?? []).forEach((r) => add(r.user_id, r.score))
        (hang ?? []).forEach((r) => add(r.user_id, r.score))

        const list = Object.entries(totalByUser)
          .map(([userId, total]) => ({
            userId,
            displayName: profileMap[userId] || 'Player',
            total,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 50)

        setEntries(list)
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard.')
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-card">
        <button
          type="button"
          className="leaderboard-back"
          onClick={() => navigate('/participant')}
        >
          ← Back to Participant
        </button>
        <h1 className="leaderboard-title">Overall Leaderboard</h1>
        <p className="leaderboard-subtitle">Total points from all games</p>

        {loading && <p className="leaderboard-loading">Loading…</p>}
        {error && <p className="leaderboard-error">{error}</p>}

        {!loading && !error && (
          <div className="leaderboard-table-wrap">
            {entries.length === 0 ? (
              <p className="leaderboard-empty">No scores yet. Play games to appear here!</p>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.userId}>
                      <td>{i + 1}</td>
                      <td>{e.displayName}</td>
                      <td>{e.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Leaderboard
