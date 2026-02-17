import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.OPENCLAW_GATEWAY_URL
  const token = process.env.OPENCLAW_GATEWAY_TOKEN

  if (!url) {
    return NextResponse.json({ ok: false, error: 'OPENCLAW_GATEWAY_URL not set' }, { status: 500 })
  }
  if (!token) {
    return NextResponse.json({ ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not set' }, { status: 500 })
  }

  try {
    const res = await fetch(`${url}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, error: text || res.statusText },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true, status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Unknown error' },
      { status: 502 }
    )
  }
}
