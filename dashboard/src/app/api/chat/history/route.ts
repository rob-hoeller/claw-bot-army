import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/chat/history
 * 
 * Fetches conversation history from OpenClaw Gateway.
 * 
 * Query params:
 * - sessionKey: string (required)
 * - limit?: number - max messages to return (default 50)
 * - includeTools?: boolean - include tool calls (default false)
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionKey = searchParams.get('sessionKey')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeTools = searchParams.get('includeTools') === 'true'

    if (!sessionKey) {
      return NextResponse.json(
        { error: 'Missing required param: sessionKey' },
        { status: 400 }
      )
    }

    if (!GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway token not configured' },
        { status: 500 }
      )
    }

    // Call sessions_history via tools/invoke
    const gatewayResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_history',
        args: {
          sessionKey,
          limit,
          includeTools,
        },
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

    const data = await gatewayResponse.json()
    
    if (!data.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch history' },
        { status: 400 }
      )
    }

    // Transform messages to a simpler format for the UI
    const messages = (data.result?.messages || []).map((msg: {
      role: string
      content: string | Array<{ type: string; text?: string }>
      timestamp?: number
    }, index: number) => ({
      id: `oc-${index}`,
      role: msg.role,
      content: typeof msg.content === 'string' 
        ? msg.content 
        : msg.content?.find((c: { type: string }) => c.type === 'text')?.text || '',
      created_at: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
    }))

    return NextResponse.json({
      sessionKey,
      messages,
      truncated: data.result?.truncated || false,
    })

  } catch (error) {
    console.error('[History Fetch Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
