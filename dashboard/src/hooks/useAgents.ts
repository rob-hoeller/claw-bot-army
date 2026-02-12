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

  const fetchAgents = useCallback(async () => {
    if (!supabase) {
      setError("Supabase not configured")
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
          memory_md
        `)
        .order("id")

      if (fetchError) throw fetchError

      const parsed: Agent[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        role: row.role as string,
        description: row.description as string,
        emoji: row.emoji as string,
        status: row.status as "active" | "deploying" | "standby",
        capabilities: (row.capabilities as string[]) || [],
        department_id: row.department_id as string,
        dept: (row.departments as { name: string } | null)?.name || "Unknown",
        files: parseAgentFiles(row),
      }))

      setAgents(parsed)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch agents:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch agents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
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

      // Refresh local state
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent
          return {
            ...agent,
            files: agent.files.map((f) =>
              f.name === fileName ? { ...f, content } : f
            ),
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
