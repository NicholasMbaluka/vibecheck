'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Match, User } from '@/types'

interface MatchWithUser extends Match {
  other_user: User
}

export default function MatchesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<MatchWithUser[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setUserId(session.user.id)

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('id', { ascending: false })

      if (!matchData || matchData.length === 0) {
        setLoading(false)
        return
      }

      // Fetch other user details for each match
      const enriched: MatchWithUser[] = await Promise.all(
        matchData.map(async (match) => {
          const otherId = match.user1_id === session.user.id ? match.user2_id : match.user1_id
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherId)
            .single()
          return { ...match, other_user: user }
        })
      )

      setMatches(enriched)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <button onClick={() => router.push('/event')} className="text-white/40 text-xs hover:text-white/60 transition-colors mb-2 flex items-center gap-1">
            ← Events
          </button>
          <h1 className="font-display text-3xl font-black">Matches</h1>
          <p className="text-white/30 text-sm mt-1">{matches.length} mutual connection{matches.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-up stagger-1">
          <div className="text-4xl mb-4 animate-float">💫</div>
          <p className="font-display font-bold text-lg">No matches yet</p>
          <p className="text-white/30 text-sm mt-2">Like people at your event.<br />When they like you back, you'll match.</p>
          <button
            onClick={() => router.push('/event')}
            className="mt-6 px-6 py-3 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Find people →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match, i) => (
            <button
              key={match.id}
              onClick={() => router.push(`/chat/${match.id}`)}
              className="w-full glass glass-hover rounded-2xl p-4 flex items-center gap-4 animate-fade-up text-left"
              style={{ animationDelay: `${(i + 1) * 0.08}s` }}
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-600 flex-shrink-0 border border-brand-500/30">
                {match.other_user?.avatar ? (
                  <img src={match.other_user.avatar} alt={match.other_user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    {match.other_user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold">{match.other_user?.name || 'Unknown'}</p>
                <div className="flex gap-2 mt-1">
                  {match.other_user?.vibe && (
                    <span className="text-xs text-white/40">{match.other_user.vibe}</span>
                  )}
                  {match.other_user?.intent && (
                    <span className="text-xs text-brand-400/70">· {match.other_user.intent}</span>
                  )}
                </div>
              </div>

              {/* Chat icon */}
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
