'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Event, User } from '@/types'

export default function EventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [checkedInEvent, setCheckedInEvent] = useState<Event | null>(null)
  const [attendees, setAttendees] = useState<User[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [liking, setLiking] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Ensure profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!profile) { router.push('/profile'); return }

      setUserId(session.user.id)

      // Load all events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('name')

      setEvents(eventsData || [])

      // Check if already checked in somewhere
      const { data: checkin } = await supabase
        .from('checkins')
        .select('event_id, events(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (checkin?.events) {
        const ev = checkin.events as unknown as Event
        setCheckedInEvent(ev)
        await loadAttendees(ev.id, session.user.id)
      }

      // Load existing likes
      const { data: likes } = await supabase
        .from('likes')
        .select('receiver_id')
        .eq('sender_id', session.user.id)

      setLikedIds(new Set(likes?.map((l) => l.receiver_id) || []))

      // Load existing matches
      const { data: matches } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)

      const mIds = new Set<string>()
      matches?.forEach((m) => {
        mIds.add(m.user1_id === session.user.id ? m.user2_id : m.user1_id)
      })
      setMatchedIds(mIds)

      setLoading(false)
    }
    init()
  }, [router])

  const loadAttendees = async (eventId: string, currentUserId: string) => {
    const { data } = await supabase
      .from('checkins')
      .select('user_id, users(*)')
      .eq('event_id', eventId)

    const others = (data || [])
      .map((c: any) => c.users as User)
      .filter((u: User) => u?.id !== currentUserId)

    setAttendees(others)
  }

  const handleCheckin = async (eventId: string) => {
    if (!userId) return
    setCheckingIn(eventId)

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, event_id: eventId }),
    })
    const json = await res.json()

    if (!json.error) {
      const ev = events.find((e) => e.id === eventId)!
      setCheckedInEvent(ev)
      await loadAttendees(eventId, userId)
    }
    setCheckingIn(null)
  }

  const handleLike = async (receiverId: string) => {
    if (!userId) return
    setLiking(receiverId)

    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_id: userId, receiver_id: receiverId }),
    })
    const json = await res.json()

    setLikedIds((prev) => {
  const newSet = new Set(prev)
  newSet.add(receiverId)
  return newSet
})

    if (json.match) {
      setMatchedIds((prev) => {
  const newSet = new Set(prev)
  newSet.add(receiverId)
  return newSet
})
      // Show brief notification then navigate
      setTimeout(() => router.push('/matches'), 1200)
    }
    setLiking(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-black text-brand-400 glow-text">VibeCheck</h1>
          <p className="text-white/30 text-xs">Events near you</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/matches')}
            className="px-4 py-2 rounded-xl glass text-sm text-white/60 hover:text-white transition-colors border border-white/8"
          >
            Matches
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 rounded-xl glass text-sm text-white/60 hover:text-white transition-colors border border-white/8"
          >
            Profile
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-xl glass text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Out
          </button>
        </div>
      </div>

      {/* Checked-in banner */}
      {checkedInEvent && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 animate-fade-up">
          <p className="text-xs text-brand-400 uppercase tracking-wider mb-1">Currently checked in</p>
          <p className="font-display font-bold text-lg">{checkedInEvent.name}</p>
        </div>
      )}

      {/* Events list */}
      <div className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-white/30 mb-4 animate-fade-up stagger-1">
          Available events
        </h2>
        {events.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-white/30 text-sm">
            No events yet. Ask an organizer to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => {
              const isChecked = checkedInEvent?.id === event.id
              return (
                <div
                  key={event.id}
                  className={`glass rounded-2xl p-5 flex items-center justify-between glass-hover animate-fade-up`}
                  style={{ animationDelay: `${(i + 2) * 0.08}s` }}
                >
                  <div>
                    <p className="font-display font-bold">{event.name}</p>
                    {isChecked && (
                      <p className="text-brand-500 text-xs mt-0.5">You're here ✓</p>
                    )}
                  </div>
                  <button
                    onClick={() => !isChecked && handleCheckin(event.id)}
                    disabled={checkingIn === event.id || isChecked}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isChecked
                        ? 'bg-brand-500/20 text-brand-400 cursor-default'
                        : 'bg-brand-500 text-white hover:bg-brand-600'
                    } disabled:opacity-50`}
                  >
                    {checkingIn === event.id ? '...' : isChecked ? 'Checked in' : 'Check in'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Attendees */}
      {checkedInEvent && (
        <div className="animate-fade-up stagger-3">
          <h2 className="text-xs uppercase tracking-wider text-white/30 mb-4">
            People at {checkedInEvent.name} ({attendees.length})
          </h2>

          {attendees.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-white/30 text-sm">
              No one else here yet. Be the first! 👀
            </div>
          ) : (
            <div className="space-y-3">
              {attendees.map((person, i) => {
                const isLiked = likedIds.has(person.id)
                const isMatched = matchedIds.has(person.id)
                return (
                  <div
                    key={person.id}
                    className="glass glass-hover rounded-2xl p-4 flex items-center gap-4"
                    style={{ animationDelay: `${(i + 4) * 0.08}s` }}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-600 flex-shrink-0 border border-white/8">
                      {person.avatar ? (
                        <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {person.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold truncate">{person.name}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {person.vibe && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-600 text-white/50">
                            {person.vibe}
                          </span>
                        )}
                        {person.intent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">
                            {person.intent}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {isMatched ? (
                      <button
                        onClick={() => router.push('/matches')}
                        className="px-3 py-2 rounded-xl bg-green-500/20 text-green-400 text-xs font-medium"
                      >
                        💬 Chat
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLike(person.id)}
                        disabled={isLiked || liking === person.id}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          isLiked
                            ? 'bg-brand-500/20 text-brand-400'
                            : 'glass border border-white/10 text-white/40 hover:border-brand-500/40 hover:text-brand-400'
                        } disabled:opacity-50`}
                      >
                        {liking === person.id ? (
                          <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-sm">{isLiked ? '♥' : '♡'}</span>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
