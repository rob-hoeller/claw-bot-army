import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/send
 * 
 * Forwards messages to OpenClaw Gateway's Chat Completions API.
 * Supports streaming responses via SSE.
 * Supports multimodal messages (text + images).
 * 
 * Request body:
 * {
 *   message: string,
 *   agentId: string,
 *   sessionKey?: string,
 *   history?: Array<{ role: 'user' | 'assistant', content: string }>,
 *   attachments?: Array<{ type: string, url: string, name?: string, mimeType?: string }>,
 *   stream?: boolean
 * }
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

interface AttachmentInput {
  type: string
  url: string
  name?: string
  mimeType?: string
}

/**
 * Build multimodal content array from text + attachments.
 * If no image attachments, returns plain string for efficiency.
 */
function buildUserContent(
  text: string,
  attachments: AttachmentInput[] = []
): string | ContentPart[] {
  const imageAttachments = attachments.filter(
    a => a.type === 'image' || a.mimeType?.startsWith('image/')
  )

  // No images — keep it simple (plain string)
  if (imageAttachments.length === 0) {
    return text
  }

  // Build multimodal content array
  const parts: ContentPart[] = []

  // Add image parts first so the model "sees" them in context
  for (const img of imageAttachments) {
    if (img.url.startsWith('data:')) {
      // Base64 data URL — send inline
      parts.push({
        type: 'image_url',
        image_url: { url: img.url },
      })
    } else {
      // Regular URL (Supabase Storage etc.)
      parts.push({
        type: 'image_url',
        image_url: { url: img.url },
      })
    }
  }

  // Add text part (even if empty, to signal user intent)
  if (text) {
    parts.push({ type: 'text', text })
  }

  return parts
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

    // Build messages array with history + new message
    const messages: ChatMessage[] = [
      // Include prior conversation history (last N messages)
      ...history.slice(-20).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      // Add the new user message (with image attachments if any)
      {
        role: 'user' as const,
        content: buildUserContent(message || '', attachments),
      },
    ]

    // Build request to OpenClaw Gateway
    const gatewayResponse = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
        ...(sessionKey && { 'x-openclaw-session-key': sessionKey }),
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        messages,
        stream,
      }),
    })

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text()
      console.error('[Gateway Error]', gatewayResponse.status, errorText)
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      )
    }

    // Handle streaming response
    if (stream && gatewayResponse.body) {
      const readable = gatewayResponse.body

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Handle non-streaming response
    const data = await gatewayResponse.json()
    const content = data.choices?.[0]?.message?.content || ''

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
