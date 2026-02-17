import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET!

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !webhookSecret) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const event = request.headers.get('x-github-event')

    if (!verifySignature(rawBody, signature)) {
      console.warn('[github-webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (event !== 'pull_request') {
      return NextResponse.json({ message: `Ignored event: ${event}` }, { status: 200 })
    }

    const payload = JSON.parse(rawBody)
    const { action, pull_request: pr } = payload

    if (!pr) {
      return NextResponse.json({ error: 'No pull_request in payload' }, { status: 400 })
    }

    const branch = pr.head?.ref ?? null
    const prNumber = pr.number
    const prUrl = pr.html_url

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (action === 'opened' || action === 'reopened') {
      console.log(`[github-webhook] PR ${action} #${prNumber} on branch: ${branch}`)

      if (!branch) {
        return NextResponse.json({ error: 'No branch in PR' }, { status: 200 })
      }

      const { data, error } = await supabase
        .from('features')
        .update({ pr_url: prUrl, pr_number: prNumber, pr_status: 'open' })
        .eq('branch_name', branch)
        .select('id, title, branch_name')

      if (error) {
        console.error('[github-webhook] Supabase error:', error.message)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      console.log(`[github-webhook] Updated ${data?.length ?? 0} features with PR info`)
      return NextResponse.json({ action, updated: data?.length ?? 0, features: data }, { status: 200 })
    }

    if (action === 'closed' && pr.merged === true) {
      console.log(`[github-webhook] PR merged #${prNumber} on branch: ${branch}`)

      // Try matching by pr_number first, then branch_name
      const { data, error } = await supabase
        .from('features')
        .update({
          status: 'done',
          pr_status: 'merged',
          completed_at: new Date().toISOString(),
        })
        .or(`pr_number.eq.${prNumber}${branch ? `,branch_name.eq.${branch}` : ''}`)
        .select('id, title, branch_name')

      if (error) {
        console.error('[github-webhook] Supabase error:', error.message)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      console.log(`[github-webhook] Marked ${data?.length ?? 0} features as done`)
      return NextResponse.json({ action: 'merged', updated: data?.length ?? 0, features: data }, { status: 200 })
    }

    return NextResponse.json({ message: `Ignored PR action: ${action}` }, { status: 200 })
  } catch (err) {
    console.error('[github-webhook] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
