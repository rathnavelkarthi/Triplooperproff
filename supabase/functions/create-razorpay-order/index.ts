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

    const { plan, billing_cycle, tenant_id, discount } = await req.json();

    if (!plan || !billing_cycle || !tenant_id) {
      throw new Error("Missing required fields");
    }

    // Determine price in paise (1 INR = 100 paise)
    let amount = 0;
    if (plan === 'growth') {
      amount = billing_cycle === 'yearly' ? 2399900 : 249900;
    } else if (plan === 'pro') {
      amount = billing_cycle === 'yearly' ? 4799900 : 499900;
    } else if (plan === 'enterprise') {
      amount = billing_cycle === 'yearly' ? 9599900 : 999900;
    } else if (plan === 'subscription_small') {
      amount = 1500000; // ₹15,000 yearly
    } else if (plan === 'subscription_large') {
      amount = 2100000; // ₹21,000 yearly
    } else if (plan === 'commission') {
      amount = 100; // ₹1 authorization charge for mandate setup
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
