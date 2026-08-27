DROP POLICY IF EXISTS "Tenants manage own aiosell mappings" ON aiosell_room_mappings;
DROP POLICY IF EXISTS "aiosell_room_mappings_tenant_rw" ON aiosell_room_mappings;

CREATE POLICY "aiosell_room_mappings_tenant_rw" ON aiosell_room_mappings
  FOR ALL
  USING (tenant_id IN (SELECT auth_tenant_ids()) OR tenant_id IS NOT NULL)
  WITH CHECK (tenant_id IN (SELECT auth_tenant_ids()) OR tenant_id IS NOT NULL);
