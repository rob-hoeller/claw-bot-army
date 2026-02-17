import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/chat/upload-media
 *
 * Accepts multipart form data with a file + metadata.
 * Uploads to Supabase Storage bucket `chat-media` and inserts metadata into `chat_media` table.
 * Returns a signed URL (10-year expiry).
 *
 * Form fields:
 *   file        — the file to upload (required)
 *   channel     — channel identifier (default: "unknown")
 *   session_key — session key
 *   sender_id   — sender identifier
 *   mime_type   — override MIME type (defaults to file type)
 */

const BUCKET = 'chat-media'
const SIGNED_URL_EXPIRY = 315_360_000 // ~10 years

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const channel = (formData.get('channel') as string) || 'unknown'
    const sessionKey = (formData.get('session_key') as string) || null
    const senderId = (formData.get('sender_id') as string) || null
    const mimeType = (formData.get('mime_type') as string) || file?.type || 'application/octet-stream'

    if (!file) {
      return NextResponse.json({ error: "Missing 'file' in form data" }, { status: 400 })
    }

    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]
    const fileName = file.name
    const storagePath = `${channel}/${today}/${fileName}`

    // Deduplication: skip if same file_name + storage_path exists
    const { data: existing } = await supabase
      .from('chat_media')
      .select('id, storage_url')
      .eq('file_name', fileName)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        status: 'duplicate',
        id: existing.id,
        storage_url: existing.storage_url,
        message: 'File already exists',
      })
    }

    // Upload to Supabase Storage
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError && !uploadError.message.includes('already exists')) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Generate signed URL (10-year expiry)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    if (signError) throw new Error(`Signed URL failed: ${signError.message}`)

    const storageUrl = signedData.signedUrl

    // Insert metadata row
    const { data: row, error: insertError } = await supabase
      .from('chat_media')
      .insert({
        file_name: fileName,
        storage_path: storagePath,
        storage_url: storageUrl,
        session_key: sessionKey,
        sender_id: senderId,
        channel,
        mime_type: mimeType,
        file_size: buffer.byteLength,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`)

    return NextResponse.json({
      status: 'uploaded',
      id: row.id,
      file_name: fileName,
      storage_path: storagePath,
      storage_url: storageUrl,
      file_size: buffer.byteLength,
    }, { status: 201 })
  } catch (err) {
    console.error('upload-media error:', err)
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
