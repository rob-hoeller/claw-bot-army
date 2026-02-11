import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/send
 * 
 * Forwards messages to OpenClaw Gateway's Chat Completions API.
 * Supports streaming responses via SSE.
 * 
 * Request body:
 * {
 *   message: string,
 *   agentId: string,
 *   sessionKey?: string,
 *   stream?: boolean
 * }
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, agentId, sessionKey, stream = true } = body

    if (!message || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, agentId' },
        { status: 400 }
      )
    }

    if (!GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway token not configured' },
        { status: 500 }
      )
    }

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
        messages: [{ role: 'user', content: message }],
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
