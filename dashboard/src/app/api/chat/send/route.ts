import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/send
 *
 * Routes agent chat messages:
 * - HBx (main) → OpenClaw Gateway (full tool/memory support)
 * - Sub-agents → Anthropic API directly (correct persona, no gateway override)
 *
 * Streaming formats are normalized to OpenAI SSE format for ChatPanel compatibility.
 */

import {
  buildAgentSystemPrompt,
  isDirectLLMAgent,
  streamDirectLLM,
  callGateway,
} from '@/lib/llm-direct'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB per attachment

// ─── MIME / attachment helpers (unchanged) ────────────────────────

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
  type: string
  url: string
  name?: string
  mimeType?: string
<<<<<<< Updated upstream
=======
  base64Data?: string
>>>>>>> Stashed changes
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

function hasAttachments(attachments: AttachmentInput[]): boolean {
  return attachments.length > 0
}

function isImageAttachment(a: AttachmentInput): boolean {
  return a.type === 'image' || (a.mimeType?.startsWith('image/') ?? false)
}

<<<<<<< Updated upstream
/** Parse a data:…;base64,… URL into components. */
=======
const TEXT_DECODABLE_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css',
  'text/javascript', 'text/typescript', 'text/yaml', 'text/toml',
  'text/x-python', 'text/x-ruby', 'text/x-go', 'text/x-rust', 'text/x-java',
  'text/x-c', 'text/x-c++', 'text/x-shellscript', 'text/x-sql',
  'application/json', 'application/xml', 'application/javascript',
])

function isTextDecodable(mime: string): boolean {
  return TEXT_DECODABLE_MIMES.has(mime) || mime.startsWith('text/')
}

function decodeBase64ToText(b64: string, maxChars = 50000): string {
  const buf = Buffer.from(b64, 'base64')
  let text = buf.toString('utf-8')
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + '\n\n[... content truncated at ' + maxChars + ' characters ...]'
  }
  return text
}

>>>>>>> Stashed changes
function parseDataUrl(url: string): { mediaType: string; base64Data: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/)
  return m ? { mediaType: m[1], base64Data: m[2] } : null
}

async function fetchAsBase64(url: string, fallbackMime?: string): Promise<{ mediaType: string; base64Data: string }> {
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

<<<<<<< Updated upstream
/** Resolve an attachment URL to { mediaType, base64Data }. */
async function resolveAttachment(a: AttachmentInput) {
=======
async function resolveAttachment(a: AttachmentInput) {
  if (a.base64Data) {
    const mediaType = resolveMimeType(a.mimeType || 'application/octet-stream', a.name)
    return { mediaType, base64Data: a.base64Data }
  }
>>>>>>> Stashed changes
  const parsed = parseDataUrl(a.url)
  if (parsed) return parsed
  return fetchAsBase64(a.url, a.mimeType)
}

// ─── Flatten attachments into text for direct LLM calls ──────────
async function flattenAttachmentsToText(
  message: string,
  attachments: AttachmentInput[]
): Promise<string> {
  if (attachments.length === 0) return message

  const parts: string[] = []
  if (message) parts.push(message)

  for (const att of attachments) {
    try {
      const { mediaType: rawMime, base64Data } = await resolveAttachment(att)
      const mediaType = resolveMimeType(rawMime, att.name)

      if (isImageAttachment(att) || mediaType.startsWith('image/')) {
        parts.push(`[Image attached: ${att.name || 'image'} (${mediaType}) — image analysis not available in direct mode]`)
      } else if (isTextDecodable(mediaType)) {
        const textContent = decodeBase64ToText(base64Data)
        parts.push(`--- File: ${att.name || 'unknown'} (${mediaType}) ---\n${textContent}\n--- End of file ---`)
      } else if (mediaType === 'application/pdf') {
        parts.push(`[Attached PDF: ${att.name || 'document.pdf'} — PDF content extraction not yet supported.]`)
      } else {
        parts.push(`[Attached file: ${att.name || 'unknown'} (${mediaType}, ${Math.round(base64Data.length * 0.75 / 1024)}KB) — binary file.]`)
      }
    } catch (err) {
      parts.push(`[Failed to load attachment: ${att.name || 'unknown file'}]`)
    }
  }

  return parts.join('\n\n')
}

// ─── Gateway request body builders (for HBx only) ────────────────

async function buildResponsesBody(
  message: string,
  attachments: AttachmentInput[],
  agentId: string,
  history: HistoryMessage[],
  systemPrompt?: string | null
) {
  const input: Array<Record<string, unknown>> = []

  if (systemPrompt) {
    input.push({ type: 'message', role: 'system', content: systemPrompt })
  }

  for (const msg of history.slice(-20)) {
    input.push({ type: 'message', role: msg.role, content: msg.content })
  }

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
<<<<<<< Updated upstream
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
    }
  }

  if (message) {
    contentParts.push({ type: 'input_text', text: message })
=======
      } else if (isTextDecodable(mediaType)) {
        const textContent = decodeBase64ToText(base64Data)
        contentParts.push({
          type: 'input_text',
          text: `--- File: ${att.name || 'unknown'} (${mediaType}) ---\n${textContent}\n--- End of file ---`,
        })
      } else if (mediaType === 'application/pdf') {
        contentParts.push({
          type: 'input_text',
          text: `[Attached PDF: ${att.name || 'document.pdf'} — PDF content extraction not yet supported.]`,
        })
      } else {
        contentParts.push({
          type: 'input_text',
          text: `[Attached file: ${att.name || 'unknown'} (${mediaType}, ${Math.round(base64Data.length * 0.75 / 1024)}KB) — binary file.]`,
        })
      }
    } catch (err) {
      console.error('[Chat Send] Failed to process attachment:', (att as AttachmentInput).name, err)
      contentParts.push({
        type: 'input_text',
        text: `[Failed to load attachment: ${att.name || 'unknown file'}]`,
      })
    }
  }

  const textContent = message || (attachments.length > 0
    ? `Please analyze the attached file${attachments.length > 1 ? 's' : ''}.`
    : '')
  if (textContent) {
    contentParts.push({ type: 'input_text', text: textContent })
>>>>>>> Stashed changes
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

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  messages.push(...history.slice(-20).map(m => ({ role: m.role, content: m.content })))
  messages.push({ role: 'user', content: message })

  return { model: `openclaw:${agentId}`, messages, stream: true }
}

// ─── Route handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      agentId,
      sessionKey,
      history = [],
      attachments = [],
    } = body

    if (!message && attachments.length === 0) {
      return NextResponse.json({ error: 'Missing message or attachments' }, { status: 400 })
    }
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    // ── Sub-agents: call Anthropic directly (correct persona) ────
    if (isDirectLLMAgent(agentId)) {
      const systemPrompt = await buildAgentSystemPrompt(agentId)
      if (!systemPrompt) {
        return NextResponse.json(
          { error: `No persona config found for agent ${agentId}` },
          { status: 404 }
        )
      }

      // Flatten attachments into the message text for direct LLM
      const fullMessage = await flattenAttachmentsToText(message || '', attachments)

      // Build messages array with history
      const llmMessages = [
        ...history.slice(-20).map((m: HistoryMessage) => ({ role: m.role, content: m.content })),
        { role: 'user', content: fullMessage },
      ]

      const streamResponse = await streamDirectLLM({
        systemPrompt,
        messages: llmMessages,
      })

      return streamResponse
    }

    // ── HBx: route through gateway (full tool/memory support) ────
    if (!GATEWAY_TOKEN) {
      return NextResponse.json({ error: 'Gateway token not configured' }, { status: 500 })
    }

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
      console.error(`[Chat Send] Gateway error:`, gatewayResponse.status, errText)
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      )
    }

    if (gatewayResponse.body) {
      return new Response(gatewayResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

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
