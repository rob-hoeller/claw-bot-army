/**
 * API Client for Mission Control
 * 
 * Thin wrapper around fetch for calling Mission Control API routes
 * All functions handle errors consistently and return typed responses
 */

import { Feature } from "@/hooks/useRealtimeFeatures"

// ─── Types ───────────────────────────────────────────────────────

export interface SubmitFeatureData {
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
}

export interface ReviewVerdictData {
  verdict: "approve" | "revise" | "reject"
  feedback?: string
}

export interface AgentActivityEvent {
  id: string
  feature_id: string
  agent_id: string
  step_id: string
  event_type: "thinking" | "file_edit" | "file_create" | "command" | "result" | "decision" | "handoff" | "gate" | "revision"
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

// ─── Error Handling ──────────────────────────────────────────────

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    let errorMessage = errorText

    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error || errorJson.message || errorText
    } catch {
      // Not JSON, use text
    }

    throw new ApiError(response.status, errorMessage)
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T
  }

  const data = await response.json()
  return data as T
}

// ─── API Functions ───────────────────────────────────────────────

/**
 * Submit a new feature request
 * Creates the feature in the database with status 'planning'
 */
export async function submitFeature(data: SubmitFeatureData): Promise<Feature> {
  const response = await fetch("/api/features", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      status: "planning",
    }),
  })

  return handleResponse<Feature>(response)
}

/**
 * Start the pipeline for a feature
 * Triggers the first agent (IN1 - Architect) to begin work
 */
export async function startPipeline(featureId: string): Promise<void> {
  const response = await fetch(`/api/features/${featureId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  return handleResponse<void>(response)
}

/**
 * Submit a verdict for a feature at a human gate
 * Used for approve/revise/reject decisions during the pipeline
 */
export async function submitVerdict(
  featureId: string,
  verdict: "approve" | "revise" | "reject",
  feedback?: string
): Promise<Feature> {
  const response = await fetch(`/api/features/${featureId}/review-verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verdict,
      feedback: feedback || undefined,
    }),
  })

  return handleResponse<Feature>(response)
}

/**
 * Fetch agent activity events for a feature
 * Can optionally filter by step and limit the number of results
 */
export async function fetchAgentActivity(
  featureId: string,
  opts?: { stepId?: string; limit?: number }
): Promise<AgentActivityEvent[]> {
  const params = new URLSearchParams()
  if (opts?.stepId) params.append("stepId", opts.stepId)
  if (opts?.limit) params.append("limit", opts.limit.toString())

  const queryString = params.toString()
  const url = `/api/agent-activity/${featureId}${queryString ? `?${queryString}` : ""}`

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  return handleResponse<AgentActivityEvent[]>(response)
}

/**
 * Helper function to handle API errors in components
 * Usage: .catch(handleApiError)
 */
export function handleApiError(error: unknown): never {
  if (error instanceof ApiError) {
    console.error(`[API Error ${error.status}]:`, error.message)
    throw error
  }

  if (error instanceof Error) {
    console.error("[API Error]:", error.message)
    throw error
  }

  console.error("[API Error]:", error)
  throw new Error("An unexpected error occurred")
}
