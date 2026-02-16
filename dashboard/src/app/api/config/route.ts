import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const CONFIG_PATH = join(process.env.HOME || '/home/ubuntu', '.openclaw', 'openclaw.json')

const SENSITIVE_KEYS = ['token', 'key', 'secret', 'password', 'apikey', 'api_key']

function redactValue(key: string, value: unknown): unknown {
  if (typeof value === 'string' && value === '__OPENCLAW_REDACTED__') {
    return '••••••••'
  }
  if (typeof value === 'string' && SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
    return '••••••••'
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => redactValue(String(i), v))
  }
  if (value && typeof value === 'object') {
    return redactObject(value as Record<string, unknown>)
  }
  return value
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = redactValue(key, value)
  }
  return result
}

export async function GET() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(raw)
    const redacted = redactObject(config) as Record<string, unknown>

    return NextResponse.json({
      config: redacted,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to read configuration', detail: String(err) },
      { status: 500 }
    )
  }
}
