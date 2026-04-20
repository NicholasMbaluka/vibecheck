'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

const VIBES = ['Chill', 'Energetic', 'Nerdy', 'Creative', 'Social', 'Adventurous']
const INTENTS = ['Make friends', 'Network', 'Date', 'Collaborate', 'Just vibing']

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [vibe, setVibe] = useState('')
  const [intent, setIntent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setUser(profile)
        setName(profile.name || '')
        setVibe(profile.vibe || '')
        setIntent(profile.intent || '')
      } else {
        // Pre-fill from Google
        setName(session.user.user_metadata?.full_name || '')
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const avatarUrl = session.user.user_metadata?.avatar_url || null

    const { error } = await supabase
      .from('users')
      .upsert({
        id: session.user.id,
        name: name.trim(),
        avatar: avatarUrl,
        vibe,
        intent,
      })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/event'), 800)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <button onClick={() => router.push('/event')} className="text-white/40 text-sm hover:text-white/70 transition-colors mb-4 flex items-center gap-1">
            ← back to events
          </button>
          <h1 className="font-display text-3xl font-black">Your profile</h1>
          <p className="text-white/40 text-sm mt-1">Tell people who you are</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-6 animate-fade-up stagger-1">
          {/* Name */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              className="w-full bg-surface-700 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
            />
          </div>

          {/* Vibe */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-3">Your vibe</label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    vibe === v
                      ? 'bg-brand-500 text-white'
                      : 'glass text-white/50 hover:text-white/80 border border-white/8'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Intent */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/40 mb-3">Here to...</label>
            <div className="flex flex-wrap gap-2">
              {INTENTS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIntent(i)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    intent === i
                      ? 'bg-brand-500 text-white'
                      : 'glass text-white/50 hover:text-white/80 border border-white/8'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !vibe || !intent}
            className="w-full py-4 rounded-xl bg-brand-500 text-white font-display font-bold text-sm tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : success ? '✓ Saved!' : 'Save & continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
