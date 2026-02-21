"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface AgentFile {
  name: string
  content: string
  column: string // maps to DB column name
}

export interface Agent {
  id: string
  name: string
  role: string
  dept: string
  department_id: string
  description: string
  emoji: string
  status: "active" | "deploying" | "standby"
  capabilities: string[]
  files: AgentFile[]
  last_active?: string | null
}

// Maps file display names to DB column names
const FILE_COLUMNS: Record<string, string> = {
  SOUL: "soul_md",
  AGENTS: "agents_md",
  IDENTITY: "identity_md",
  TOOLS: "tools_md",
  HEARTBEAT: "heartbeat_md",
  USER: "user_md",
  MEMORY: "memory_md",
}

const TOTAL_CONFIG_FILES = Object.keys(FILE_COLUMNS).length // 7

/**
 * Derive agent status from config file completeness.
 * - All 7 files populated → "active"
 * - Fewer than 7 → "deploying"
 * The DB `status` column is ignored in favor of this live check.
 */
function deriveStatus(files: AgentFile[]): "active" | "deploying" | "standby" {
  return files.length === TOTAL_CONFIG_FILES ? "active" : "deploying"
}

// Reverse mapping
const COLUMN_TO_FILE: Record<string, string> = Object.fromEntries(
  Object.entries(FILE_COLUMNS).map(([k, v]) => [v, k])
)

function parseAgentFiles(agent: Record<string, unknown>): AgentFile[] {
  const files: AgentFile[] = []
  for (const [column, fileName] of Object.entries(COLUMN_TO_FILE)) {
    const content = agent[column]
    if (content && typeof content === "string") {
      files.push({
        name: fileName,
        content,
        column,
      })
    }
  }
  return files
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const fetchAgents = useCallback(async () => {
    // Defensive: ensure supabase is available
    if (!supabase) {
      console.warn("useAgents: Supabase not configured")
      setError("Supabase not configured")
      setLoading(false)
      return
    }
    
    // Extra safety check
    if (typeof supabase.from !== 'function') {
      console.error("useAgents: Invalid supabase client")
      setError("Invalid supabase client")
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("agents")
        .select(`
          id,
          name,
          role,
          description,
          emoji,
          status,
          capabilities,
          department_id,
          departments(name),
          soul_md,
          agents_md,
          identity_md,
          tools_md,
          heartbeat_md,
          user_md,
          memory_md,
          last_active
        `)
        .order("id")

      if (fetchError) throw fetchError

      const parsed: Agent[] = (data || []).map((row: Record<string, unknown>) => {
        const files = parseAgentFiles(row)
        return {
          id: row.id as string,
          name: row.name as string,
          role: row.role as string,
          description: row.description as string,
          emoji: row.emoji as string,
          status: deriveStatus(files),
          capabilities: (row.capabilities as string[]) || [],
          department_id: row.department_id as string,
          dept: (row.departments as { name: string } | null)?.name || "Unknown",
          files,
          last_active: (row.last_active as string) || null,
        }
      })

      setAgents(parsed)
      setError(null)
      setLastSynced(new Date())
    } catch (err) {
      console.error("Failed to fetch agents:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch agents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      fetchAgents()
    } catch (err) {
      console.error("useAgents useEffect error:", err)
      setLoading(false)
    }
  }, [fetchAgents])

  const updateAgentFile = useCallback(
    async (agentId: string, fileName: string, content: string) => {
      if (!supabase) {
        throw new Error("Supabase not configured")
      }

      const column = FILE_COLUMNS[fileName]
      if (!column) {
        throw new Error(`Unknown file: ${fileName}`)
      }

      const { error: updateError } = await supabase
        .from("agents")
        .update({ [column]: content, updated_at: new Date().toISOString() })
        .eq("id", agentId)

      if (updateError) throw updateError

      // Refresh local state and re-derive status
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent
          const updatedFiles = agent.files.some((f) => f.name === fileName)
            ? agent.files.map((f) =>
                f.name === fileName ? { ...f, content } : f
              )
            : [...agent.files, { name: fileName, content, column }]
          return {
            ...agent,
            files: updatedFiles,
            status: deriveStatus(updatedFiles),
          }
        })
      )
    },
    []
  )

  return {
    agents,
    loading,
    error,
    lastSynced,
    refresh: fetchAgents,
    updateAgentFile,
  }
}

// Build tree structure with HBx as root
export function buildAgentTree(agents: Agent[]): Agent | null {
  const hbx = agents.find((a) => a.id === "HBx")
  if (!hbx) return null

  return {
    ...hbx,
    // Children are all non-HBx agents
    // In future, could use parent_id for true hierarchy
  }
}

export function getChildAgents(agents: Agent[]): Agent[] {
  return agents.filter((a) => a.id !== "HBx")
}
