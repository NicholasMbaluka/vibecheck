'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Message, User } from '@/types'

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.matchId as string

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setUserId(session.user.id)

      // Verify match belongs to this user
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .single()

      if (!match) { router.push('/matches'); return }

      // Get other user
      const otherId = match.user1_id === session.user.id ? match.user2_id : match.user1_id
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', otherId)
        .single()

      setOtherUser(user)

      // Load existing messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])
      setLoading(false)
    }
    init()
  }, [matchId, router])

  // Real-time subscription
  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  const handleSend = async () => {
    if (!input.trim() || !userId || sending) return
    setSending(true)

    const content = input.trim()
    setInput('')

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      match_id: matchId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: userId,
      content,
    })

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="glass border-b border-white/5 px-4 py-3 flex items-center gap-3 animate-fade-up flex-shrink-0">
        <button
          onClick={() => router.push('/matches')}
          className="w-8 h-8 flex items-center justify-center rounded-xl glass text-white/60 hover:text-white transition-colors text-sm"
        >
          ←
        </button>

        <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-600 border border-brand-500/20">
          {otherUser?.avatar ? (
            <img src={otherUser.avatar} alt={otherUser.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {otherUser?.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="font-display font-bold text-sm">{otherUser?.name}</p>
          <p className="text-white/30 text-xs">
            {otherUser?.vibe && `${otherUser.vibe} · `}{otherUser?.intent}
          </p>
        </div>

        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-white/30">
            <div className="text-3xl mb-3 animate-float">👋</div>
            <p className="text-sm">You matched! Say something.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === userId
          const isTemp = msg.id.startsWith('temp-')
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? `bg-brand-500 text-white rounded-br-sm ${isTemp ? 'opacity-70' : ''}`
                    : 'glass text-white rounded-bl-sm'
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-white/50' : 'text-white/30'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-white/5 px-4 py-3 flex items-end gap-3 flex-shrink-0 animate-fade-up">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something..."
          rows={1}
          className="flex-1 bg-surface-700 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-colors text-sm resize-none max-h-32"
          style={{ minHeight: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
