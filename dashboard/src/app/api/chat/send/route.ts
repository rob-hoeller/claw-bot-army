import { NextRequest, NextResponse } from 'next/server'

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

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB per attachment

interface AttachmentInput {
  type: string  // 'image' | 'video' | 'file'
  url: string
  name?: string
  mimeType?: string
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

/** Resolve an attachment URL to { mediaType, base64Data }. */
async function resolveAttachment(a: AttachmentInput) {
  const parsed = parseDataUrl(a.url)
  if (parsed) return parsed
  return fetchAsBase64(a.url, a.mimeType)
}

// ---------------------------------------------------------------------------
// Request body builders
// ---------------------------------------------------------------------------

async function buildResponsesBody(
  message: string,
  attachments: AttachmentInput[],
  agentId: string,
  history: HistoryMessage[]
) {
  const input: Array<Record<string, unknown>> = []

  // Conversation history
  for (const msg of history.slice(-20)) {
    input.push({ type: 'message', role: msg.role, content: msg.content })
  }

  // User message with attachment parts
  const contentParts: Array<Record<string, unknown>> = []

  for (const att of attachments) {
    try {
      const { mediaType, base64Data } = await resolveAttachment(att)

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
    }
  }

  if (message) {
    contentParts.push({ type: 'input_text', text: message })
  }

  input.push({ type: 'message', role: 'user', content: contentParts })

  return { model: `openclaw:${agentId}`, input, stream: true }
}

function buildChatCompletionsBody(
  message: string,
  agentId: string,
  history: HistoryMessage[]
) {
  const messages = [
    ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]
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

    const useResponses = hasAttachments(attachments)
    const endpoint = useResponses
      ? `${GATEWAY_URL}/v1/responses`
      : `${GATEWAY_URL}/v1/chat/completions`

    const requestBody = useResponses
      ? await buildResponsesBody(message || '', attachments, agentId, history)
      : buildChatCompletionsBody(message || '', agentId, history)

    const gatewayResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
        ...(sessionKey && { 'x-openclaw-session-key': sessionKey }),
      },
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
