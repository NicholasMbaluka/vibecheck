export interface User {
  id: string
  name: string
  avatar: string | null
  vibe: string | null
  intent: string | null
}

export interface Event {
  id: string
  name: string
}

export interface Checkin {
  id: string
  user_id: string
  event_id: string
  created_at: string
}

export interface Like {
  id: string
  sender_id: string
  receiver_id: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  other_user?: User
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface CheckinWithUser {
  user_id: string
  users: User
}
