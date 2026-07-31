-- Enable public SELECT policy on tenants table so guest users can view registered properties in marketplace
DROP POLICY IF EXISTS "tenants_public_select" ON tenants;
CREATE POLICY "tenants_public_select" ON tenants
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "rooms_public_select" ON rooms;
CREATE POLICY "rooms_public_select" ON rooms
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "testimonials_public_select" ON testimonials;
CREATE POLICY "testimonials_public_select" ON testimonials
  FOR SELECT
  TO public
  USING (true);
