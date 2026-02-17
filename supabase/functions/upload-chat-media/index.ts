import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "chat-media";
const SIGNED_URL_EXPIRY = 315_360_000; // ~10 years in seconds

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const channel = (formData.get("channel") as string) || "unknown";
    const sessionKey = (formData.get("session_key") as string) || null;
    const senderId = (formData.get("sender_id") as string) || null;
    const mimeType = (formData.get("mime_type") as string) || file?.type || "application/octet-stream";

    if (!file) {
      return new Response(JSON.stringify({ error: "Missing 'file' in form data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const fileName = file.name;
    const storagePath = `${channel}/${today}/${fileName}`;

    // Deduplication check
    const { data: existing } = await supabase
      .from("chat_media")
      .select("id, storage_url")
      .eq("file_name", fileName)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          status: "duplicate",
          id: existing.id,
          storage_url: existing.storage_url,
          message: "File already exists",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError && !uploadError.message.includes("already exists")) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Generate signed URL (10-year expiry)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signError) throw new Error(`Signed URL failed: ${signError.message}`);

    const storageUrl = signedData.signedUrl;

    // Insert metadata
    const { data: row, error: insertError } = await supabase
      .from("chat_media")
      .insert({
        file_name: fileName,
        storage_path: storagePath,
        storage_url: storageUrl,
        session_key: sessionKey,
        sender_id: senderId,
        channel,
        mime_type: mimeType,
        file_size: fileBuffer.byteLength,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    return new Response(
      JSON.stringify({
        status: "uploaded",
        id: row.id,
        file_name: fileName,
        storage_path: storagePath,
        storage_url: storageUrl,
        file_size: fileBuffer.byteLength,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
