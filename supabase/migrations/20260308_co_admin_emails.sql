-- Add co-admin support to meetups
-- co_admin_emails: array of email addresses of co-admins (in addition to admin_user_id)

-- 1. Add column
ALTER TABLE public.meetups ADD COLUMN co_admin_emails TEXT[] DEFAULT '{}';

-- 2. Update topic_options admin policy to allow co-admins
DROP POLICY IF EXISTS "Admins can manage topic options" ON public.topic_options;
CREATE POLICY "Admins can manage topic options"
  ON public.topic_options FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = topic_options.meetup_id
      AND (admin_user_id = auth.uid() OR auth.email() = ANY(co_admin_emails))
    )
  );

-- 3. Update conversation_prompts admin policy to allow co-admins
DROP POLICY IF EXISTS "Admins can manage prompts" ON public.conversation_prompts;
CREATE POLICY "Admins can manage prompts"
  ON public.conversation_prompts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = conversation_prompts.meetup_id
      AND (admin_user_id = auth.uid() OR auth.email() = ANY(co_admin_emails))
    )
  );

-- 4. Update profiles admin policy to allow co-admins
DROP POLICY IF EXISTS "Admins can manage profiles in their meetup" ON public.profiles;
CREATE POLICY "Admins can manage profiles in their meetup"
  ON public.profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = profiles.meetup_id
      AND (admin_user_id = auth.uid() OR auth.email() = ANY(co_admin_emails))
    )
  );
