import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface CronJob {
  id: string
  name: string
  schedule: string
  scheduleKind: 'every' | 'cron' | 'system'
  everyMs?: number
  cronExpr?: string
  timezone?: string
  status: 'ok' | 'error' | 'unknown'
  lastRunAt?: string
  nextRunAt?: string
  lastDurationMs?: number
  consecutiveErrors?: number
  category: 'monitoring' | 'sync' | 'pipeline' | 'report'
  source: 'openclaw' | 'system'
  enabled?: boolean
}

const SYSTEM_CRON_ENTRIES: CronJob[] = [
  {
    id: 'sys-generate-dashboard',
    name: 'generate-dashboard.sh',
    schedule: '*/15 * * * *',
    scheduleKind: 'system',
    cronExpr: '*/15 * * * *',
    status: 'ok',
    category: 'report',
    source: 'system',
    enabled: true,
  },
  {
    id: 'sys-collect-metrics',
    name: 'collect-metrics-db.sh',
    schedule: '*/15 * * * *',
    scheduleKind: 'system',
    cronExpr: '*/15 * * * *',
    status: 'ok',
    category: 'monitoring',
    source: 'system',
    enabled: true,
  },
  {
    id: 'sys-collect-usage',
    name: 'collect-usage-db.sh',
    schedule: '*/15 * * * *',
    scheduleKind: 'system',
    cronExpr: '*/15 * * * *',
    status: 'ok',
    category: 'monitoring',
    source: 'system',
    enabled: true,
  },
  {
    id: 'sys-sync-agents',
    name: 'sync-all-agents.sh',
    schedule: '0 */8 * * *',
    scheduleKind: 'system',
    cronExpr: '0 */8 * * *',
    status: 'ok',
    category: 'sync',
    source: 'system',
    enabled: true,
  },
]

const FALLBACK_OPENCLAW_JOBS: CronJob[] = [
  {
    id: 'pipeline-watcher',
    name: 'pipeline-watcher',
    schedule: 'every 5m',
    scheduleKind: 'every',
    everyMs: 300000,
    status: 'ok',
    category: 'pipeline',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'poll-merged-prs',
    name: 'poll-merged-prs',
    schedule: 'every 15m',
    scheduleKind: 'every',
    everyMs: 900000,
    status: 'ok',
    category: 'monitoring',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'hbx-memory-sync',
    name: 'HBx Memory Sync',
    schedule: 'every 30m',
    scheduleKind: 'every',
    everyMs: 1800000,
    status: 'ok',
    category: 'sync',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'hbx-config-sync-evening',
    name: 'HBx Config Sync (Evening)',
    schedule: '0 22 * * *',
    scheduleKind: 'cron',
    cronExpr: '0 22 * * *',
    timezone: 'UTC',
    status: 'ok',
    category: 'sync',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'daily-memory-log',
    name: 'Daily Memory Log',
    schedule: '0 23 * * *',
    scheduleKind: 'cron',
    cronExpr: '0 23 * * *',
    timezone: 'America/New_York',
    status: 'ok',
    category: 'report',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'hbx-config-sync-morning',
    name: 'HBx Config Sync (Morning)',
    schedule: '0 6 * * *',
    scheduleKind: 'cron',
    cronExpr: '0 6 * * *',
    timezone: 'UTC',
    status: 'ok',
    category: 'sync',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'daily-infra-report',
    name: 'Daily Infrastructure Report',
    schedule: '0 6 * * *',
    scheduleKind: 'cron',
    cronExpr: '0 6 * * *',
    timezone: 'America/New_York',
    status: 'ok',
    category: 'report',
    source: 'openclaw',
    enabled: true,
  },
  {
    id: 'hbx-config-sync-afternoon',
    name: 'HBx Config Sync (Afternoon)',
    schedule: '0 14 * * *',
    scheduleKind: 'cron',
    cronExpr: '0 14 * * *',
    timezone: 'UTC',
    status: 'ok',
    category: 'sync',
    source: 'openclaw',
    enabled: true,
  },
]

function categorizeJob(name: string): CronJob['category'] {
  const lower = name.toLowerCase()
  if (lower.includes('pipeline') || lower.includes('pr')) return 'pipeline'
  if (lower.includes('sync') || lower.includes('config') || lower.includes('memory sync')) return 'sync'
  if (lower.includes('report') || lower.includes('memory log') || lower.includes('dashboard')) return 'report'
  return 'monitoring'
}

function formatSchedule(schedule: { kind: string; everyMs?: number; cronExpr?: string; timezone?: string }): string {
  if (schedule.kind === 'every' && schedule.everyMs) {
    const mins = schedule.everyMs / 60000
    if (mins < 60) return `every ${mins}m`
    return `every ${mins / 60}h`
  }
  if (schedule.kind === 'cron' && schedule.cronExpr) {
    return schedule.cronExpr
  }
  return 'unknown'
}

export async function GET() {
  let openclawJobs: CronJob[] = []
  let usedFallback = false

  try {
    const { stdout } = await execAsync('openclaw cron list --json', { timeout: 10000 })

    // Strip any non-JSON prefix (openclaw may print warnings before the JSON)
    const jsonStart = stdout.indexOf('{')
    if (jsonStart === -1) throw new Error('No JSON found in output')
    const jsonStr = stdout.slice(jsonStart)
    const parsed = JSON.parse(jsonStr)

    openclawJobs = (parsed.jobs || []).map((job: Record<string, unknown>) => {
      const schedule = job.schedule as Record<string, unknown>
      const state = job.state as Record<string, unknown> | undefined
      return {
        id: job.id as string,
        name: job.name as string,
        schedule: formatSchedule(schedule as { kind: string; everyMs?: number; cronExpr?: string; timezone?: string }),
        scheduleKind: schedule.kind as string,
        everyMs: schedule.everyMs as number | undefined,
        cronExpr: schedule.cronExpr as string | undefined,
        timezone: schedule.timezone as string | undefined,
        status: (state?.lastStatus as string) || 'unknown',
        lastRunAt: state?.lastRunAtMs ? new Date(state.lastRunAtMs as number).toISOString() : undefined,
        nextRunAt: state?.nextRunAtMs ? new Date(state.nextRunAtMs as number).toISOString() : undefined,
        lastDurationMs: state?.lastDurationMs as number | undefined,
        consecutiveErrors: state?.consecutiveErrors as number | undefined,
        category: categorizeJob(job.name as string),
        source: 'openclaw' as const,
        enabled: job.enabled as boolean,
      }
    })
  } catch (err) {
    console.warn('[Cron API] openclaw cron list failed, using fallback:', err)
    openclawJobs = FALLBACK_OPENCLAW_JOBS
    usedFallback = true
  }

  const allJobs = [...openclawJobs, ...SYSTEM_CRON_ENTRIES]

  return NextResponse.json({ jobs: allJobs, usedFallback, fetchedAt: new Date().toISOString() })
}
