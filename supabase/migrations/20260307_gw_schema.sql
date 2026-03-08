-- ============================================
-- GENERALIST WORLD MEETUP APP — SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MEETUPS
-- Each event gets its own isolated pool
-- ============================================
CREATE TABLE public.meetups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE,
  invite_code TEXT UNIQUE NOT NULL, -- short code used in invite URL
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOPIC OPTIONS
-- Admin sets these per meetup — the MCQ choices for discussion topics
-- ============================================
CREATE TABLE public.topic_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION PROMPTS
-- Admin adds these per meetup — shown as starters in the app
-- ============================================
CREATE TABLE public.conversation_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES
-- One per user per meetup
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,

  -- New Generalist World profile fields
  work_one_liner TEXT, -- max 80 chars: what they do
  current_season TEXT CHECK (current_season IN (
    'in_transition',
    'building_something',
    'exploring_ideas',
    'looking_for_role',
    'growing_in_role',
    'taking_a_break'
  )),
  discussion_topics TEXT[] DEFAULT '{}', -- up to 3, from topic_options labels
  hoping_for TEXT CHECK (hoping_for IN (
    'collaborator',
    'new_perspective',
    'advice',
    'good_conversation'
  )),

  -- Contact & visibility
  linkedin_url TEXT,
  linkedin_public BOOLEAN DEFAULT false, -- true = visible to all in meetup
  share_email BOOLEAN DEFAULT false,     -- email shown on mutual connection

  -- Event status
  checked_in BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MATCHES
-- Pre-computed by Claude, scoped to meetup
-- ============================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  match_reason TEXT NOT NULL,       -- one-liner: why they should meet
  conversation_starter TEXT NOT NULL, -- specific prompt to kick off conversation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- Ensure consistent pair ordering (user_a < user_b) to prevent duplicates
CREATE OR REPLACE FUNCTION ensure_match_order()
RETURNS TRIGGER AS $$
DECLARE temp UUID;
BEGIN
  IF NEW.user_a > NEW.user_b THEN
    temp := NEW.user_a;
    NEW.user_a := NEW.user_b;
    NEW.user_b := temp;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_order_trigger
BEFORE INSERT OR UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION ensure_match_order();

-- ============================================
-- WAVES
-- Lightweight "I want to meet you" signal
-- ============================================
CREATE TABLE public.waves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user, to_user)
);

-- ============================================
-- CONNECTIONS
-- Created automatically when two users wave at each other
-- Unlocks LinkedIn (if private) and email (if opted in)
-- ============================================
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- Auto-create connection when a mutual wave is detected
CREATE OR REPLACE FUNCTION create_mutual_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the reverse wave already exists
  IF EXISTS (
    SELECT 1 FROM public.waves
    WHERE from_user = NEW.to_user AND to_user = NEW.from_user
  ) THEN
    -- Create connection (ordered so user_a < user_b)
    INSERT INTO public.connections (meetup_id, user_a, user_b)
    VALUES (
      NEW.meetup_id,
      LEAST(NEW.from_user, NEW.to_user),
      GREATEST(NEW.from_user, NEW.to_user)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wave_mutual_connection
AFTER INSERT ON public.waves
FOR EACH ROW EXECUTE FUNCTION create_mutual_connection();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- MEETUPS: anyone authenticated can read (needed to join via invite link)
CREATE POLICY "Anyone can read meetups"
  ON public.meetups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create meetups"
  ON public.meetups FOR INSERT TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Admins can update their meetup"
  ON public.meetups FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid());

-- TOPIC OPTIONS: readable by meetup participants
CREATE POLICY "Participants can read topic options"
  ON public.topic_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage topic options"
  ON public.topic_options FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = topic_options.meetup_id AND admin_user_id = auth.uid()
    )
  );

-- CONVERSATION PROMPTS: readable by all, managed by admin
CREATE POLICY "Participants can read prompts"
  ON public.conversation_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage prompts"
  ON public.conversation_prompts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = conversation_prompts.meetup_id AND admin_user_id = auth.uid()
    )
  );

-- PROFILES: users can see checked-in profiles in their meetup
CREATE POLICY "Users can read checked-in profiles in their meetup"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    checked_in = true
    AND meetup_id = (
      SELECT meetup_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Users can always read their own profile (even if not checked in yet)
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Admins can read and update all profiles in their meetup (for check-in)
CREATE POLICY "Admins can manage profiles in their meetup"
  ON public.profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = profiles.meetup_id AND admin_user_id = auth.uid()
    )
  );

-- MATCHES: users can see their own matches
CREATE POLICY "Users can read own matches"
  ON public.matches FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Service role can insert matches"
  ON public.matches FOR INSERT TO service_role WITH CHECK (true);

-- WAVES: users can read and send waves
CREATE POLICY "Users can read waves involving them"
  ON public.waves FOR SELECT TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid());

CREATE POLICY "Users can send waves"
  ON public.waves FOR INSERT TO authenticated
  WITH CHECK (from_user = auth.uid());

-- CONNECTIONS: users can see their own connections
CREATE POLICY "Users can read own connections"
  ON public.connections FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "System can create connections"
  ON public.connections FOR INSERT TO service_role WITH CHECK (true);
