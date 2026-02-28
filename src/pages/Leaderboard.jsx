import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Leaderboard.css'

const AVATAR_URLS = ['/avatars/avatar-0.png', '/avatars/avatar-1.png', '/avatars/avatar-2.png']

function PodiumAvatar({ avatarIndex }) {
  if (avatarIndex == null || avatarIndex < 0 || avatarIndex >= AVATAR_URLS.length) return null
  return (
    <div className="leaderboard-podium-avatar" aria-hidden>
      <img src={AVATAR_URLS[avatarIndex]} alt="" />
    </div>
  )
}

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
      let avatarMap = {}
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, nickname, avatar')
      if (!profilesError && Array.isArray(profiles)) {
        profiles.forEach((p) => {
          if (p?.id != null) {
            profileMap[p.id] = p.nickname?.trim() || null
            if (typeof p.avatar === 'number' && p.avatar >= 0 && p.avatar <= 2) avatarMap[p.id] = p.avatar
          }
        })
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const localNick = localStorage.getItem(`leaderboard_nickname_${user.id}`)
        if (localNick) profileMap[user.id] = profileMap[user.id] || localNick
        const localAvatar = localStorage.getItem(`profile_avatar_${user.id}`)
        if (localAvatar !== null) { const n = parseInt(localAvatar, 10); if (!Number.isNaN(n) && n >= 0 && n <= 2) avatarMap[user.id] = n }
      }
      try {
        const { data: mult } = await supabase
          .from('multiplication_scores')
          .select('user_id, score')
        const { data: hang } = await supabase
          .from('hangman_scores')
          .select('user_id, score')
        const { data: addRows } = await supabase
          .from('addition_scores')
          .select('user_id, score')
        const multRows = Array.isArray(mult) ? mult : []
        const hangRows = Array.isArray(hang) ? hang : []
        const additionRows = Array.isArray(addRows) ? addRows : []
        const totalByUser = {}
        const add = (userId, score) => {
          totalByUser[userId] = (totalByUser[userId] ?? 0) + (score ?? 0)
        }
        multRows.forEach((r) => { if (r?.user_id != null) add(r.user_id, r.score) })
        hangRows.forEach((r) => { if (r?.user_id != null) add(r.user_id, r.score) })
        additionRows.forEach((r) => { if (r?.user_id != null) add(r.user_id, r.score) })

        const list = Object.entries(totalByUser)
          .filter(([userId]) => userId != null)
          .map(([userId, total]) => ({
            userId,
            displayName: profileMap[userId] || 'Player',
            avatar: avatarMap[userId] ?? null,
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
          <>
            {entries.length === 0 ? (
              <p className="leaderboard-empty">No scores yet. Play games to appear here!</p>
            ) : (
              <>
                {entries.length >= 3 && (
                  <div className="leaderboard-podium">
                    <div className="leaderboard-podium-place leaderboard-podium-2">
                      <span className="leaderboard-podium-medal leaderboard-medal-silver">2</span>
                      <PodiumAvatar avatarIndex={entries[1].avatar} />
                      <div className="leaderboard-podium-block">
                        <span className="leaderboard-podium-name">{entries[1].displayName}</span>
                        <span className="leaderboard-podium-points">{entries[1].total} pts</span>
                      </div>
                    </div>
                    <div className="leaderboard-podium-place leaderboard-podium-1">
                      <span className="leaderboard-podium-medal leaderboard-medal-gold">1</span>
                      <PodiumAvatar avatarIndex={entries[0].avatar} />
                      <div className="leaderboard-podium-block">
                        <span className="leaderboard-podium-name">{entries[0].displayName}</span>
                        <span className="leaderboard-podium-points">{entries[0].total} pts</span>
                      </div>
                    </div>
                    <div className="leaderboard-podium-place leaderboard-podium-3">
                      <span className="leaderboard-podium-medal leaderboard-medal-bronze">3</span>
                      <PodiumAvatar avatarIndex={entries[2].avatar} />
                      <div className="leaderboard-podium-block">
                        <span className="leaderboard-podium-name">{entries[2].displayName}</span>
                        <span className="leaderboard-podium-points">{entries[2].total} pts</span>
                      </div>
                    </div>
                  </div>
                )}
                {entries.length > 0 && entries.length < 3 && (
                  <div className="leaderboard-podium leaderboard-podium-partial">
                    {entries.map((e, i) => (
                      <div key={e.userId} className={`leaderboard-podium-place leaderboard-podium-${i + 1}`}>
                        <span className={`leaderboard-podium-medal leaderboard-medal-${['gold', 'silver', 'bronze'][i]}`}>{i + 1}</span>
                        <PodiumAvatar avatarIndex={e.avatar} />
                        <div className="leaderboard-podium-block">
                          <span className="leaderboard-podium-name">{e.displayName}</span>
                          <span className="leaderboard-podium-points">{e.total} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="leaderboard-table-wrap">
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
                        <tr key={e.userId} className={`leaderboard-row-rank-${i < 3 ? ['gold', 'silver', 'bronze'][i] : 'default'}`}>
                          <td>{i + 1}</td>
                          <td>{e.displayName}</td>
                          <td>{e.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Leaderboard
