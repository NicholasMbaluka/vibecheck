# ⚡ VibeCheck

> Event-based social matching. Join → See People → Match → Chat.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Auth, Postgres, Realtime)
- **Tailwind CSS**
- **TypeScript**

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd vibecheck
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Go to **Authentication → Providers** → enable **Google**
   - Add your Google OAuth credentials (Client ID + Secret)
   - Set redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## App Flow

```
Login (Google OAuth)
  ↓
Profile setup (name, vibe, intent)
  ↓
Event page — check in to an event
  ↓
See other attendees at the same event
  ↓
Like someone → if mutual → MATCH
  ↓
Real-time chat opens
```

---

## Folder Structure

```
vibecheck/
├── app/
│   ├── login/          # Google OAuth login
│   ├── profile/        # Profile setup (name, vibe, intent)
│   ├── event/          # Check in + see attendees + like
│   ├── matches/        # All mutual matches
│   ├── chat/[matchId]/ # Real-time chat per match
│   └── api/
│       ├── checkin/    # POST: check into event
│       ├── match/      # POST: like + mutual match detection
│       └── users/      # POST: get users at an event
├── lib/
│   └── supabase.ts     # Supabase client
├── types/
│   └── index.ts        # Shared TypeScript types
└── supabase/
    └── schema.sql      # Full DB schema + RLS + indexes
```

---

## Database Schema

| Table      | Purpose                          |
|------------|----------------------------------|
| `users`    | User profiles                    |
| `events`   | Events to check into             |
| `checkins` | User ↔ event mapping             |
| `likes`    | Directional likes between users  |
| `matches`  | Mutual likes → match created     |
| `messages` | Chat messages per match          |

---

## Key Features

### ✅ Duplicate prevention
- `unique(user_id, event_id)` on checkins — can't double check-in
- `unique(sender_id, receiver_id)` on likes — can't double like
- Match existence check before creating — no duplicate matches

### ✅ Row Level Security
- Users can only read/write their own data
- Messages restricted to match participants
- Full RLS policies in `schema.sql`

### ✅ Real-time chat
- Supabase Realtime on `messages` table
- Filtered by `match_id` — only relevant messages received
- Optimistic UI updates for instant feel

### ✅ Auth flow
- Google OAuth via Supabase Auth
- Auto-redirect to profile setup on first login
- Session-protected routes

---

## Adding Events

Events are created directly in Supabase (admin only). To add one:

```sql
insert into public.events (name) values ('Your Event Name');
```

Or build an admin page at `/admin/events` — not included in MVP.

---

## Production Checklist

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel env vars
- [ ] Set Google OAuth redirect URL to your production domain
- [ ] Verify RLS policies are enabled (check Supabase dashboard)
- [ ] Enable Realtime for `messages` table in Supabase dashboard
- [ ] Add rate limiting to API routes (recommended: Upstash Ratelimit)
- [ ] Add image upload for avatars (Supabase Storage)

---

## Test Flow

1. Sign in as **User A** → complete profile
2. Open incognito → sign in as **User B** → complete profile
3. Both check into the same event
4. User A sees User B → clicks ♡
5. User B sees User A → clicks ♡
6. **Match created** → both redirected to `/matches`
7. Click match → real-time chat opens
8. Send messages — confirm they appear instantly on both sides
