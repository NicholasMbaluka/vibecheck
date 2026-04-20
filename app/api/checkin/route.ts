import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { user_id, event_id } = await req.json()

    if (!user_id || !event_id) {
      return NextResponse.json({ error: 'Missing user_id or event_id' }, { status: 400 })
    }

    // Check for existing check-in at this event
    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', user_id)
      .eq('event_id', event_id)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, already_checked_in: true })
    }

    const { error } = await supabase
      .from('checkins')
      .insert({ user_id, event_id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
