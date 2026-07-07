import { supabase, getSupabaseToken } from './supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const PLAN_PRICES: Record<string, Record<string, { amount: number; display: string }>> = {
    growth: { monthly: { amount: 2499, display: '₹2,499' }, yearly: { amount: 23999, display: '₹23,999' } },
    pro: { monthly: { amount: 4999, display: '₹4,999' }, yearly: { amount: 47999, display: '₹47,999' } },
    enterprise: { monthly: { amount: 9999, display: '₹9,999' }, yearly: { amount: 95999, display: '₹95,999' } },
    subscription_small: { monthly: { amount: 1500, display: '₹1,500' }, yearly: { amount: 15000, display: '₹15,000' } },
    subscription_large: { monthly: { amount: 2100, display: '₹2,100' }, yearly: { amount: 21000, display: '₹21,000' } },
    commission: { monthly: { amount: 0, display: '₹0' }, yearly: { amount: 0, display: '₹0' } }
};

export const ADDON_PRICES: Record<string, { amount: number; display: string; name: string }> = {
    extra_rooms: { amount: 499, display: '₹499', name: 'Extra 10 Rooms' },
    whatsapp_pack: { amount: 799, display: '₹799', name: 'WhatsApp Pack' },
    custom_domain: { amount: 299, display: '₹299', name: 'Custom Domain' },
    ota_sync: { amount: 1499, display: '₹1,499', name: 'OTA Channel Sync' },
    priority_support: { amount: 999, display: '₹999', name: 'Priority Support' },
    analytics: { amount: 699, display: '₹699', name: 'Advanced Analytics' },
};

export function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-sdk')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-sdk';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

interface PaymentResult {
    success: boolean;
    plan?: string;
    expires_at?: string;
    error?: string;
}

export async function initiatePayment(
    plan: string,
    billingCycle: 'monthly' | 'yearly',
    tenantId: string,
    userEmail: string,
    businessName: string,
    discount?: number
): Promise<PaymentResult> {
    const loaded = await loadRazorpayScript();
    if (!loaded) return { success: false, error: 'Failed to load Razorpay SDK' };

    // 1. Create order via edge function
    const token = await getSupabaseToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan, billing_cycle: billingCycle, tenant_id: tenantId, discount }),
    });

    if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({ error: `HTTP ${orderRes.status}` }));
        const detail = err.details ? ` (${typeof err.details === 'string' ? err.details.substring(0, 100) : JSON.stringify(err.details).substring(0, 100)})` : '';
        return { success: false, error: (err.error || 'Order creation failed') + detail };
    }

    const { order_id, amount, currency, key_id } = await orderRes.json();

    // 2. Open Razorpay Checkout
    return new Promise((resolve) => {
        const options = {
            key: key_id,
            amount,
            currency,
            name: 'Triplooper',
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${billingCycle}`,
            order_id,
            prefill: {
                email: userEmail,
                contact: '',
            },
            notes: {
                business_name: businessName,
                plan,
                billing_cycle: billingCycle,
            },
            theme: {
                color: '#0E2A38',
            },
            handler: async function (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
                // 3. Verify payment
                const verifyHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                };
                if (token) {
                    verifyHeaders['Authorization'] = `Bearer ${token}`;
                }

                const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
                    method: 'POST',
                    headers: verifyHeaders,
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    }),
                });

                if (verifyRes.ok) {
                    const result = await verifyRes.json();
                    resolve({ success: true, plan: result.plan, expires_at: result.expires_at });
                } else {
                    resolve({ success: false, error: 'Payment verification failed' });
                }
            },
            modal: {
                ondismiss: function () {
                    resolve({ success: false, error: 'Payment cancelled' });
                },
            },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    });
}

export async function initiateAddonPayment(
    addonId: string,
    tenantId: string,
    userEmail: string,
    businessName: string
): Promise<PaymentResult> {
    const addon = ADDON_PRICES[addonId];
    if (!addon) return { success: false, error: 'Unknown add-on' };

    const loaded = await loadRazorpayScript();
    if (!loaded) return { success: false, error: 'Failed to load Razorpay SDK' };

    const token = await getSupabaseToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: `addon_${addonId}`, billing_cycle: 'monthly', tenant_id: tenantId }),
    });

    if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({ error: `HTTP ${orderRes.status}` }));
        return { success: false, error: err.error || 'Order creation failed' };
    }

    const { order_id, amount, currency, key_id } = await orderRes.json();

    return new Promise((resolve) => {
        const options = {
            key: key_id,
            amount,
            currency,
            name: 'Triplooper',
            description: `Add-on: ${addon.name}`,
            order_id,
            prefill: { email: userEmail },
            notes: { business_name: businessName, addon: addonId },
            theme: { color: '#0E2A38' },
            handler: async function (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
                const verifyHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                };
                if (token) {
                    verifyHeaders['Authorization'] = `Bearer ${token}`;
                }

                const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
                    method: 'POST',
                    headers: verifyHeaders,
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    }),
                });
                if (verifyRes.ok) {
                    resolve({ success: true, plan: `addon_${addonId}` });
                } else {
                    resolve({ success: false, error: 'Payment verification failed' });
                }
            },
            modal: { ondismiss: () => resolve({ success: false, error: 'Payment cancelled' }) },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    });
}
