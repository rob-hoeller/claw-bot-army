export interface ParserResult {
  text: string
  pageCount?: number
  metadata: Record<string, unknown>
  warnings: string[]
}

export interface IParser {
  mimeTypes: string[]
  parse(buffer: Buffer, options?: { password?: string }): Promise<ParserResult>
}

export type ProcessingStatus = 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review'

export interface FileRecord {
  id: string
  filename: string
  file_type: string
  file_size: number
  storage_bucket: string
  storage_path: string
  extracted_text: string | null
  metadata: Record<string, unknown>
  status: ProcessingStatus
  error_message: string | null
  uploaded_by: string | null
  access_level: string
  conversation_id: string | null
  created_at: string
  updated_at: string
}
