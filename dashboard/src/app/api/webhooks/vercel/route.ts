import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET!

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !webhookSecret) return false
  const hash = crypto.createHmac('sha1', webhookSecret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash))
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-vercel-signature')

    if (!verifySignature(rawBody, signature)) {
      console.warn('[vercel-webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const { type } = payload

    if (type !== 'deployment.ready') {
      return NextResponse.json({ message: `Ignored event: ${type}` }, { status: 200 })
    }

    const branch = payload.payload?.deployment?.meta?.githubCommitRef
      ?? payload.payload?.deployment?.meta?.gitlabCommitRef
      ?? null

    if (!branch) {
      console.warn('[vercel-webhook] No branch found in payload')
      return NextResponse.json({ error: 'No branch in payload' }, { status: 200 })
    }

    const deploymentUrl = payload.payload?.deployment?.url ?? null
    const deploymentId = payload.payload?.deployment?.id ?? null

    console.log(`[vercel-webhook] deployment.ready on branch: ${branch}`)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const updateData: Record<string, string> = {}
    if (deploymentUrl) updateData.vercel_deployment_url = `https://${deploymentUrl}`
    if (deploymentId) updateData.vercel_deployment_id = deploymentId

    // Update status from in_progress → review
    const { data, error } = await supabase
      .from('features')
      .update({ status: 'review', ...updateData })
      .eq('branch_name', branch)
      .eq('status', 'in_progress')
      .select('id, title, branch_name')

    if (error) {
      console.error('[vercel-webhook] Supabase error:', error.message)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Also update deployment info for non-in_progress features on this branch
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('features')
        .update(updateData)
        .eq('branch_name', branch)
        .neq('status', 'in_progress')
    }

    console.log(`[vercel-webhook] Updated ${data?.length ?? 0} features to review`)
    return NextResponse.json({ updated: data?.length ?? 0, features: data }, { status: 200 })
  } catch (err) {
    console.error('[vercel-webhook] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
