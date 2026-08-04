import { supabase, getSupabaseToken } from './supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const PLAN_PRICES: Record<string, Record<string, { amount: number; display: string }>> = {
    sub_1year: { monthly: { amount: 1999, display: '₹1,999/mo' }, yearly: { amount: 23988, display: '₹23,988/yr' } },
    sub_6months: { monthly: { amount: 2300, display: '₹2,300/mo' }, yearly: { amount: 13800, display: '₹13,800' } },
    sub_3months: { monthly: { amount: 2500, display: '₹2,500/mo' }, yearly: { amount: 7500, display: '₹7,500' } },
    sub_1month: { monthly: { amount: 2700, display: '₹2,700/mo' }, yearly: { amount: 2700, display: '₹2,700' } },
    commission: { monthly: { amount: 0, display: '₹0' }, yearly: { amount: 0, display: '₹0' } },
    growth: { monthly: { amount: 2499, display: '₹2,499' }, yearly: { amount: 23999, display: '₹23,999' } },
    pro: { monthly: { amount: 4999, display: '₹4,999' }, yearly: { amount: 47999, display: '₹47,999' } },
    enterprise: { monthly: { amount: 9999, display: '₹9,999' }, yearly: { amount: 95999, display: '₹95,999' } },
    subscription_2700: { monthly: { amount: 2700, display: '₹2,700' }, yearly: { amount: 27000, display: '₹27,000' } },
    subscription_small: { monthly: { amount: 1500, display: '₹1,500' }, yearly: { amount: 15000, display: '₹15,000' } },
    subscription_large: { monthly: { amount: 2100, display: '₹2,100' }, yearly: { amount: 21000, display: '₹21,000' } },
};

export const ADDON_PRICES: Record<string, { amount: number; yearlyAmount: number; display: string; name: string }> = {
    channel_manager: { amount: 1500, yearlyAmount: 15000, display: '₹1,500/mo', name: 'Channel Manager' },
    website: { amount: 400, yearlyAmount: 4000, display: '₹400/mo', name: 'Web Site' },
    staff_mgmt: { amount: 400, yearlyAmount: 4000, display: '₹400/mo', name: 'Staff Management' },
    whatsapp_mgmt: { amount: 400, yearlyAmount: 4000, display: '₹400/mo', name: 'WhatsApp Management' },
    room_mgmt: { amount: 400, yearlyAmount: 4000, display: '₹400/mo', name: 'Room Management' },
    digital_marketing: { amount: 1000, yearlyAmount: 10000, display: '₹1,000/mo', name: 'Digital Marketing' },
    // Legacy keys kept for compatibility
    extra_rooms: { amount: 499, yearlyAmount: 4990, display: '₹499/mo', name: 'Extra 10 Rooms' },
    whatsapp_pack: { amount: 799, yearlyAmount: 7990, display: '₹799/mo', name: 'WhatsApp Pack' },
    custom_domain: { amount: 299, yearlyAmount: 2990, display: '₹299/mo', name: 'Custom Domain' },
    ota_sync: { amount: 1499, yearlyAmount: 14990, display: '₹1,499/mo', name: 'OTA Channel Sync' },
    priority_support: { amount: 999, yearlyAmount: 9990, display: '₹999/mo', name: 'Priority Support' },
    analytics: { amount: 699, yearlyAmount: 6990, display: '₹699/mo', name: 'Advanced Analytics' },
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
    businessName: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
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
        body: JSON.stringify({ plan: `addon_${addonId}`, billing_cycle: billingCycle, tenant_id: tenantId }),
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
            description: `Add-on: ${addon.name} (${billingCycle})`,
            order_id,
            prefill: { email: userEmail },
            notes: { business_name: businessName, addon: addonId, billing_cycle: billingCycle },
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

export async function initiateCustomBundlePayment(
    amountInRupees: number,
    descriptionText: string,
    tenantId: string,
    userEmail: string,
    businessName: string,
    billingCycle: 'monthly' | 'yearly',
    planName: string = 'subscription_2700'
): Promise<PaymentResult> {
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
        body: JSON.stringify({
            plan: planName,
            billing_cycle: billingCycle,
            tenant_id: tenantId,
            custom_amount: amountInRupees
        }),
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
            description: descriptionText,
            order_id,
            prefill: { email: userEmail },
            notes: { business_name: businessName, plan: planName, billing_cycle: billingCycle },
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
                    resolve({ success: true, plan: planName });
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

export async function createAndSendCustomPaymentLink(
    tenantId: string,
    ownerEmail: string,
    businessName: string,
    monthlyPrice: number
): Promise<{ success: boolean; paymentLinkUrl?: string; error?: string }> {
    try {
        const token = await getSupabaseToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                create_payment_link: true,
                billing_cycle: 'monthly',
                custom_amount: monthlyPrice,
                tenant_id: tenantId,
                customer_email: ownerEmail && ownerEmail.includes('@') ? ownerEmail : 'onboarding@triplooper.com',
                customer_name: businessName || 'Property Owner',
                plan: 'subscription_custom'
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            return { success: false, error: err.error || 'Failed to create payment link' };
        }

        const data = await res.json();
        const paymentLinkUrl = 
            data.short_url || 
            data.payment_link_url || 
            data.url || 
            (data.payment_link_id ? `https://rzp.io/i/${data.payment_link_id}` : `https://triplooper.com/admin/login?tenant=${tenantId}`);

        // Update database with custom_monthly_price & payment_link_url
        await supabase
            .from('tenants')
            .update({
                custom_monthly_price: monthlyPrice,
                payment_link_url: paymentLinkUrl,
                payment_link_id: data.payment_link_id,
                subscription_plan: 'subscription_custom',
                subscription_status: 'pending_payment'
            })
            .eq('id', tenantId);

        await supabase
            .from('subscriptions')
            .upsert({
                tenant_id: tenantId,
                plan: 'subscription_custom',
                status: 'pending_payment',
                custom_monthly_price: monthlyPrice,
                updated_at: new Date().toISOString()
            });

        // Send email with payment link
        const { sendCustomSubscriptionInvite } = await import('./email');
        const emailSent = await sendCustomSubscriptionInvite({
            email: ownerEmail,
            businessName,
            monthlyPrice,
            paymentUrl: paymentLinkUrl
        });

        return {
            success: true,
            paymentLinkUrl,
            error: emailSent ? undefined : 'Link created, but email notification failed'
        };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error generating payment link' };
    }
}

