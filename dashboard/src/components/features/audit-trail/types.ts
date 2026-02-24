export interface HandoffPacket {
  id: string
  feature_id: string
  phase: string
  version: number
  status: "in_progress" | "completed" | "rejected" | "skipped"
  agent_id: string | null
  agent_type: "ai_agent" | "human" | null
  agent_name: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  cost_tokens_in: number | null
  cost_tokens_out: number | null
  cost_usd: number | null
  input_source_phase: string | null
  input_source_packet_id: string | null
  input_context: Record<string, unknown>
  output_summary: string | null
  output_artifacts: Artifact[]
  output_decisions: Decision[]
  output_metrics: Record<string, number>
  previous_version_id: string | null
  rejection_reason: string | null
  diff_from_previous: unknown
  activity_log: ActivityEvent[]
  created_at: string
  updated_at: string
}

export interface Artifact {
  type: "spec" | "design_doc" | "code_change" | "test_results" | "review_feedback" | "pr_document" | "other"
  title: string
  content?: string
  url?: string
  mime_type?: string
}

export interface Decision {
  question: string
  chosen: string
  alternatives: string[]
  rationale: string
  decided_by: string
}

export interface ActivityEvent {
  timestamp: string
  actor: { id: string; type: string; name: string }
  action: string
  detail: Record<string, unknown>
}
