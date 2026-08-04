import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ||
  'https://triplooper.com,https://www.triplooper.com,http://localhost:5173')
  .split(',').map((s) => s.trim());

function corsFor(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost') ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing required fields");
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") || '';
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || '';

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay API credentials not configured in edge function");
    }

    // 1. Verify payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Signature verification failed");
    }

    // 2. Fetch order details from Razorpay to get metadata notes (tenant_id, plan, billing_cycle)
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error("Failed to fetch order details from Razorpay");
    }

    const { tenant_id, plan, billing_cycle } = orderData.notes || {};
    if (!tenant_id || !plan) {
      throw new Error("Missing metadata notes in Razorpay order");
    }

    // 3. Update database using admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const maxRoomsVal = plan === 'commission'
      ? 9999
      : (plan === 'subscription_small' ? 10 : 9999);

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({
        plan,
        payment_setup: true,
        max_rooms: maxRoomsVal,
        razorpay_customer_id: orderData.customer_id || 'cust_' + Math.random().toString(36).substring(7),
        razorpay_subscription_id: plan.startsWith('subscription') ? 'sub_' + Math.random().toString(36).substring(7) : null,
        razorpay_mandate_id: 'mandate_' + Math.random().toString(36).substring(7),
      })
      .eq('id', tenant_id);

    if (updateError) {
      throw updateError;
    }

    // If it's a subscription plan, log to subscriptions table
    let expiresAt = null;
    if (plan.startsWith('subscription') || plan.startsWith('sub_') || plan === 'growth' || plan === 'pro' || plan === 'enterprise') {
      const durationDays = billing_cycle === 'yearly' ? 365 : 30;
      expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabaseAdmin.from('subscriptions').insert({
        tenant_id,
        plan,
        status: 'paid',
        amount: orderData.amount / 100,
        expires_at: expiresAt,
        razorpay_payment_id,
      });
      if (insertError) {
        throw insertError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      plan,
      expires_at: expiresAt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
