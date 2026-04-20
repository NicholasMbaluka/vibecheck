import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { event_id, exclude_user_id } = await req.json()

    if (!event_id) {
      return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('checkins')
      .select('user_id, users(*)')
      .eq('event_id', event_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter out the requesting user if provided
    const users = (data || [])
      .map((c: any) => c.users)
      .filter((u: any) => u && u.id !== exclude_user_id)

    return NextResponse.json(users)
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
