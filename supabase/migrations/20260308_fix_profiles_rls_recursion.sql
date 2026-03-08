-- Fix infinite recursion in profiles SELECT policy
-- The policy subqueried profiles to get the user's meetup_id, causing recursion on INSERT

-- 1. Helper function that bypasses RLS (SECURITY DEFINER breaks the recursive cycle)
CREATE OR REPLACE FUNCTION get_my_meetup_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT meetup_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Replace the recursive policy with one that uses the helper function
DROP POLICY IF EXISTS "Users can read checked-in profiles in their meetup" ON public.profiles;

CREATE POLICY "Users can read checked-in profiles in their meetup"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    checked_in = true
    AND meetup_id = get_my_meetup_id()
  );
