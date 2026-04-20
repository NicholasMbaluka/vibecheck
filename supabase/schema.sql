-- ============================================================
-- VibeCheck — Supabase Schema
-- Run this entire file in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users (mirrors Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar text,
  vibe text,
  intent text,
  created_at timestamp with time zone default now()
);

-- Events
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Check-ins (user ↔ event)
create table if not exists public.checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamp with time zone default now(),
  -- Each user can only check in once per event
  unique(user_id, event_id)
);

-- Likes
create table if not exists public.likes (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  -- Prevent duplicate likes
  unique(sender_id, receiver_id),
  -- Cannot like yourself
  check (sender_id != receiver_id)
);

-- Matches (mutual likes)
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid not null references public.users(id) on delete cascade,
  user2_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  check (user1_id != user2_id)
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- SEED: Sample events (add your own)
-- ============================================================

insert into public.events (name) values
  ('Tech Meetup Nairobi'),
  ('Founders Mixer'),
  ('Design & Drinks'),
  ('Startup Demo Night')
on conflict do nothing;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.checkins enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

-- ── users ──
-- Anyone logged in can read all users (needed for event attendees)
create policy "Users are readable by authenticated users"
  on public.users for select
  to authenticated
  using (true);

-- Users can only insert/update their own profile
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

-- ── events ──
-- Anyone authenticated can read events
create policy "Events are publicly readable"
  on public.events for select
  to authenticated
  using (true);

-- ── checkins ──
-- Authenticated users can read all check-ins (to see who's at an event)
create policy "Checkins are readable by authenticated users"
  on public.checkins for select
  to authenticated
  using (true);

-- Users can only insert their own check-ins
create policy "Users can insert own checkins"
  on public.checkins for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ── likes ──
-- Users can read likes they sent or received
create policy "Users can read own likes"
  on public.likes for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can only insert likes from themselves
create policy "Users can insert own likes"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- ── matches ──
-- Users can only see their own matches
create policy "Users can read own matches"
  on public.matches for select
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Server-side API inserts matches (use service role key in API routes for this)
-- Or allow authenticated inserts if checking mutual likes client-side:
create policy "Authenticated users can create matches"
  on public.matches for insert
  to authenticated
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- ── messages ──
-- Users can read messages for their matches
create policy "Users can read messages in their matches"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      where id = match_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

-- Users can send messages only from themselves
create policy "Users can insert own messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches
      where id = match_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

-- ============================================================
-- REALTIME: Enable for messages table
-- ============================================================

-- Run this to enable realtime on messages
alter publication supabase_realtime add table public.messages;

-- ============================================================
-- INDEXES for performance
-- ============================================================

create index if not exists idx_checkins_event_id on public.checkins(event_id);
create index if not exists idx_checkins_user_id on public.checkins(user_id);
create index if not exists idx_likes_sender_id on public.likes(sender_id);
create index if not exists idx_likes_receiver_id on public.likes(receiver_id);
create index if not exists idx_matches_user1 on public.matches(user1_id);
create index if not exists idx_matches_user2 on public.matches(user2_id);
create index if not exists idx_messages_match_id on public.messages(match_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
