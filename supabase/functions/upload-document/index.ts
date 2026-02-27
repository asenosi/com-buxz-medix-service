import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { filePath, documentTypeHint } = await req.json();
    if (!filePath) throw new Error("filePath is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create document record
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .insert({
        user_id: userId,
        original_file_url: filePath,
        status: "UPLOADED",
        document_type_hint: documentTypeHint || "UNKNOWN",
      })
      .select()
      .single();

    if (docErr) throw new Error("Failed to create document: " + docErr.message);

    // Audit event
    await supabaseAdmin.from("audit_events").insert({
      document_id: doc.id,
      event_type: "DOCUMENT_UPLOADED",
      payload: { filePath, documentTypeHint },
    });

    // Trigger processing via internal call
    const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-document`;
    const processResp = await fetch(processUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: doc.id }),
    });

    if (!processResp.ok) {
      const errBody = await processResp.text();
      console.error("process-document call failed:", processResp.status, errBody);
      // Don't fail the upload — doc is created, processing can be retried
    }

    const processResult = processResp.ok ? await processResp.json() : null;

    return new Response(JSON.stringify({ documentId: doc.id, status: doc.status, processResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upload-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
