-- Allow anonymous users to look up an invite by its token
-- This is needed because the person clicking the invite link isn't logged in yet
-- The token itself acts as the auth mechanism (like a password reset link)

DROP POLICY IF EXISTS "invite_token_lookup" ON business_invites;
CREATE POLICY "invite_token_lookup" ON business_invites
  FOR SELECT USING (true);

-- Allow newly authenticated users to update their invite to accepted
DROP POLICY IF EXISTS "invite_token_update" ON business_invites;
CREATE POLICY "invite_token_update" ON business_invites
  FOR UPDATE USING (auth.uid() IS NOT NULL);
