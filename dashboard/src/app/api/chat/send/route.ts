import { NextRequest, NextResponse } from 'next/server'

// Allow large request bodies for file attachments (base64 encoded)
export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
}

// Increase Vercel function timeout for streaming responses
export const maxDuration = 60

/**
 * POST /api/chat/send
 *
 * Forwards messages to the OpenClaw Gateway.
 * - Text-only messages → /v1/chat/completions
 * - Messages with attachments (images/files) → /v1/responses
 *
 * Why two endpoints:
 *   /v1/chat/completions strips image_url parts (extractTextContent).
 *   /v1/responses supports input_image (base64/URL) and input_file (base64/URL).
 *
 * Streaming formats differ and ChatPanel's parseSSEStream handles both:
 *   completions: choices[0].delta.content
 *   responses:   event "response.output_text.delta" → delta field
 */

import { createClient } from '@supabase/supabase-js'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB per attachment

// ─── Build agent system prompt from Supabase config files ────────
async function buildAgentSystemPrompt(agentId: string): Promise<string | null> {
  const sb = getSupabase()

  const { data: agent, error } = await sb
    .from('agents')
    .select('id, name, role, soul_md, identity_md, tools_md, user_md, memory_md, agents_md')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    console.error(`[Chat Send] Failed to fetch agent config for ${agentId}:`, error)
    return null
  }

  const parts: string[] = []

  if (agent.soul_md) {
    parts.push(agent.soul_md)
  }
  if (agent.identity_md) {
    parts.push(`\n---\n# Identity Reference\n${agent.identity_md}`)
  }
  if (agent.tools_md) {
    parts.push(`\n---\n# Tools & Capabilities\n${agent.tools_md}`)
  }
  if (agent.user_md) {
    parts.push(`\n---\n# User Context\n${agent.user_md}`)
  }
  if (agent.agents_md) {
    parts.push(`\n---\n# Agent Network\n${agent.agents_md}`)
  }
  if (agent.memory_md) {
    const memoryTruncated = agent.memory_md.length > 2000
      ? agent.memory_md.slice(0, 2000) + '\n\n[Memory truncated...]'
      : agent.memory_md
    parts.push(`\n---\n# Memory\n${memoryTruncated}`)
  }

  if (parts.length === 0) {
    return `You are ${agent.name} (${agentId}), role: ${agent.role || 'AI Agent'}. Respond helpfully and stay in character.`
  }

  return parts.join('\n')
}

/** Fix MIME types when browser sends application/octet-stream */
const MIME_OVERRIDES: Record<string, string> = {
  '.md': 'text/markdown', '.markdown': 'text/markdown',
  '.txt': 'text/plain', '.csv': 'text/csv', '.log': 'text/plain',
  '.json': 'application/json', '.xml': 'application/xml',
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
  '.js': 'text/javascript', '.ts': 'text/typescript',
  '.tsx': 'text/typescript', '.jsx': 'text/javascript',
  '.py': 'text/x-python', '.rb': 'text/x-ruby', '.go': 'text/x-go',
  '.rs': 'text/x-rust', '.java': 'text/x-java',
  '.c': 'text/x-c', '.cpp': 'text/x-c++', '.h': 'text/x-c',
  '.sh': 'text/x-shellscript', '.bash': 'text/x-shellscript',
  '.yml': 'text/yaml', '.yaml': 'text/yaml', '.toml': 'text/toml',
  '.ini': 'text/plain', '.env': 'text/plain', '.sql': 'text/x-sql',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function resolveMimeType(raw: string, filename?: string): string {
  if (raw && raw !== 'application/octet-stream') return raw
  if (!filename) return raw || 'application/octet-stream'
  const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '')
  return MIME_OVERRIDES[ext] || raw || 'application/octet-stream'
}

interface AttachmentInput {
  type: string  // 'image' | 'video' | 'file'
  url: string
  name?: string
  mimeType?: string
  /** Raw base64 data sent from client — avoids re-fetching from URL */
  base64Data?: string
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasAttachments(attachments: AttachmentInput[]): boolean {
  return attachments.length > 0
}

function isImageAttachment(a: AttachmentInput): boolean {
  return a.type === 'image' || (a.mimeType?.startsWith('image/') ?? false)
}

/** Parse a data:…;base64,… URL into components. */
function parseDataUrl(url: string): { mediaType: string; base64Data: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/)
  return m ? { mediaType: m[1], base64Data: m[2] } : null
}

/** Fetch a remote URL and return base64 + media type. */
async function fetchAsBase64(
  url: string,
  fallbackMime?: string
): Promise<{ mediaType: string; base64Data: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  if (buf.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment too large: ${(buf.byteLength / 1024 / 1024).toFixed(1)}MB`)
  }
  return {
    mediaType: res.headers.get('content-type') || fallbackMime || 'application/octet-stream',
    base64Data: Buffer.from(buf).toString('base64'),
  }
}

/** Resolve an attachment to { mediaType, base64Data }. */
async function resolveAttachment(a: AttachmentInput) {
  // Prefer inline base64 from client (avoids re-fetching from Supabase)
  if (a.base64Data) {
    const mediaType = resolveMimeType(a.mimeType || 'application/octet-stream', a.name)
    return { mediaType, base64Data: a.base64Data }
  }
  // Fallback: parse data URL
  const parsed = parseDataUrl(a.url)
  if (parsed) return parsed
  // Last resort: fetch from URL
  return fetchAsBase64(a.url, a.mimeType)
}

// ---------------------------------------------------------------------------
// Request body builders
// ---------------------------------------------------------------------------

async function buildResponsesBody(
  message: string,
  attachments: AttachmentInput[],
  agentId: string,
  history: HistoryMessage[],
  systemPrompt?: string | null
) {
  const input: Array<Record<string, unknown>> = []

  // System prompt with agent persona
  if (systemPrompt) {
    input.push({ type: 'message', role: 'system', content: systemPrompt })
  }

  // Conversation history
  for (const msg of history.slice(-20)) {
    input.push({ type: 'message', role: msg.role, content: msg.content })
  }

  // User message with attachment parts
  const contentParts: Array<Record<string, unknown>> = []

  for (const att of attachments) {
    try {
      const { mediaType: rawMime, base64Data } = await resolveAttachment(att)
      const mediaType = resolveMimeType(rawMime, att.name)

      if (isImageAttachment(att) || mediaType.startsWith('image/')) {
        contentParts.push({
          type: 'input_image',
          source: { type: 'base64', media_type: mediaType, data: base64Data },
        })
      } else {
        // Non-image file (PDF, doc, txt, etc.)
        contentParts.push({
          type: 'input_file',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
            ...(att.name && { filename: att.name }),
          },
        })
      }
    } catch (err) {
      console.error('[Chat Send] Failed to process attachment:', att.name, err)
      // Don't silently drop — tell the model about the failed attachment
      contentParts.push({
        type: 'input_text',
        text: `[Failed to load attachment: ${att.name || 'unknown file'}]`,
      })
    }
  }

  // Always include a text part — some models need it; default prompt for file-only sends
  const textContent = message || (attachments.length > 0
    ? `Please analyze the attached file${attachments.length > 1 ? 's' : ''}.`
    : '')
  if (textContent) {
    contentParts.push({ type: 'input_text', text: textContent })
  }

  input.push({ type: 'message', role: 'user', content: contentParts })

  return { model: `openclaw:${agentId}`, input, stream: true }
}

function buildChatCompletionsBody(
  message: string,
  agentId: string,
  history: HistoryMessage[],
  systemPrompt?: string | null
) {
  const messages: Array<{ role: string; content: string }> = []

  // Inject agent persona as system message
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  // Conversation history
  messages.push(...history.slice(-20).map(m => ({ role: m.role, content: m.content })))

  // Current user message
  messages.push({ role: 'user', content: message })

  return { model: `openclaw:${agentId}`, messages, stream: true }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      agentId,
      sessionKey,
      history = [],
      attachments = [],
      stream = true,
    } = body

    if (!message && attachments.length === 0) {
      return NextResponse.json({ error: 'Missing message or attachments' }, { status: 400 })
    }
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }
    if (!GATEWAY_TOKEN) {
      return NextResponse.json({ error: 'Gateway token not configured' }, { status: 500 })
    }

    // Fetch agent persona from Supabase
    const systemPrompt = await buildAgentSystemPrompt(agentId)

    const useResponses = hasAttachments(attachments)
    const endpoint = useResponses
      ? `${GATEWAY_URL}/v1/responses`
      : `${GATEWAY_URL}/v1/chat/completions`

    const requestBody = useResponses
      ? await buildResponsesBody(message || '', attachments, agentId, history, systemPrompt)
      : buildChatCompletionsBody(message || '', agentId, history, systemPrompt)

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': agentId,
    }
    if (sessionKey) {
      headers['x-openclaw-session-key'] = sessionKey
    }

    const gatewayResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!gatewayResponse.ok) {
      const errText = await gatewayResponse.text()
      console.error(`[Chat Send] ${useResponses ? '/v1/responses' : '/v1/chat/completions'} error:`, gatewayResponse.status, errText)
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      )
    }

    if (stream && gatewayResponse.body) {
      return new Response(gatewayResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming fallback
    const data = await gatewayResponse.json()
    const content = useResponses
      ? data.output?.[0]?.content?.[0]?.text || ''
      : data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ content, agentId, sessionKey: sessionKey || 'default' })
  } catch (error) {
    console.error('[Chat Send Error]', error)
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}
