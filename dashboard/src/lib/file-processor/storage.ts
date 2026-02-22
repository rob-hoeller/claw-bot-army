import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function downloadFromStorage(bucket: string, path: string): Promise<Buffer> {
  const sb = getServiceClient()
  if (!sb) throw new Error('Supabase not configured')

  const { data, error } = await sb.storage.from(bucket).download(path)
  if (error || !data) throw new Error(`Storage download failed: ${error?.message || 'no data'}`)

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function insertFileRecord(record: {
  filename: string
  file_type: string
  file_size: number
  storage_bucket: string
  storage_path: string
  status: string
  uploaded_by?: string | null
  conversation_id?: string | null
}) {
  const sb = getServiceClient()
  if (!sb) throw new Error('Supabase not configured')

  const { data, error } = await sb
    .from('file_attachments')
    .insert(record)
    .select()
    .single()

  if (error) throw new Error(`DB insert failed: ${error.message}`)
  return data
}

export async function updateFileRecord(id: string, updates: Record<string, unknown>) {
  const sb = getServiceClient()
  if (!sb) throw new Error('Supabase not configured')

  const { data, error } = await sb
    .from('file_attachments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`DB update failed: ${error.message}`)
  return data
}
