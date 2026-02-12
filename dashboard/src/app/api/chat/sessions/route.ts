import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/chat/sessions
 * 
 * Lists active sessions via OpenClaw Gateway's tools/invoke API.
 * 
 * Query params:
 * - agentId?: string - filter by agent
 * - limit?: number - max sessions to return
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway token not configured' },
        { status: 500 }
      )
    }

    // Call sessions_list via tools/invoke
    const gatewayResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: {
          limit,
          messageLimit: 1, // Include last message for preview
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
        { error: data.error?.message || 'Failed to list sessions' },
        { status: 400 }
      )
    }

    // Filter by agentId if provided
    let sessions = data.result || []
    if (agentId) {
      sessions = sessions.filter((s: { agentId?: string }) => s.agentId === agentId)
    }

    return NextResponse.json({ sessions })

  } catch (error) {
    console.error('[Sessions List Error]', error)
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/sessions
 * 
 * Send a message to a specific session via sessions_send.
 * 
 * Request body:
 * {
 *   sessionKey: string,
 *   message: string,
 *   agentId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionKey, message, agentId } = body

    if (!sessionKey || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionKey, message' },
        { status: 400 }
      )
    }

    if (!GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway token not configured' },
        { status: 500 }
      )
    }

    // Call sessions_send via tools/invoke
    const gatewayResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey,
          message,
          ...(agentId && { agentId }),
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
        { error: data.error?.message || 'Failed to send message' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      result: data.result,
    })

  } catch (error) {
    console.error('[Sessions Send Error]', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
