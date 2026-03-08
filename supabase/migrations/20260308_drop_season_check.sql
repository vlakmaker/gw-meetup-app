-- Drop the CHECK constraint on current_season to allow free-form text
-- (needed for the "Other" season option added to onboarding)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_current_season_check;
