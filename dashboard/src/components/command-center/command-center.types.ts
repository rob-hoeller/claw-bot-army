/**
 * Command Center Types
 * 
 * Type definitions for the conversational AI command center interface.
 */

export type IntentType = 'build' | 'query' | 'report' | 'analyze' | 'operate' | 'unknown'

export interface CommandMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  intent?: IntentType
  metadata?: {
    queryResult?: Record<string, unknown>
    featureId?: string
    reportData?: unknown[]
    action?: string
    extractedTitle?: string
    extractedPriority?: string
  }
}

export interface CommandCenterProps {
  onCreateFeature?: (title: string, description: string, priority: string) => void
  className?: string
}

export interface IntentClassification {
  intent: IntentType
  confidence: number
  entities: Record<string, string>
}
