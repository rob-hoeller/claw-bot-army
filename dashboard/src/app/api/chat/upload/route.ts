import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const BUCKET = 'chat-media'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function getServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

/**
 * POST /api/chat/upload
 * 
 * Accepts multipart form data with:
 *   - file: the file to upload
 *   - conversationId: (optional) for metadata
 *   - sessionKey: (optional) for metadata
 * 
 * Returns { url, path, name, size, mimeType }
 */
export async function POST(request: NextRequest) {
  const sb = getServiceClient()
  if (!sb) {
    return NextResponse.json({ error: 'Server misconfiguration: Supabase environment variables not set. Contact admin.' }, { status: 503 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const conversationId = formData.get('conversationId') as string | null
    const sessionKey = formData.get('sessionKey') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
    }

    // Generate a unique path: YYYY/MM/DD/uuid-filename
    const now = new Date()
    const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`
    const uuid = crypto.randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${datePath}/${uuid}-${safeName}`

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload Error]', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath)
    const publicUrl = urlData?.publicUrl

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 })
    }

    // Track in chat_media table (best-effort)
    try {
      await sb.from('chat_media').insert({
        file_name: file.name,
        original_path: null,
        storage_path: storagePath,
        storage_url: publicUrl,
        session_key: sessionKey || null,
        sender_id: null,
        channel: 'webchat',
        mime_type: file.type || null,
        file_size: file.size,
        metadata: { conversationId: conversationId || null },
      })
    } catch (insertErr) {
      // Non-fatal — log but don't fail the upload
      console.warn('[chat_media insert failed]', insertErr)
    }

    return NextResponse.json({
      url: publicUrl,
      path: storagePath,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    })
  } catch (err) {
    console.error('[Upload Route Error]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
