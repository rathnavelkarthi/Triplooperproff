import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

// WEB-008: restrict CORS to known origins instead of "*".
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://triplooper.com,https://www.triplooper.com")
  .split(",").map((s) => s.trim());

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Platform admins allowed to approve/reject. Mirrors PLATFORM_ADMIN_EMAILS in
// src/context/AuthContext.tsx and the allowlist in delete-user/index.ts.
const PLATFORM_ADMIN_EMAILS = [
  "rathnavelkarthi1@gmail.com",
  "admin@triplooper.com",
].map((e) => e.toLowerCase());

const BUCKET = "property-documents";
const SIGNED_URL_TTL = 300; // seconds

serve(async (req) => {
  const corsHeaders = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const tenant_id: string | undefined = body.tenant_id;
    const action: string | undefined = body.action; // 'approve' | 'reject' | 'listDocuments'
    const reason: string | undefined = body.reason;
    const requester_email: string | undefined = body.requester_email;

    if (!tenant_id || !action) {
      return json({ error: "Missing tenant_id or action" }, 400);
    }

    // --- Authorize the caller as a platform admin (server-side allowlist) ---
    // Prefer the verified JWT identity; fall back to requester_email like delete-user.
    let callerEmail = (requester_email || "").toLowerCase();
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: claims } = await supabaseAdmin.auth.getClaims(token);
      const jwtEmail = (claims?.claims?.email as string | undefined)?.toLowerCase();
      if (jwtEmail) callerEmail = jwtEmail;
    }
    if (!callerEmail || !PLATFORM_ADMIN_EMAILS.includes(callerEmail)) {
      return json({ error: "Forbidden: platform admin only" }, 403);
    }

    // --- listDocuments: return short-lived signed URLs for the proofs ---
    if (action === "listDocuments") {
      const { data: docs, error: docsErr } = await supabaseAdmin
        .from("property_documents")
        .select("id, doc_type, file_path, file_name, uploaded_at")
        .eq("tenant_id", tenant_id)
        .order("uploaded_at", { ascending: false });
      if (docsErr) return json({ error: docsErr.message }, 400);

      const documents = [] as Array<Record<string, unknown>>;
      for (const d of docs || []) {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(d.file_path, SIGNED_URL_TTL);
        documents.push({
          id: d.id,
          doc_type: d.doc_type,
          file_name: d.file_name,
          uploaded_at: d.uploaded_at,
          url: signed?.signedUrl || null,
        });
      }
      return json({ documents });
    }

    // --- approve / reject: write status, then notify owner ---
    if (action !== "approve" && action !== "reject") {
      return json({ error: `Unknown action '${action}'` }, 400);
    }
    if (action === "reject" && !reason?.trim()) {
      return json({ error: "A rejection reason is required" }, 400);
    }

    const update = action === "approve"
      ? { verification_status: "approved", verified_at: new Date().toISOString(), verification_reason: null }
      : { verification_status: "rejected", verification_reason: reason!.trim() };

    const { data: tenant, error: updErr } = await supabaseAdmin
      .from("tenants")
      .update(update)
      .eq("id", tenant_id)
      .select("id, business_name, custom_email, phone, owner_id")
      .single();
    if (updErr || !tenant) {
      return json({ error: updErr?.message || "Tenant not found" }, 400);
    }

    // Resolve the owner's email: tenant.custom_email, else staff row for owner_id.
    let ownerEmail = tenant.custom_email as string | null;
    if (!ownerEmail && tenant.owner_id) {
      const { data: staffRow } = await supabaseAdmin
        .from("staff")
        .select("email")
        .eq("id", tenant.owner_id)
        .maybeSingle();
      ownerEmail = staffRow?.email || null;
    }

    // WhatsApp notification (best-effort). Reuses the send-whatsapp function.
    let whatsappSent = false;
    if (tenant.phone) {
      const waMessage = action === "approve"
        ? `✅ Great news! The documents for *${tenant.business_name}* have been verified and your Triplooper property is now live. Sign in at https://triplooper.com/admin/login`
        : `⚠️ The documents for *${tenant.business_name}* could not be verified.\n\nReason: ${reason!.trim()}\n\nPlease sign in and re-upload the corrected document: https://triplooper.com/admin/verification`;
      try {
        const { data: waData } = await supabaseAdmin.functions.invoke("send-whatsapp", {
          body: {
            tenant_id,
            phone: tenant.phone,
            message_type: `property_verification_${action}`,
            message: waMessage,
          },
        });
        whatsappSent = !!waData?.success;
      } catch { /* best-effort */ }
    }

    // Email is fired client-side by PlatformAdmin (reuses the /api/send-email
    // proxy that already works in-browser); return the address + status so it can.
    return json({
      success: true,
      status: update.verification_status,
      ownerEmail,
      businessName: tenant.business_name,
      whatsappSent,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, 400);
  }
});
