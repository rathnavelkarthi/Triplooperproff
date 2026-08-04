import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { plan, billing_cycle, tenant_id, discount, custom_amount } = await req.json();

    if (!plan || !billing_cycle || !tenant_id) {
      throw new Error("Missing required fields");
    }

    // Determine price in paise (1 INR = 100 paise)
    let amount = 0;
    if (custom_amount && typeof custom_amount === 'number' && custom_amount > 0) {
      amount = Math.round(custom_amount * 100);
    } else if (plan === 'sub_1year') {
      amount = Math.round(23988 * 1.18 * 100);
    } else if (plan === 'sub_6months') {
      amount = Math.round(13800 * 1.18 * 100);
    } else if (plan === 'sub_3months') {
      amount = Math.round(7500 * 1.18 * 100);
    } else if (plan === 'sub_1month') {
      amount = Math.round(2700 * 1.18 * 100);
    } else if (plan === 'subscription_2700') {
      amount = billing_cycle === 'yearly' ? 2700000 : 27000;
    } else if (plan === 'addon_channel_manager') {
      amount = billing_cycle === 'yearly' ? 1500000 : 150000;
    } else if (plan === 'addon_website') {
      amount = billing_cycle === 'yearly' ? 400000 : 40000;
    } else if (plan === 'addon_staff_mgmt') {
      amount = billing_cycle === 'yearly' ? 400000 : 40000;
    } else if (plan === 'addon_whatsapp_mgmt') {
      amount = billing_cycle === 'yearly' ? 400000 : 40000;
    } else if (plan === 'addon_room_mgmt') {
      amount = billing_cycle === 'yearly' ? 400000 : 40000;
    } else if (plan === 'addon_digital_marketing') {
      amount = billing_cycle === 'yearly' ? 1000000 : 100000;
    } else if (plan === 'growth') {
      amount = billing_cycle === 'yearly' ? 2399900 : 249900;
    } else if (plan === 'pro') {
      amount = billing_cycle === 'yearly' ? 4799900 : 499900;
    } else if (plan === 'enterprise') {
      amount = billing_cycle === 'yearly' ? 9599900 : 999900;
    } else if (plan === 'subscription_small') {
      amount = billing_cycle === 'yearly' ? 1500000 : 150000;
    } else if (plan === 'subscription_large') {
      amount = billing_cycle === 'yearly' ? 2100000 : 21000;
    } else if (plan === 'commission') {
      amount = 100; // ₹1 authorization charge for mandate setup
    } else if (plan.startsWith('addon_')) {
      amount = billing_cycle === 'yearly' ? 99900 : 10000;
    } else {
      throw new Error(`Invalid plan: ${plan}`);
    }

    if (discount && typeof discount === 'number') {
      amount = Math.round(amount * (1 - discount / 100));
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") || '';
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || '';

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay API credentials not configured in edge function");
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amount,
        currency: "INR",
        receipt: `receipt_${tenant_id.substring(0, 8)}`,
        notes: {
          tenant_id,
          plan,
          billing_cycle
        }
      }),
    });

    const data = await response.json();
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(data.error?.description || "Razorpay order creation failed");
    }

    return new Response(JSON.stringify({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: razorpayKeyId
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
