import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/send
 *
 * Forwards messages to the OpenClaw Gateway.
 * - Text-only messages → /v1/chat/completions (standard chat format)
 * - Messages with images → /v1/responses (supports input_image parts)
 *
 * The Gateway's /v1/chat/completions endpoint strips image_url content parts
 * via extractTextContent, so images MUST go through /v1/responses which
 * supports the input_image format with base64 or URL sources.
 *
 * Streaming formats differ:
 * - /v1/chat/completions: choices[0].delta.content
 * - /v1/responses: event type "response.output_text.delta" with delta field
 * ChatPanel's parseSSEStream handles both.
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

// Max base64 payload we'll send inline (10MB decoded ≈ 13.3MB base64)
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

interface AttachmentInput {
  type: string
  url: string
  name?: string
  mimeType?: string
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Check if any attachment is an image.
 */
function hasImageAttachments(attachments: AttachmentInput[]): boolean {
  return attachments.some(
    a => a.type === 'image' || a.mimeType?.startsWith('image/')
  )
}

/**
 * Convert a data URL to { mediaType, base64Data }.
 * Returns null if the URL is not a valid data URL.
 */
function parseDataUrl(url: string): { mediaType: string; base64Data: string } | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mediaType: match[1], base64Data: match[2] }
}

/**
 * Fetch a URL and return base64-encoded content + media type.
 * Used for Supabase Storage URLs so we can send inline to the Gateway.
 */
async function urlToBase64(url: string, fallbackMimeType?: string): Promise<{ mediaType: string; base64Data: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const buffer = await res.arrayBuffer()
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`)
  }
  const base64Data = Buffer.from(buffer).toString('base64')
  const mediaType = res.headers.get('content-type') || fallbackMimeType || 'image/png'
  return { mediaType, base64Data }
}

/**
 * Build the /v1/responses request body for messages with images.
 * Uses the OpenAI Responses API format with input_image parts.
 */
async function buildResponsesBody(
  message: string,
  attachments: AttachmentInput[],
  agentId: string,
  history: HistoryMessage[]
) {
  // Build input array: history + user message with images
  // Each item must have type: "message" per the OpenResponses schema
  const input: Array<Record<string, unknown>> = []

  // Add conversation history
  for (const msg of history.slice(-20)) {
    input.push({
      type: 'message',
      role: msg.role,
      content: msg.content,
    })
  }

  // Build the user message content parts
  const contentParts: Array<Record<string, unknown>> = []

  // Add image parts
  const imageAttachments = attachments.filter(
    a => a.type === 'image' || a.mimeType?.startsWith('image/')
  )

  for (const img of imageAttachments) {
    try {
      let mediaType: string
      let base64Data: string

      const parsed = parseDataUrl(img.url)
      if (parsed) {
        // Already base64
        mediaType = parsed.mediaType
        base64Data = parsed.base64Data
      } else {
        // Fetch from URL (Supabase Storage)
        const fetched = await urlToBase64(img.url, img.mimeType)
        mediaType = fetched.mediaType
        base64Data = fetched.base64Data
      }

      contentParts.push({
        type: 'input_image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      })
    } catch (err) {
      console.error(`[Chat Send] Failed to process image attachment:`, err)
      // Skip this image but continue with the rest
    }
  }

  // Add text part
  if (message) {
    contentParts.push({
      type: 'input_text',
      text: message,
    })
  }

  input.push({
    type: 'message',
    role: 'user',
    content: contentParts,
  })

  return {
    model: `openclaw:${agentId}`,
    input,
    stream: true,
  }
}

/**
 * Build the /v1/chat/completions request body for text-only messages.
 */
function buildChatCompletionsBody(
  message: string,
  agentId: string,
  history: HistoryMessage[]
) {
  const messages = [
    ...history.slice(-20).map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: message,
    },
  ]

  return {
    model: `openclaw:${agentId}`,
    messages,
    stream: true,
  }
}

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
      return NextResponse.json(
        { error: 'Missing required fields: message or attachments' },
        { status: 400 }
      )
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required field: agentId' },
        { status: 400 }
      )
    }

    if (!GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway token not configured' },
        { status: 500 }
      )
    }

    // Determine endpoint based on whether we have images
    const useResponsesEndpoint = hasImageAttachments(attachments)
    const endpoint = useResponsesEndpoint
      ? `${GATEWAY_URL}/v1/responses`
      : `${GATEWAY_URL}/v1/chat/completions`

    // Build the appropriate request body
    const requestBody = useResponsesEndpoint
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
      const errorText = await gatewayResponse.text()
      console.error(`[Chat Send] Gateway ${useResponsesEndpoint ? 'responses' : 'completions'} error:`, gatewayResponse.status, errorText)
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      )
    }

    // Stream the response back to the client
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
    const content = useResponsesEndpoint
      ? data.output?.[0]?.content?.[0]?.text || ''
      : data.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      content,
      agentId,
      sessionKey: sessionKey || 'default',
    })
  } catch (error) {
    console.error('[Chat Send Error]', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
