import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIFFICULTY_STORAGE_KEY = (id) => `profile_difficulty_${id}`

/**
 * Hook to load the current user's profile (nickname and difficulty_level).
 * Use in game pages to read the user's preferred difficulty: 'beginner' | 'experienced' | 'professional'.
 * @returns {{ profile: { nickname: string | null, difficulty_level: string, avatar: number } | null, loading: boolean }}
 */
export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        setProfile(null)
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, difficulty_level, avatar')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        const avatarNum = typeof data.avatar === 'number' && data.avatar >= 0 && data.avatar <= 2 ? data.avatar : 0
        setProfile({
          nickname: data.nickname ?? null,
          difficulty_level: data.difficulty_level ?? 'beginner',
          avatar: avatarNum,
        })
      } else {
        const localDiff = localStorage.getItem(DIFFICULTY_STORAGE_KEY(user.id))
        const level = ['beginner', 'experienced', 'professional'].includes(localDiff) ? localDiff : 'beginner'
        const localAvatar = localStorage.getItem(`profile_avatar_${user.id}`)
        const avatarNum = localAvatar !== null ? Math.max(0, Math.min(2, parseInt(localAvatar, 10) || 0)) : 0
        setProfile({ nickname: null, difficulty_level: level, avatar: avatarNum })
      }
      setLoading(false)
    }
    load()
  }, [])

  return { profile, loading }
}
