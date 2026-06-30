import { supabase } from './supabaseClient';

export interface WhatsAppConfirmationData {
  guestName: string;
  guestPhone: string;
  roomType: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  reservationId: string;
  businessName: string;
  guestToken?: string;
}

/**
 * Sends an automated WhatsApp booking confirmation message to the guest.
 * Includes details of the stay and a login magic link for the guest portal to upload ID documents.
 */
export async function sendWhatsAppConfirmation(data: WhatsAppConfirmationData, tenantId: string) {
  if (!data.guestPhone) {
    console.warn('[WhatsApp] No phone number provided for booking confirmation.');
    return { success: false, reason: 'No phone number' };
  }

  try {
    // 1. Fetch tenant config and settings
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('whatsapp_enabled, google_review_url, whatsapp_templates, subdomain')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('[WhatsApp] Failed to fetch tenant details:', tenantError);
      return { success: false, reason: 'Tenant not found' };
    }

    if (!tenant.whatsapp_enabled) {
      console.info('[WhatsApp] WhatsApp is not enabled for this tenant.');
      return { success: false, reason: 'WhatsApp disabled' };
    }

    // 2. Fetch contact info (address / phone) from cms_settings
    const { data: cmsData } = await supabase
      .from('cms_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId);

    let hotelPhone = '';
    let hotelAddress = '';
    if (cmsData) {
      const phoneItem = cmsData.find(c => c.setting_key === 'contactPhone');
      const addressItem = cmsData.find(c => c.setting_key === 'contactAddress');
      if (phoneItem) hotelPhone = phoneItem.setting_value;
      if (addressItem) hotelAddress = addressItem.setting_value;
    }

    // Default template fallback if not defined in config
    const template = tenant.whatsapp_templates?.confirmation || 
      `✅ *Booking Confirmed!*\n\nDear {guest_name}, your stay is confirmed.\n\n🏠 Room: {room_type}\n📅 Check-in: {check_in}\n📅 Check-out: {check_out}\n🔖 Booking ID: {booking_id}\n\n🔗 Guest Portal (Upload Aadhaar & View Stay):\n{guest_portal_url}\n\nFor assistance: {hotel_phone}`;

    // 3. Construct Guest Portal URL
    const portalUrl = data.guestToken 
      ? `${window.location.origin}/guest/${data.guestToken}` 
      : `${window.location.origin}/guest/portal`;

    // 4. Map variables
    const formattedMessage = template
      .replace(/{guest_name}/g, data.guestName)
      .replace(/{hotel_name}/g, data.businessName)
      .replace(/{room_type}/g, data.roomNumber ? `Room ${data.roomNumber} (${data.roomType})` : data.roomType)
      .replace(/{check_in}/g, data.checkIn)
      .replace(/{check_out}/g, data.checkOut)
      .replace(/{booking_id}/g, data.reservationId)
      .replace(/{hotel_phone}/g, hotelPhone || '')
      .replace(/{hotel_address}/g, hotelAddress || '')
      .replace(/{google_review_url}/g, tenant.google_review_url || '')
      .replace(/{guest_portal_url}/g, portalUrl);

    console.log('[WhatsApp] Triggering confirmation notification to:', data.guestPhone);

    // 5. Invoke Deno send-whatsapp edge function
    const { data: resData, error: invokeError } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        tenant_id: tenantId,
        phone: data.guestPhone,
        message: formattedMessage,
        message_type: 'confirmation'
      }
    });

    if (invokeError) {
      console.error('[WhatsApp] Edge function invocation error:', invokeError);
      return { success: false, error: invokeError };
    }

    return resData || { success: true };
  } catch (error) {
    console.error('[WhatsApp] Exception in sendWhatsAppConfirmation:', error);
    return { success: false, error };
  }
}
