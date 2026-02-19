import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/send
 * 
 * Forwards messages to OpenClaw Gateway.
 * - Text-only: uses /v1/chat/completions (OpenAI Chat format)
 * - With images: uses /v1/responses (OpenAI Responses format, supports input_image)
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

interface AttachmentInput {
  type: string
  url: string
  name?: string
  mimeType?: string
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

    console.log('[Chat Send] message:', message?.substring(0, 100))
    console.log('[Chat Send] attachments:', attachments.length)

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

    const imageAttachments = (attachments as AttachmentInput[]).filter(
      (a: AttachmentInput) => a.type === 'image' || a.mimeType?.startsWith('image/')
    )

    // If we have images, use /v1/responses which supports input_image
    if (imageAttachments.length > 0) {
      return handleWithResponses({
        message: message || '',
        agentId,
        sessionKey,
        history,
        imageAttachments,
        stream,
      })
    }

    // Text-only: use /v1/chat/completions
    return handleWithChatCompletions({
      message: message || '',
      agentId,
      sessionKey,
      history,
      stream,
    })

  } catch (error) {
    console.error('[Chat Send Error]', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

/**
 * Send via /v1/responses (supports images via input_image)
 */
async function handleWithResponses(opts: {
  message: string
  agentId: string
  sessionKey?: string
  history: Array<{ role: string; content: string }>
  imageAttachments: AttachmentInput[]
  stream: boolean
}) {
  const { message, agentId, sessionKey, history, imageAttachments, stream } = opts

  // Build input array in OpenAI Responses format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input: any[] = []

  // Add conversation history
  for (const msg of history.slice(-20)) {
    input.push({
      type: 'message',
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })
  }

  // Build the user message with image parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentParts: any[] = []

  // Add images first
  for (const img of imageAttachments) {
    if (img.url.startsWith('data:')) {
      // Base64 data URL — extract mime and data
      const match = img.url.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        contentParts.push({
          type: 'input_image',
          source: {
            type: 'base64',
            media_type: match[1],
            data: match[2],
          },
        })
      }
    } else {
      // Regular URL
      contentParts.push({
        type: 'input_image',
        source: {
          type: 'url',
          url: img.url,
        },
      })
    }
  }

  // Add text
  if (message) {
    contentParts.push({
      type: 'input_text',
      text: message,
    })
  } else {
    contentParts.push({
      type: 'input_text',
      text: 'Describe this image.',
    })
  }

  input.push({
    type: 'message',
    role: 'user',
    content: contentParts,
  })

  console.log('[Chat Send] Using /v1/responses with', imageAttachments.length, 'images')
  console.log('[Chat Send] Content parts:', contentParts.map(p => p.type))

  const gatewayResponse = await fetch(`${GATEWAY_URL}/v1/responses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': agentId,
      ...(sessionKey && { 'x-openclaw-session-key': sessionKey }),
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      input,
      stream,
    }),
  })

  if (!gatewayResponse.ok) {
    const errorText = await gatewayResponse.text()
    console.error('[Gateway Responses Error]', gatewayResponse.status, errorText)
    return NextResponse.json(
      { error: `Gateway error: ${gatewayResponse.status}` },
      { status: gatewayResponse.status }
    )
  }

  // Handle streaming response
  if (stream && gatewayResponse.body) {
    // /v1/responses uses SSE format too
    return new Response(gatewayResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Non-streaming
  const data = await gatewayResponse.json()
  const content = data.output?.[0]?.content?.[0]?.text || 
                  data.choices?.[0]?.message?.content || ''

  return NextResponse.json({
    content,
    agentId,
    sessionKey: sessionKey || 'default',
  })
}

/**
 * Send via /v1/chat/completions (text-only, more efficient)
 */
async function handleWithChatCompletions(opts: {
  message: string
  agentId: string
  sessionKey?: string
  history: Array<{ role: string; content: string }>
  stream: boolean
}) {
  const { message, agentId, sessionKey, history, stream } = opts

  const messages = [
    ...history.slice(-20).map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: message,
    },
  ]

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

  if (stream && gatewayResponse.body) {
    return new Response(gatewayResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const data = await gatewayResponse.json()
  const content = data.choices?.[0]?.message?.content || ''

  return NextResponse.json({
    content,
    agentId,
    sessionKey: sessionKey || 'default',
  })
}
