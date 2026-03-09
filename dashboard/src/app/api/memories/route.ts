import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readdir, readFile } from 'fs/promises'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const MEMORY_DIR = '/home/ubuntu/.openclaw/workspace/memory'
const LONG_TERM_MEMORY_PATH = '/home/ubuntu/.openclaw/workspace/MEMORY.md'

export interface MemoryEntry {
  id: string
  agent_id: string | null
  log_date: string
  timestamp: string | null
  content: string
  source: 'supabase' | 'file'
  created_at: string
}

export interface MemoryDay {
  date: string
  entries: MemoryEntry[]
}

async function readMemoryFiles(): Promise<MemoryEntry[]> {
  const entries: MemoryEntry[] = []
  try {
    const files = await readdir(MEMORY_DIR)
    const mdFiles = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))

    for (const file of mdFiles) {
      const date = file.replace('.md', '')
      try {
        const content = await readFile(path.join(MEMORY_DIR, file), 'utf-8')
        entries.push({
          id: `file-${date}`,
          agent_id: 'file-system',
          log_date: date,
          timestamp: `${date}T00:00:00.000Z`,
          content,
          source: 'file',
          created_at: `${date}T00:00:00.000Z`,
        })
      } catch {
        // skip unreadable files
      }
    }
  } catch (err) {
    console.warn('[Memories API] Could not read memory dir:', err)
  }
  return entries
}

async function readLongTermMemory(): Promise<string | null> {
  try {
    return await readFile(LONG_TERM_MEMORY_PATH, 'utf-8')
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const includeLongTerm = searchParams.get('longTerm') === 'true'
  const dateFilter = searchParams.get('date')
  const search = searchParams.get('search')?.toLowerCase()
  const agentFilter = searchParams.get('agent')

  // Long-term memory only request
  if (includeLongTerm) {
    const content = await readLongTermMemory()
    return NextResponse.json({ longTermMemory: content })
  }

  const results: { supabase: MemoryEntry[]; file: MemoryEntry[]; error?: string } = {
    supabase: [],
    file: [],
  }

  // Read from Supabase
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseServiceKey)
      let query = sb
        .from('memory_logs')
        .select('*')
        .order('log_date', { ascending: false })
        .limit(500)

      if (dateFilter) {
        query = query.eq('log_date', dateFilter)
      }
      if (agentFilter) {
        query = query.eq('agent_id', agentFilter)
      }

      const { data, error } = await query
      if (error) {
        results.error = error.message
      } else {
        results.supabase = (data || []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          agent_id: row.agent_id as string | null,
          log_date: row.log_date as string,
          timestamp: row.timestamp as string | null,
          content: row.content as string,
          source: 'supabase' as const,
          created_at: row.created_at as string,
        }))
      }
    } catch (err) {
      console.warn('[Memories API] Supabase error:', err)
      results.error = String(err)
    }
  }

  // Read from files
  const fileEntries = await readMemoryFiles()
  results.file = dateFilter ? fileEntries.filter((e) => e.log_date === dateFilter) : fileEntries

  // Merge and deduplicate by date+source — file entries are one per date
  // Supabase entries can be many per date
  const allEntries: MemoryEntry[] = [...results.supabase, ...results.file]

  // Apply search filter
  const filtered = search
    ? allEntries.filter(
        (e) =>
          e.content.toLowerCase().includes(search) ||
          (e.agent_id && e.agent_id.toLowerCase().includes(search))
      )
    : allEntries

  // Group by date
  const byDate: Record<string, MemoryEntry[]> = {}
  for (const entry of filtered) {
    if (!byDate[entry.log_date]) byDate[entry.log_date] = []
    byDate[entry.log_date].push(entry)
  }

  const days: MemoryDay[] = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({ date, entries }))

  // Collect unique dates that have any memory
  const datesWithMemory = Object.keys(byDate).sort()

  // Collect unique agents
  const agents = [...new Set(allEntries.map((e) => e.agent_id).filter(Boolean))] as string[]

  return NextResponse.json({
    days,
    datesWithMemory,
    agents,
    totalEntries: filtered.length,
    fetchedAt: new Date().toISOString(),
    supabaseError: results.error,
  })
}
