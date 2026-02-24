// Phase 1 types (used by AuditTrailTab, StepPanelContent)
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

// Phase 3 types (used by PhaseChatPanel and handoff API)
export interface HandoffArtifact {
  type: string;
  label: string;
  url?: string;
  content?: string;
}

export interface HandoffDecision {
  title: string;
  rationale?: string;
  chosen?: string;
  alternatives?: string[];
}

export interface HandoffActivity {
  timestamp: string;
  action: string;
  detail?: string;
}

export interface HandoffPacket {
  id: string;
  feature_id: string;
  phase: string;
  phase_label?: string;
  phase_order?: number;
  version: number;
  previous_version_id: string | null;
  status: "in_progress" | "completed" | "rejected" | "skipped" | string;
  agent_id: string | null;
  agent_type?: "ai_agent" | "human" | null;
  agent_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms?: number | null;
  cost_tokens_in?: number | null;
  cost_tokens_out?: number | null;
  cost_usd: number | null;
  input_source_phase?: string | null;
  input_source_packet_id?: string | null;
  input_context?: Record<string, unknown>;
  output_summary?: string | null;
  output_artifacts?: Artifact[];
  output_decisions?: Decision[];
  output_metrics?: Record<string, number>;
  // Aliases used by Phase 3 components
  summary?: string | null;
  artifacts?: HandoffArtifact[];
  decisions?: HandoffDecision[];
  activity?: HandoffActivity[];
  rejection_reason?: string | null;
  diff_from_previous?: unknown;
  activity_log?: ActivityEvent[];
  created_at: string;
  updated_at?: string;
}

export interface PhaseChatMessage {
  id: string
  feature_id: string
  phase: "planning" | "review"
  author_type: "user" | "agent" | "orchestrator"
  author_id: string
  author_name: string
  author_avatar?: string | null
  content: string
  mentions: string[]
  created_at: string
  edited_at?: string | null
  handoff_packet_id?: string | null
}

export interface CreateHandoffPacketRequest {
  phase: string;
  agent_id?: string;
  agent_name?: string;
  summary?: string;
  artifacts?: HandoffArtifact[];
  decisions?: HandoffDecision[];
  activity?: HandoffActivity[];
  started_at?: string;
  completed_at?: string;
  cost_usd?: number;
  status?: string;
}
