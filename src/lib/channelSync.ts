import { supabase } from './supabaseClient';

export interface ChannelSyncResult {
  success: boolean;
  message?: string;
  pushedRooms?: Array<{ roomCode: string; available: number }>;
}

/**
 * Pushes live room inventory to Aiosell and connected OTAs in real time.
 * Calculates available room counts per room type/code considering active bookings & slots.
 */
export async function pushLiveInventoryToChannels(tenantId: string): Promise<ChannelSyncResult> {
  if (!tenantId) {
    return { success: false, message: 'Tenant ID is required for channel sync.' };
  }

  try {
    // 1. Check if Aiosell or channel manager is configured for this tenant
    const { data: conn } = await supabase
      .from('channel_connections')
      .select('property_id, status')
      .eq('tenant_id', tenantId)
      .eq('channel_id', 'aiosell')
      .maybeSingle();

    if (!conn?.property_id || conn.status === 'inactive') {
      // Channel connection not active for this tenant - skip without error
      return { success: true, message: 'Channel connection not configured or inactive.' };
    }

    // 2. Fetch room mappings for this tenant
    const { data: mappings, error: mapErr } = await supabase
      .from('aiosell_room_mappings')
      .select('room_code, room_id, rateplan_code')
      .eq('tenant_id', tenantId);

    if (mapErr || !mappings || mappings.length === 0) {
      return { success: true, message: 'No Aiosell room mappings found.' };
    }

    // 3. Fetch all active physical rooms
    const { data: rooms, error: roomsErr } = await supabase
      .from('rooms')
      .select('id, name, type, status, is_available')
      .eq('tenant_id', tenantId)
      .eq('is_available', true);

    if (roomsErr || !rooms || rooms.length === 0) {
      return { success: false, message: 'No rooms found for tenant.' };
    }

    // 4. Fetch active reservations (today to +90 days)
    const today = new Date().toISOString().slice(0, 10);
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    const { data: activeRes } = await supabase
      .from('reservations')
      .select('id, room_id, room_type, status, check_in, check_out')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("CANCELLED","Cancelled","NO_SHOW","No Show")')
      .or(`and(check_in.lte.${in90},check_out.gte.${today})`);

    const reservedRoomIds = new Set(
      (activeRes || [])
        .filter(r => r.room_id)
        .map(r => Number(r.room_id))
    );

    // Group mappings by room_code
    const roomCodeMap = new Map<string, typeof mappings>();
    for (const m of mappings) {
      if (!roomCodeMap.has(m.room_code)) roomCodeMap.set(m.room_code, []);
      roomCodeMap.get(m.room_code)!.push(m);
    }

    // 5. Calculate available inventory per room_code
    const inventoryRooms = Array.from(roomCodeMap.keys()).map(rc => {
      // Find matching rooms for this code
      const matchingRooms = rooms.filter(r =>
        (r.type || '').toLowerCase() === rc.toLowerCase() ||
        (r.name || '').toLowerCase().includes(rc.toLowerCase()) ||
        rc.toLowerCase().includes((r.type || '').toLowerCase())
      );

      const targetPool = matchingRooms.length > 0 ? matchingRooms : rooms;
      // Count rooms in pool that are NOT occupied or in maintenance
      const availableUnits = targetPool.filter(r => 
        r.status !== 'Maintenance' && 
        r.status !== 'Occupied' &&
        !reservedRoomIds.has(r.id)
      ).length;

      return {
        roomCode: rc,
        available: Math.max(0, availableUnits),
      };
    });

    if (inventoryRooms.length === 0) {
      return { success: true, message: 'No inventory updates needed.' };
    }

    // 6. Invoke aiosell-push edge function
    const { data: pushData, error: pushErr } = await supabase.functions.invoke('aiosell-push', {
      body: {
        tenant_id: tenantId,
        action: 'inventory',
        updates: [{
          startDate: today,
          endDate: in90,
          rooms: inventoryRooms,
        }],
      },
    });

    if (pushErr) {
      console.warn('[ChannelSync] Warning pushing inventory to Aiosell:', pushErr);
      return { success: false, message: pushErr.message };
    }

    console.info('[ChannelSync] Successfully synchronized room inventory with Aiosell:', inventoryRooms);
    return { success: true, pushedRooms: inventoryRooms, message: 'Live inventory pushed to channels.' };
  } catch (err: any) {
    console.warn('[ChannelSync] Exception during channel inventory push:', err);
    return { success: false, message: err?.message || 'Sync error' };
  }
}
