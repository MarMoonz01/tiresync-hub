-- ─────────────────────────────────────────────────────────────────────────────
-- user_invites: tracks email invites sent by moderators (for owners)
--               and store owners (for staff).
-- The trigger auto-approves the profile and adds to store_members
-- when the invited user's profile is first created.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  invited_as  text        NOT NULL CHECK (invited_as IN ('owner', 'staff')),
  store_id    uuid        REFERENCES public.stores(id) ON DELETE CASCADE,
  invited_by  uuid        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  accepted_at timestamptz
);

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Moderators / admins can read all invites
CREATE POLICY "moderators_read_invites" ON public.user_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('moderator', 'admin')
    )
  );

-- Store owners can read invites they sent
CREATE POLICY "owners_read_own_invites" ON public.user_invites
  FOR SELECT USING (invited_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: when a profile is inserted, check if the user was invited.
-- If so: auto-approve them and (for staff) add them to the store.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_handle_invited_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_rec RECORD;
BEGIN
  SELECT * INTO invite_rec
  FROM public.user_invites
  WHERE email       = NEW.email
    AND accepted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Auto-approve the profile
    UPDATE public.profiles
    SET status = 'approved'
    WHERE user_id = NEW.user_id;

    -- For staff invites: add to the store immediately
    IF invite_rec.invited_as = 'staff' AND invite_rec.store_id IS NOT NULL THEN
      INSERT INTO public.store_members (store_id, user_id, role)
      VALUES (invite_rec.store_id, NEW.user_id, 'staff')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Mark invite as accepted
    UPDATE public.user_invites
    SET accepted_at = now()
    WHERE id = invite_rec.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_check_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_handle_invited_user();

-- Index for the trigger lookup
CREATE INDEX IF NOT EXISTS idx_user_invites_email_pending
  ON public.user_invites (email)
  WHERE accepted_at IS NULL;
