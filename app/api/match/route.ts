import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { sender_id, receiver_id } = await req.json()

    if (!sender_id || !receiver_id) {
      return NextResponse.json({ error: 'Missing sender_id or receiver_id' }, { status: 400 })
    }

    if (sender_id === receiver_id) {
      return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 })
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('sender_id', sender_id)
      .eq('receiver_id', receiver_id)
      .single()

    if (!existingLike) {
      await supabase.from('likes').insert({ sender_id, receiver_id })
    }

    // Check if mutual like exists
    const { data: mutualLike } = await supabase
      .from('likes')
      .select('id')
      .eq('sender_id', receiver_id)
      .eq('receiver_id', sender_id)
      .single()

    if (!mutualLike) {
      return NextResponse.json({ status: 'liked' })
    }

    // Check if match already exists (avoid duplicates)
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(
        `and(user1_id.eq.${sender_id},user2_id.eq.${receiver_id}),and(user1_id.eq.${receiver_id},user2_id.eq.${sender_id})`
      )
      .single()

    if (existingMatch) {
      return NextResponse.json({ match: existingMatch })
    }

    // Create match
    const { data: match, error } = await supabase
      .from('matches')
      .insert({ user1_id: sender_id, user2_id: receiver_id })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ match })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
